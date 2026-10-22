import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Logo } from "@/components/site/Logo";

const BTN = "inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-sm border border-volt bg-volt px-6 font-display text-base font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-volt-bright disabled:opacity-60";

export const AdminLogin = ({ onSuccess }) => {
  const [step, setStep] = useState("credentials");
  const [form, setForm] = useState({ email: "", password: "", code: "" });
  const [enroll, setEnroll] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitCredentials = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/admin/auth/login", { email: form.email, password: form.password });
      setForm((f) => ({ ...f, password: "" }));
      if (data?.step === "enroll") setEnroll({ qr: data.qr, secret: data.secret });
      setStep(data?.step === "enroll" ? "enroll" : "totp");
    } catch (err) {
      setError(errorMessage(err, "Invalid credentials."));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/admin/auth/verify", { code: form.code.trim() });
      onSuccess(data.email);
    } catch (err) {
      setError(errorMessage(err, "Invalid code."));
      if (err?.response?.status === 401 && err?.response?.data?.detail !== "Invalid code.") setStep("credentials");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-md border border-line bg-ink-900 p-8" data-testid="admin-login-card">
        <div className="flex flex-col items-start gap-5"><Logo height="h-10" testId="admin-login-logo-link" /><h1 className="font-display text-2xl font-extrabold uppercase tracking-[0.08em]">Studio sign in</h1></div>
        {step === "credentials" ? (
          <form onSubmit={submitCredentials} className="mt-8 space-y-5" data-testid="admin-credentials-form">
            <div><label htmlFor="a-email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Email</label><input id="a-email" type="email" autoComplete="username" required className="field" value={form.email} onChange={set("email")} data-testid="admin-email-input" /></div>
            <div><label htmlFor="a-pass" className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Password</label><input id="a-pass" type="password" autoComplete="current-password" required className="field" value={form.password} onChange={set("password")} data-testid="admin-password-input" /></div>
            <button type="submit" disabled={busy} className={BTN} data-testid="admin-login-submit">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Continue</button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-8 space-y-5" data-testid="admin-totp-form">
            {step === "enroll" && enroll && (
              <div className="space-y-4" data-testid="admin-mfa-enroll">
                <p className="flex gap-2 text-sm text-slate-300"><ShieldCheck className="h-5 w-5 shrink-0 text-volt-bright" aria-hidden="true" />Two-factor authentication is required. Scan this code with an authenticator app, then enter the 6-digit code.</p>
                <img src={enroll.qr} alt="Authenticator setup QR code" className="mx-auto h-48 w-48 bg-white p-2" />
                <p className="break-all text-center font-mono text-xs text-slate-300">{enroll.secret}</p>
              </div>
            )}
            <div><label htmlFor="a-code" className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Authenticator code</label><input id="a-code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className="field text-center font-mono text-2xl tracking-[0.5em]" value={form.code} onChange={set("code")} data-testid="admin-totp-input" /></div>
            <button type="submit" disabled={busy} className={BTN} data-testid="admin-totp-submit">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Verify</button>
          </form>
        )}
        <p role="alert" aria-live="assertive" className="mt-4 min-h-[1.5rem] text-sm text-red-300" data-testid="admin-login-error">{error}</p>
      </div>
    </main>
  );
};
