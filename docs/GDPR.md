# GDPR internal documentation

Template prepared in good faith; have it reviewed by a legal professional. Controller: **Alex Cearnau, Oradea, Romania** (postal address: TODO_CONFIRM), contact alexmcearnau@gmail.com.

## 1. Record of processing activities (Art. 30)
| Activity | Data categories | Purpose | Legal basis | Retention | Processors / recipients |
|---|---|---|---|---|---|
| Contact form | name, email, inquiry type, message, consent timestamp, privacy policy version | answer inquiries, pre-contractual steps | consent (6(1)(a)); steps at the person's request (6(1)(b)) | `MESSAGE_RETENTION_DAYS` (default 365 days), automatic TTL deletion; earlier on request | hosting/application platform Emergent (TODO_CONFIRM), CDN Cloudflare (TODO_CONFIRM), email delivery provider (TODO_CONFIRM), database provider (TODO_CONFIRM) |
| Abuse prevention (rate limits) | salted one-way hash of IP | spam and brute-force protection | legitimate interest (6(1)(f)) | 2 hours (TTL) | as above |
| Admin security log | event type, time, salted hash of IP | account security, incident investigation | legitimate interest (6(1)(f)) | 90 days (TTL) | as above |
| Admin sessions | session id hash, timestamps, hashed IP | sign-in for the site owner only | legitimate interest (6(1)(f)) | 12 hours max (TTL) | as above |
| Consent record | category choices, timestamp, policy version | proof and respect of cookie choices | legal obligation / legitimate interest | stored in the visitor's browser, 6 months | none (local storage) |

No sale of data, no profiling, no automated decision-making, no analytics or marketing tools. International transfers: possible to US-based providers; safeguards: EU-U.S. Data Privacy Framework or Standard Contractual Clauses (TODO_CONFIRM per provider). Keep the providers' data processing agreements (DPAs) on file.

## 2. Data breach response (Art. 33-34)
1. **Contain** (within hours): revoke all admin sessions (`python scripts/reset_admin_password.py`), rotate `JWT_SECRET`, `TOTP_ENCRYPTION_KEY` and platform keys, restrict access.
2. **Assess**: what data, how many people, likely consequences. Document everything (time line, facts, effects, actions) even if you decide no notification is needed.
3. **Notify ANSPDCP within 72 hours** of becoming aware, unless the breach is unlikely to result in a risk to people: online form / email at www.dataprotection.ro (anspdcp@dataprotection.ro). If information is incomplete, notify in phases.
4. **Inform affected people without undue delay** if the risk is high: plain-language email explaining what happened, likely consequences, measures taken and what they can do, plus your contact.
5. **Review**: fix the cause, update this document.

## 3. Data subject requests checklist
1. Log the request date (deadline: **one month**, extendable by two months for complex requests, with notice).
2. Verify identity proportionately (reply from the same email address used in the form is usually enough).
3. Studio > Messages > *Privacy requests*:
   - **Access / portability**: enter the email, *Export (JSON)*, send the file.
   - **Erasure**: *Delete all from sender* (permanent, confirmed by a dialog); also delete the emails in your mailbox.
   - **Rectification**: correct by email reply, or erase and ask the person to resend.
   - **Objection / restriction / consent withdrawal**: stop processing, erase if no other basis applies.
4. Reply in writing, free of charge, and keep a short note of what was done (no copy of the erased data).

## 4. Retention configuration
- `MESSAGE_RETENTION_DAYS` (backend env, default 365): MongoDB TTL index on `messages.created_at`, updated automatically at startup when the value changes.
- Security events 90 days, rate-limit hashes 2 hours, sessions 12 hours, pre-auth/TOTP helper records minutes.
