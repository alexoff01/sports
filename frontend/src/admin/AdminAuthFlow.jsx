import { useEffect, useRef, useState } from "react";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Logo } from "@/components/site/Logo";

const BTN = "inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-sm border border-volt bg-volt px-6 font-display text-base font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-volt-bright disabled:opacity-60";
const LABEL = "mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-300";

const friendly = (err, fallback) => {
  const status = err?.response?.status;
  if (!err?.response) return "You seem to be offline or the server is unreachable. Please try again.";
  if (status === 429) return "Too many attempts. Please wait a while before trying again.";
  if (status === 400) return "This sign-in link has expired or was already used. Please request a new one.";
  const detail = err.response.data?.detail;
  return [401].includes(status) && typeof detail === "string" ? detail : fallback;
};

const readFragmentToken = () => {
  const match = window.location.hash.match(/token=([A-Za-z0-9_-]+)/);
  if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  return match ? match[1] : null;
};

// Passwordless admin sign-in: email link, confirm, then TOTP setup or verification.
export const AdminAuthFlow = ({ verifyMode, onAuthed }) => {
  const token = useRef(verifyMode ? readFragmentToken() : null);
  const [step, setStep] = useState(verifyMode ? (token.current ? "confirm" : "email") : "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState(null);
  const [saved, setSaved] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(verifyMode && !token.current ? "This sign-in link is incomplete. Please request a new one." : "");

  const run = async (fn, fallback) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(friendly(err, fallback));
      if (err?.response?.status === 401 && /expired/i.test(err.response.data?.detail ?? "")) setStep("email");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (step !== "totp_setup" || setup) return undefined;
    run(async () => setSetup((await api.post("/admin-auth/totp/setup")).data), "Setup could not start. Please request a new link.");
    return undefined;
  }, [step, setup]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendLink = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post("/admin-auth/request-link", { email });
      setStep("sent");
    }, "The request could not be sent. Please try again.");
  };
  const confirmLink = () =>
    run(async () => {
      const { data } = await api.post("/admin-auth/verify-link", { token: token.current });
      token.current = null;
      if (data.next === "done") onAuthed();
      else setStep(data.next);
    }, "Sign-in failed. Please request a new link.");
  const submitCode = (e) => {
    e.preventDefault();
    const path = step === "totp_setup" ? "/admin-auth/totp/confirm" : "/admin-auth/totp/verify";
    run(async () => {
      await api.post(path, { code: code.trim() });
      onAuthed();
    }, "That code did not work.");
  };

  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-md border border-line bg-ink-900 p-8" data-testid="admin-login-card">
        <div className="flex flex-col items-start gap-5">
          <Logo height="h-10" testId="admin-login-logo-link" />
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-[0.08em]">Studio sign in</h1>
        </div>

        {step === "email" && (
          <form onSubmit={sendLink} className="mt-8 space-y-5" data-testid="admin-email-form">
            <div>
              <label htmlFor="a-email" className={LABEL}>Email</label>
              <input id="a-email" type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="admin-email-input" />
            </div>
            <button type="submit" disabled={busy} className={BTN} data-testid="admin-send-link-btn">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Send sign-in link</button>
          </form>
        )}

        {step === "sent" && (
          <div className="mt-8 space-y-4" data-testid="admin-link-sent">
            <MailCheck className="h-8 w-8 text-volt-bright" aria-hidden="true" />
            <p className="text-slate-200">If this email is authorized, a sign-in link has been sent. It is valid for 10 minutes and works once.</p>
            <button type="button" onClick={() => setStep("email")} className="min-h-[44px] text-sm text-volt-bright">Use a different email</button>
          </div>
        )}

        {step === "confirm" && (
          <div className="mt-8 space-y-5" data-testid="admin-confirm-step">
            <p className="text-slate-200">Confirm that you want to sign in on this device.</p>
            <button type="button" onClick={confirmLink} disabled={busy} className={BTN} data-testid="admin-confirm-btn">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Confirm sign-in</button>
          </div>
        )}

        {(step === "totp_setup" || step === "totp_verify") && (
          <form onSubmit={submitCode} className="mt-8 space-y-5" data-testid="admin-totp-form">
            {step === "totp_setup" && setup && (
              <div className="space-y-4" data-testid="admin-totp-setup">
                <p className="flex gap-2 text-sm text-slate-300"><ShieldCheck className="h-5 w-5 shrink-0 text-volt-bright" aria-hidden="true" />Scan this code with an authenticator app, then enter the 6-digit code.</p>
                <img src={setup.qr} alt="Authenticator setup QR code" className="mx-auto h-48 w-48 bg-white p-2" />
                <p className="break-all text-center font-mono text-xs text-slate-300" data-testid="admin-totp-secret">{setup.secret}</p>
                <div className="border border-line p-4">
                  <p className={LABEL}>Recovery codes (shown once)</p>
                  <ul className="grid grid-cols-2 gap-2 font-mono text-sm" data-testid="admin-recovery-codes">{setup.recovery_codes.map((c) => <li key={c}>{c}</li>)}</ul>
                </div>
                <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="accent-[#2F6BFF]" data-testid="admin-codes-saved" />I saved these recovery codes</label>
              </div>
            )}
            <div>
              <label htmlFor="a-code" className={LABEL}>{useRecovery ? "Recovery code" : "Authenticator code"}</label>
              <input id="a-code" autoFocus inputMode={useRecovery ? "text" : "numeric"} autoComplete="one-time-code" required maxLength={useRecovery ? 9 : 6} className="field text-center font-mono text-2xl tracking-[0.4em]" value={code} onChange={(e) => setCode(e.target.value)} data-testid="admin-totp-input" />
            </div>
            <button type="submit" disabled={busy || (step === "totp_setup" && (!setup || !saved))} className={BTN} data-testid="admin-totp-submit">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Verify</button>
            {step === "totp_verify" && (
              <button type="button" onClick={() => { setUseRecovery((v) => !v); setCode(""); }} className="min-h-[44px] text-sm text-volt-bright" data-testid="admin-recovery-toggle">
                {useRecovery ? "Use authenticator code" : "Use a recovery code"}
              </button>
            )}
          </form>
        )}
        <p role="alert" aria-live="assertive" className="mt-4 min-h-[1.5rem] text-sm text-red-300" data-testid="admin-login-error">{error}</p>
      </div>
    </main>
  );
};
