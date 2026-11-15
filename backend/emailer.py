import ipaddress
import logging
import os
import re
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"

_SHORTENERS = (
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "is.gd",
    "cutt.ly",
    "goo.gl",
    "rebrand.ly",
)

_CRED_ASK = (
    "reply with your password",
    "reply with the code",
    "send your password",
    "cvv",
    "send us your password",
    "enter your password below",
    "confirm your card number",
    "your full card number",
    "seed phrase",
    "recovery phrase",
    "verify your card",
    "social security number",
    "confirm your bank details",
)

_HOSTISH = re.compile(
    r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})",
    re.I,
)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False

    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass

    return not any(
        host == s or host.endswith("." + s)
        for s in _SHORTENERS
    )


def _same_site(shown: str, real: str) -> bool:
    return (
        shown == real
        or real.endswith("." + shown)
        or shown.endswith("." + real)
    )


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = set()
        self.urls = []
        self.anchors = []
        self._href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())

        self.urls += [
            value
            for key, value in attrs
            if key.lower() in ("href", "src") and value
        ]

        if tag.lower() == "a":
            self._href = dict(
                (key.lower(), value) for key, value in attrs
            ).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append(
                (self._href, "".join(self._text))
            )
            self._href = None
            self._text = []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    scan.close()

    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")

    body = f"{subject}\n{html}".lower()

    for phrase in _CRED_ASK:
        if phrase in body:
            raise ValueError(
                f"Email asks the recipient for credentials: {phrase!r} (G2)"
            )

    for url in scan.urls:
        low = url.strip().lower()

        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue

        if not low.startswith("https://"):
            raise ValueError(
                "Email links/assets must be absolute https (G3)"
            )

        parsed = urlparse(low)
        host = parsed.hostname or ""

        if not _host_ok(host) or parsed.username is not None:
            raise ValueError(
                "Shortened, numeric-host or credential-bearing URL (G3)"
            )

    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""

        if not real:
            continue

        for match in _HOSTISH.finditer(text):
            if not _same_site(match.group(1).lower(), real):
                raise ValueError("Anchor text host mismatch (G3)")


async def send_email(*, to: str, subject: str, html: str) -> bool:
    """
    Sends an email using Resend.
    Returns True if Resend accepts the message.
    Never logs recipient, email content or API credentials.
    """

    try:
        _assert_safe_email(subject, html)

        api_key = os.environ.get("RESEND_API_KEY", "").strip()
        from_address = os.environ.get(
            "EMAIL_FROM_ADDRESS", ""
        ).strip()
        from_name = os.environ.get(
            "EMAIL_FROM_NAME", "Website"
        ).strip()

        if not api_key:
            logger.error("Email not configured: RESEND_API_KEY is missing")
            return False

        if not from_address:
            logger.error("Email not configured: EMAIL_FROM_ADDRESS is missing")
            return False

        if not to or "\n" in to or "\r" in to:
            raise ValueError("Invalid recipient address")

        if not subject or "\n" in subject or "\r" in subject:
            raise ValueError("Invalid email subject")

        payload = {
            "from": f"{from_name} <{from_address}>",
            "to": [to],
            "subject": subject,
            "html": html,
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                RESEND_API_URL,
                headers=headers,
                json=payload,
            )

        if response.status_code not in (200, 201):
            try:
                error_data = response.json()
                error_code = error_data.get("name", "unknown_error")
            except ValueError:
                error_code = "unknown_error"

            logger.warning(
                "Resend email failed: status=%s code=%s",
                response.status_code,
                error_code,
            )
            return False

        return True

    except Exception as error:
        logger.warning(
            "Email not delivered: %s",
            type(error).__name__,
        )
        return False
