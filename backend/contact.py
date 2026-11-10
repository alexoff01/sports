import os
import uuid
from html import escape
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from auth import require_admin
from core import clean_text, client_ip, db, now, rate_limit
from emailer import EMAIL_FROM_NAME, send_email

PRIVACY_POLICY_VERSION = "2.0"
RECIPIENT = os.environ["CONTACT_RECIPIENT"]
router = APIRouter(prefix="/api")

InquiryType = Literal["Job Opportunity", "Internship", "Collaboration", "Content Project", "Other"]


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
    def _clean(cls, v: str) -> str:
        v = clean_text(v)
        if len(v) < 2:
            raise ValueError("Too short")
        return v


def _template(d: dict) -> str:
    rows = "".join(
        f'<tr><td style="padding:6px 0;color:#64748b;width:130px">{escape(k)}</td>'
        f'<td style="padding:6px 0;color:#0f172a">{escape(v)}</td></tr>'
        for k, v in (("Name", d["name"]), ("Email", d["email"]), ("Inquiry type", d["inquiry_type"]))
    )
    message = escape(d["message"]).replace("\n", "<br>")
    return (
        '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif">'
        '<p style="font-size:18px;font-weight:bold;margin:0 0 16px">New inquiry from your portfolio</p>'
        f'<table role="presentation">{rows}</table>'
        f'<p style="margin:16px 0 4px;color:#64748b">Message</p><p style="color:#0f172a">{message}</p>'
        f'<p style="font-size:12px;color:#888;margin-top:24px">Sent by the {escape(EMAIL_FROM_NAME)} '
        "contact form. To answer, write to the email address shown above.</p></td></tr></table>"
    )


@router.post("/contact")
async def contact(body: ContactIn, request: Request):
    await rate_limit("contact", client_ip(request), 5, 3600)
    if body.website:
        return {"ok": True}
    if not body.consent:
        raise HTTPException(status_code=422, detail="Please accept the privacy policy.")
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": body.email.lower(),
        "inquiry_type": body.inquiry_type,
        "message": body.message,
        "consent": True,
        "consent_at": now(),
        "privacy_policy_version": PRIVACY_POLICY_VERSION,
        "created_at": now(),
    }
    doc["delivered"] = await send_email(
        to=RECIPIENT, subject=f"Portfolio inquiry: {body.inquiry_type}", html=_template(doc)
    )
    await db.messages.insert_one(doc)
    return {"ok": True}


@router.get("/admin/messages")
async def list_messages(_: str = Depends(require_admin)):
    items = await db.messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for m in items:
        _iso(m)
    return items


def _iso(m: dict) -> dict:
    for k in ("created_at", "consent_at"):
        if hasattr(m.get(k), "isoformat"):
            m[k] = m[k].isoformat()
    return m


class SenderIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=3, max_length=254)


@router.post("/admin/messages/export")
async def export_sender(body: SenderIn, _: str = Depends(require_admin)):
    """Data subject access request: every stored message from one sender, as JSON."""
    email = body.email.strip().lower()
    items = await db.messages.find({"email": email}, {"_id": 0, "delivered": 0}).sort("created_at", 1).to_list(1000)
    return {"email": email, "exported_at": now().isoformat(), "count": len(items), "messages": [_iso(m) for m in items]}


@router.post("/admin/messages/erase")
async def erase_sender(body: SenderIn, _: str = Depends(require_admin)):
    """Erasure request: permanently deletes every message from one sender (confirmed in the UI)."""
    res = await db.messages.delete_many({"email": body.email.strip().lower()})
    return {"ok": True, "deleted": res.deleted_count}


@router.delete("/admin/messages/{message_id}")
async def delete_message(message_id: str, _: str = Depends(require_admin)):
    res = await db.messages.delete_one({"id": message_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Not found.")
    return {"ok": True}
