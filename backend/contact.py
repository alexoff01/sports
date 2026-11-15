import os
import uuid
from html import escape
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)

from auth import require_admin
from core import clean_text, client_ip, db, now, rate_limit
from emailer import EMAIL_FROM_NAME, send_email

PRIVACY_POLICY_VERSION = "2.0"

RECIPIENT = os.environ.get(
    "CONTACT_RECIPIENT", ""
).strip()

router = APIRouter(prefix="/api")

InquiryType = Literal[
    "Job Opportunity",
    "Internship",
    "Collaboration",
    "Content Project",
    "Other",
]


class ContactIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    inquiry_type: InquiryType
    message: str = Field(min_length=20, max_length=4000)
    consent: bool
    website: str = Field(default="", max_length=200)

    @field_validator("name", "message")
    @classmethod
    def _clean(cls, value: str) -> str:
        value = clean_text(value)

        if len(value) < 2:
            raise ValueError("Too short")

        return value


def _template(data: dict) -> str:
    rows = "".join(
        f'<tr><td style="padding:6px 0;color:#64748b;width:130px">'
        f'{escape(key)}</td>'
        f'<td style="padding:6px 0;color:#0f172a">'
        f'{escape(str(value))}</td></tr>'
        for key, value in (
            ("Name", data["name"]),
            ("Email", data["email"]),
            ("Inquiry type", data["inquiry_type"]),
        )
    )

    message = escape(data["message"]).replace("\n", "<br>")

    return (
        '<table role="presentation" width="100%">'
        '<tr><td style="padding:24px;font-family:Arial,sans-serif">'
        '<p style="font-size:18px;font-weight:bold;margin:0 0 16px">'
        'New inquiry from your portfolio</p>'
        f'<table role="presentation">{rows}</table>'
        '<p style="margin:16px 0 4px;color:#64748b">Message</p>'
        f'<p style="color:#0f172a">{message}</p>'
        '<p style="font-size:12px;color:#888;margin-top:24px">'
        f'Sent by the {escape(EMAIL_FROM_NAME)} '
        'contact form. To answer, write to the email address shown above.'
        '</p></td></tr></table>'
    )


@router.post("/contact")
async def contact(body: ContactIn, request: Request):
    await rate_limit(
        "contact",
        client_ip(request),
        5,
        3600,
    )

    if body.website:
        return {"ok": True}

    if not body.consent:
        raise HTTPException(
            status_code=422,
            detail="Please accept the privacy policy.",
        )

    if not RECIPIENT:
        raise HTTPException(
            status_code=503,
            detail="Contact service is temporarily unavailable.",
        )

    timestamp = now()

    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": str(body.email).lower(),
        "inquiry_type": body.inquiry_type,
        "message": body.message,
        "consent": True,
        "consent_at": timestamp,
        "privacy_policy_version": PRIVACY_POLICY_VERSION,
        "created_at": timestamp,
    }

    doc["delivered"] = await send_email(
        to=RECIPIENT,
        subject=f"Portfolio inquiry: {body.inquiry_type}",
        html=_template(doc),
    )

    await db.messages.insert_one(doc)

    return {"ok": True}


@router.get("/admin/messages")
async def list_messages(
    _: str = Depends(require_admin)
):
    items = await db.messages.find(
        {},
        {"_id": 0}
    ).sort(
        "created_at",
        -1
    ).to_list(500)

    for message in items:
        _iso(message)

    return items


def _iso(message: dict) -> dict:
    for key in ("created_at", "consent_at"):
        if hasattr(message.get(key), "isoformat"):
            message[key] = message[key].isoformat()

    return message


class SenderIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


@router.post("/admin/messages/export")
async def export_sender(
    body: SenderIn,
    _: str = Depends(require_admin)
):
    """Exports all stored messages from one sender."""

    email = str(body.email).strip().lower()

    items = await db.messages.find(
        {"email": email},
        {"_id": 0, "delivered": 0}
    ).sort(
        "created_at",
        1
    ).to_list(1000)

    return {
        "email": email,
        "exported_at": now().isoformat(),
        "count": len(items),
        "messages": [_iso(message) for message in items],
    }


@router.post("/admin/messages/erase")
async def erase_sender(
    body: SenderIn,
    _: str = Depends(require_admin)
):
    """Permanently deletes messages from one sender."""

    result = await db.messages.delete_many(
        {"email": str(body.email).strip().lower()}
    )

    return {
        "ok": True,
        "deleted": result.deleted_count,
    }


@router.delete("/admin/messages/{message_id}")
async def delete_message(
    message_id: str,
    _: str = Depends(require_admin)
):
    result = await db.messages.delete_one(
        {"id": message_id}
    )

    if not result.deleted_count:
        raise HTTPException(
            status_code=404,
            detail="Not found.",
        )

    return {"ok": True}
