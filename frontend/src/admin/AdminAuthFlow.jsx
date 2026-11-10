import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Logo } from "@/components/site/Logo";
import { BTN, LABEL } from "@/admin/ui";

const fmtWait = (s) => (s >= 60 ? `${Math.ceil(s / 60)} min` : `${s} s`);

const readError = (err, fallback) => {
  if (!err?.response) {
    return { message: err?.code === "ECONNABORTED" ? "The server took too long to answer. Please try again." : "The server is unreachable. Check your connection and try again." };
  }
  const { status, data, headers } = err.response;
  const detail = typeof data?.detail === "string" ? data.detail : "";
  if (status === 429) {
    const wait = Number(headers?.["retry-after"]) || 0;
    if (/too many attempts/i.test(detail)) return { message: detail, lockedFor: wait };
    return { message: `Too many requests from this network. Please wait ${fmtWait(wait || 60)} and try again.`, lockedFor: wait };
  }
  if (status === 403) {
    if (data?.code === "origin_rejected") return { message: "Sign-in is not allowed from this web address. Open the site from its official address and try again." };
    return { message: "Security check failed. Please reload the page and try again." };
  }
  if (status === 401 || status === 400) return { message: detail || fallback, expired: /expired/i.test(detail) };
  if (status === 422) return { message: "Please enter a valid email address and password." };
  if (status >= 500) return { message: "The server had a problem. Please try again in a moment." };
  return { message: fallback };
};

const CodeInput = ({ recovery, value, onChange }) => (
  <div>
    <label htmlFor="a-code" className={LABEL}>{recovery ? "Recovery code" : "6-digit code from your authenticator"}</label>
    <input
      id="a-code"
      name="one-time-code"
      autoFocus
      inputMode={recovery ? "text" : "numeric"}
      pattern={recovery ? undefined : "[0-9]{6}"}
      autoComplete="one-time-code"
      required
      maxLength={recovery ? 19 : 6}
      className="field text-center font-mono text-2xl tracking-[0.4em]"
      value={value}
      onChange={(e) => onChange(recovery ? e.target.value.trim() : e.target.value.replace(/\D/g, ""))}
      data-testid="admin-totp-input"
    />
  </div>
);

// Email + password, then mandatory two-factor (first sign-in: setup; afterwards: verify).
export const AdminAuthFlow = ({ onAuthed, notice }) => {
  const [step, setStep] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState(0);
  const [, force] = useState(0);
  const heading = useRef(null);

  const lockLeft = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
  useEffect(() => {
    if (!lockLeft) return undefined;
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [lockLeft]);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const restart = (message) => {
    setStep("login");
    setPassword("");
    setCode("");
    setSetup(null);
    setSaved(false);
    setError(message);
  };

  const run = async (fn, fallback) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      const e = readError(err, fallback);
      if (e.lockedFor) setLockedUntil(Date.now() + e.lockedFor * 1000);
      if (e.expired && step !== "login") restart(e.message);
      else setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (step !== "totp_setup" || setup) return;
    run(async () => setSetup((await api.post("/admin-auth/totp/setup")).data), "Two-factor setup could not start. Please sign in again.");
  }, [step, setup]);

  const submitLogin = (e) => {
    e.preventDefault();
    run(async () => {
      const { data } = await api.post("/admin-auth/login", { email: email.trim(), password });
      setPassword("");
      if (data.next === "done") onAuthed();
      else setStep(data.next);
    }, "Invalid credentials.");
  };

  const submitCode = (e) => {
    e.preventDefault();
    const path = step === "totp_setup" ? "/admin-auth/totp/confirm" : "/admin-auth/totp/verify";
    run(async () => {
      await api.post(path, { code: code.trim() });
      setSetup(null);
      onAuthed();
    }, "Invalid code.");
  };

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  };

  const downloadCodes = () => {
    const blob = new Blob([`Studio recovery codes (each works once)\n\n${setup.recovery_codes.join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studio-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const locked = lockLeft > 0;
  const titles = { login: "Studio sign in", totp_setup: "Set up two-factor", totp_verify: "Two-factor check" };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 sm:px-5 sm:py-16">
      <div className={`w-full ${step === "totp_setup" ? "max-w-xl" : "max-w-md"} border border-line bg-ink-900 p-6 sm:p-8`} data-testid="admin-login-card">
        <div className="flex flex-col items-start gap-5">
          <Logo height="h-10" testId="admin-login-logo-link" />
          <h1 ref={heading} tabIndex={-1} className="font-display text-2xl font-extrabold uppercase tracking-[0.08em] focus:outline-none" data-testid="admin-auth-title">{titles[step]}</h1>
        </div>
        {notice && step === "login" && !error && <p className="mt-4 border-l-2 border-volt pl-3 text-sm text-slate-300" data-testid="admin-auth-notice">{notice}</p>}

        {step === "login" && (
          <form onSubmit={submitLogin} className="mt-8 space-y-5" data-testid="admin-login-form" noValidate={false}>
            <div>
              <label htmlFor="a-email" className={LABEL}>Email</label>
              <input id="a-email" name="username" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} className="field" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="admin-email-input" />
            </div>
            <div>
              <label htmlFor="a-password" className={LABEL}>Password</label>
              <div className="relative">
                <input id="a-password" name="password" type={showPw ? "text" : "password"} autoComplete="current-password" required maxLength={256} className="field pr-14" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="admin-password-input" />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-300 hover:text-white" data-testid="admin-password-toggle">
                  {showPw ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={busy || locked || !email || !password} className={BTN} data-testid="admin-login-submit">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {locked ? `Locked · ${fmtWait(lockLeft)}` : "Sign in"}
            </button>
          </form>
        )}

        {step === "totp_setup" && (
          <form onSubmit={submitCode} className="mt-8 space-y-6" data-testid="admin-totp-form">
            {!setup ? (
              <div className="grid h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-volt" aria-label="Preparing setup" /></div>
            ) : (
              <div className="space-y-6" data-testid="admin-totp-setup">
                <p className="flex gap-2 text-sm text-slate-300"><ShieldCheck className="h-5 w-5 shrink-0 text-volt-bright" aria-hidden="true" />Two-factor authentication is required. Scan the code with an authenticator app (for example Google Authenticator, 1Password or Authy).</p>
                <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
                  <img src={setup.qr} alt="Authenticator setup QR code" className="mx-auto h-44 w-44 bg-white p-2" data-testid="admin-totp-qr" />
                  <div>
                    <p className={LABEL}>Or enter this key manually</p>
                    <p className="break-all font-mono text-sm text-paper" data-testid="admin-totp-secret">{setup.secret.match(/.{1,4}/g).join(" ")}</p>
                    <button type="button" onClick={() => copy(setup.secret, "key")} className="mt-2 inline-flex min-h-[44px] items-center gap-2 text-sm text-volt-bright" data-testid="admin-totp-copy-key">
                      {copied === "key" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}{copied === "key" ? "Copied" : "Copy key"}
                    </button>
                  </div>
                </div>
                <div className="border border-line-strong bg-ink-950/60 p-4">
                  <p className={`${LABEL} flex items-center gap-2`}><KeyRound className="h-4 w-4 text-volt-bright" aria-hidden="true" />Recovery codes · shown only once</p>
                  <p className="mb-3 text-xs text-slate-400">Each code works once if you lose your phone. Store them somewhere safe and offline.</p>
                  <ul className="grid grid-cols-1 gap-2 font-mono text-sm sm:grid-cols-2" data-testid="admin-recovery-codes">{setup.recovery_codes.map((c) => <li key={c} className="border border-line px-3 py-2">{c}</li>)}</ul>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <button type="button" onClick={() => copy(setup.recovery_codes.join("\n"), "codes")} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-volt-bright" data-testid="admin-codes-copy">
                      {copied === "codes" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}{copied === "codes" ? "Copied" : "Copy codes"}
                    </button>
                    <button type="button" onClick={downloadCodes} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-volt-bright" data-testid="admin-codes-download"><Download className="h-4 w-4" aria-hidden="true" />Download .txt</button>
                  </div>
                </div>
                <label className="flex min-h-[44px] items-center gap-3 text-sm"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-5 w-5 accent-[#2F6BFF]" data-testid="admin-codes-saved" />I saved these recovery codes</label>
                <CodeInput recovery={false} value={code} onChange={setCode} />
                <button type="submit" disabled={busy || locked || !saved || code.length !== 6} className={BTN} data-testid="admin-totp-submit">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{locked ? `Locked · ${fmtWait(lockLeft)}` : "Activate and sign in"}</button>
              </div>
            )}
          </form>
        )}

        {step === "totp_verify" && (
          <form onSubmit={submitCode} className="mt-8 space-y-5" data-testid="admin-totp-form">
            <CodeInput recovery={useRecovery} value={code} onChange={setCode} />
            <button type="submit" disabled={busy || locked || (!useRecovery && code.length !== 6) || (useRecovery && code.length < 8)} className={BTN} data-testid="admin-totp-submit">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{locked ? `Locked · ${fmtWait(lockLeft)}` : "Verify"}</button>
            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" onClick={() => { setUseRecovery((v) => !v); setCode(""); }} className="min-h-[44px] text-sm text-volt-bright" data-testid="admin-recovery-toggle">
                {useRecovery ? "Use authenticator code" : "Use a recovery code"}
              </button>
              <button type="button" onClick={() => restart("")} className="min-h-[44px] text-sm text-slate-400 hover:text-white" data-testid="admin-back-to-login">Back to sign in</button>
            </div>
          </form>
        )}
        <p role="alert" aria-live="assertive" className="mt-4 min-h-[1.5rem] text-sm text-red-300" data-testid="admin-login-error">
          {error}
          {locked && error && <span className="block text-slate-400" data-testid="admin-lockout-remaining">Time remaining: {fmtWait(lockLeft)}</span>}
        </p>
      </div>
    </main>
  );
};
