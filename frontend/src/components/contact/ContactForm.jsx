import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, CheckCircle2, Loader2 } from "lucide-react";
import { api, errorMessage, hasBackend } from "@/lib/api";

const TYPES = ["Job Opportunity", "Internship", "Collaboration", "Content Project", "Other"];

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100, "Please keep your name under 100 characters."),
  email: z.string().trim().email("Please enter a valid email address.").max(254),
  inquiry_type: z.enum(TYPES, { errorMap: () => ({ message: "Please choose an inquiry type." }) }),
  message: z.string().trim().min(20, "Please write at least 20 characters.").max(4000, "Please keep your message under 4000 characters."),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept the Privacy Policy to send your message." }) }),
  website: z.string().max(200).optional(),
});

const Field = ({ id, label, error, children }) => (
  <div>
    <label htmlFor={id} className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
      {label} <span className="text-volt-bright" aria-hidden="true">*</span>
    </label>
    {children}
    {error && <p id={`${id}-error`} className="mt-2 text-sm text-red-300" data-testid={`${id}-error`}>{error}</p>}
  </div>
);

export const ContactForm = () => {
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", inquiry_type: "", message: "", consent: false, website: "" },
  });
  const a11y = (name) => ({ "aria-invalid": errors[name] ? "true" : "false", "aria-describedby": errors[name] ? `${name}-error` : undefined, "aria-required": "true" });

  const onSubmit = async (values) => {
    if (!hasBackend) {
      setStatus({ state: "error", message: "The form is unavailable right now. Please use the email address on this page." });
      return;
    }
    setStatus({ state: "sending", message: "Sending your message…" });
    try {
      await api.post("/contact", { ...values, website: values.website ?? "" });
      reset();
      setStatus({ state: "success", message: "Thank you. Your message has been sent and I'll reply as soon as I can." });
    } catch (err) {
      setStatus({ state: "error", message: errorMessage(err, "Your message could not be sent. Please try again or use email.") });
    }
  };

  if (status.state === "success") {
    return (
      <div role="status" aria-live="polite" className="border border-volt bg-ink-900 p-10" data-testid="contact-success">
        <CheckCircle2 aria-hidden="true" className="h-10 w-10 text-volt-bright" />
        <p className="t-h3 mt-6">Message sent</p>
        <p className="body-copy mt-3">{status.message}</p>
        <button type="button" onClick={() => setStatus({ state: "idle", message: "" })} className="mt-8 min-h-[44px] text-sm font-semibold uppercase tracking-[0.18em] text-volt-bright hover:text-white" data-testid="contact-send-another-btn">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6" data-testid="contact-form" aria-describedby="contact-status">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="name" label="Name" error={errors.name?.message}>
          <input id="name" type="text" autoComplete="name" className="field" data-testid="contact-name-input" {...a11y("name")} {...register("name")} />
        </Field>
        <Field id="email" label="Email" error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" className="field" data-testid="contact-email-input" {...a11y("email")} {...register("email")} />
        </Field>
      </div>
      <Field id="inquiry_type" label="Inquiry type" error={errors.inquiry_type?.message}>
        <div className="relative">
          <select id="inquiry_type" className="field appearance-none pr-12" data-testid="contact-inquiry-select" {...a11y("inquiry_type")} {...register("inquiry_type")}>
            <option value="" disabled>Choose one</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-volt-bright" />
        </div>
      </Field>
      <Field id="message" label="Message" error={errors.message?.message}>
        <textarea id="message" rows={6} className="field resize-y" data-testid="contact-message-input" {...a11y("message")} {...register("message")} />
      </Field>
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" data-testid="contact-honeypot" {...register("website")} />
      </div>
      <div>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-300">
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#2F6BFF]" data-testid="contact-consent-checkbox" {...a11y("consent")} {...register("consent")} />
          <span>
            I agree that my details will be used to answer this inquiry, as described in the{" "}
            <Link to="/privacy-policy" className="text-volt-bright underline underline-offset-4">Privacy Policy</Link>. <span className="text-volt-bright" aria-hidden="true">*</span>
          </span>
        </label>
        {errors.consent && <p id="consent-error" className="mt-2 text-sm text-red-300" data-testid="consent-error">{errors.consent.message}</p>}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button type="submit" disabled={status.state === "sending"} data-testid="contact-submit-btn" className="group relative inline-flex min-h-[54px] items-center justify-center gap-3 overflow-hidden rounded-sm border border-volt bg-volt px-8 font-display text-base font-bold uppercase tracking-[0.14em] text-white disabled:opacity-70">
          <span aria-hidden="true" className="absolute inset-0 -translate-x-[101%] bg-paper transition-transform duration-500 ease-cine group-hover:translate-x-0" />
          <span className="relative flex items-center gap-3 transition-colors duration-300 group-hover:text-ink-950">
            {status.state === "sending" && <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />}
            Send message
          </span>
        </button>
        <p id="contact-status" role="status" aria-live="polite" data-testid="contact-status" className={`text-sm ${status.state === "error" ? "text-red-300" : "text-slate-300"}`}>
          {status.state !== "idle" ? status.message : ""}
        </p>
      </div>
      <p className="text-xs leading-relaxed text-slate-400" data-testid="contact-privacy-notice">
        Your details are used only to answer your message and are deleted automatically after 12 months, or sooner on request. See the <Link to="/privacy-policy" className="underline underline-offset-4 hover:text-white">Privacy Policy</Link>.
      </p>
    </form>
  );
};
