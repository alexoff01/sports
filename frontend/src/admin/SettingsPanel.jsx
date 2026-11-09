import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, LogOut, ShieldCheck, ShieldAlert, Timer } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { BTN, BTN_GHOST, CARD, LABEL } from "@/admin/ui";

const MIN = 12;

const PasswordField = ({ id, label, value, onChange, show, autoComplete, hint }) => (
  <div>
    <label htmlFor={id} className={LABEL}>{label}</label>
    <input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} required maxLength={256} className="field" value={value} onChange={(e) => onChange(e.target.value)} data-testid={`settings-${id}`} aria-describedby={hint ? `${id}-hint` : undefined} />
    {hint && <p id={`${id}-hint`} className="mt-2 text-xs text-slate-400">{hint}</p>}
  </div>
);

export const SettingsPanel = ({ account, reload, onLogout }) => {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const email = account?.email ?? "";
  const problems = [];
  if (form.next && form.next.length < MIN) problems.push(`At least ${MIN} characters (${form.next.length}/${MIN}).`);
  if (form.next && email && form.next.trim().toLowerCase() === email.toLowerCase()) problems.push("Must not be your email address.");
  if (form.confirm && form.confirm !== form.next) problems.push("The two new passwords do not match.");
  const canSubmit = form.current && form.next && form.confirm && problems.length === 0 && !busy;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/admin-auth/change-password", { current_password: form.current, new_password: form.next, confirm_password: form.confirm });
      setForm({ current: "", next: "", confirm: "" });
      toast.success(`Password changed.${data.other_sessions_revoked ? ` ${data.other_sessions_revoked} other session(s) signed out.` : ""}`);
      reload();
    } catch (err) {
      setError(errorMessage(err, "The password could not be changed."));
    } finally {
      setBusy(false);
    }
  };

  const remaining = account?.recovery_codes_remaining ?? 0;

  return (
    <section aria-labelledby="settings-title" data-testid="settings-panel">
      <h1 id="settings-title" className="t-h2">Settings</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <form onSubmit={submit} className={`${CARD} space-y-5 lg:col-span-7`} data-testid="settings-password-form">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-[0.08em]"><KeyRound className="h-5 w-5 text-volt-bright" aria-hidden="true" />Change password</h2>
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <PasswordField id="current-password" label="Current password" value={form.current} onChange={set("current")} show={show} autoComplete="current-password" />
          <PasswordField id="new-password" label="New password" value={form.next} onChange={set("next")} show={show} autoComplete="new-password" hint={`At least ${MIN} characters and not your email. A passphrase of several words works well.`} />
          <PasswordField id="confirm-password" label="Confirm new password" value={form.confirm} onChange={set("confirm")} show={show} autoComplete="new-password" />
          <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-volt-bright" data-testid="settings-toggle-show">
            {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}{show ? "Hide passwords" : "Show passwords"}
          </button>
          {problems.length > 0 && <ul className="space-y-1 text-sm text-amber-200" data-testid="settings-password-problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          <p role="alert" className="min-h-[1.25rem] text-sm text-red-300" data-testid="settings-password-error">{error}</p>
          <button type="submit" disabled={!canSubmit} className={`${BTN} sm:w-auto`} data-testid="settings-password-submit">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Update password</button>
          <p className="text-xs text-slate-400">Changing the password signs out every other device.</p>
        </form>

        <div className="space-y-6 lg:col-span-5">
          <div className={CARD} data-testid="settings-totp-card">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-[0.08em]">
              {account?.totp_enabled ? <ShieldCheck className="h-5 w-5 text-emerald-400" aria-hidden="true" /> : <ShieldAlert className="h-5 w-5 text-amber-300" aria-hidden="true" />}Two-factor
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-400">Status</dt><dd className="font-semibold" data-testid="settings-totp-status">{account ? (account.totp_enabled ? "Active" : "Not set up") : "…"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-400">Required at sign-in</dt><dd className="font-semibold">{account?.totp_required ? "Yes" : "No"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-400">Recovery codes left</dt><dd className={`font-semibold ${remaining < 3 ? "text-amber-300" : ""}`} data-testid="settings-recovery-count">{account ? `${remaining} of 8` : "…"}</dd></div>
            </dl>
            {account && remaining < 3 && <p className="mt-4 text-xs text-amber-200">Few recovery codes left. If you run out, reset two-factor from the server with the reset script.</p>}
          </div>
          <div className={CARD}>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-[0.08em]"><Timer className="h-5 w-5 text-volt-bright" aria-hidden="true" />Session</h2>
            <p className="mt-4 text-sm text-slate-300">Signed in as <span className="font-semibold text-paper" data-testid="settings-email">{email || "…"}</span>. Sessions end after {Math.round((account?.idle_timeout_seconds ?? 1800) / 60)} minutes of inactivity and after 12 hours at most.</p>
            <button type="button" onClick={onLogout} className={`${BTN_GHOST} mt-5`} data-testid="settings-logout-btn"><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</button>
          </div>
        </div>
      </div>
    </section>
  );
};
