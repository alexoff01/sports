import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { SITE } from "@/config/site";

const reverse = (s) => s.split("").reverse().join("");

export const ObfuscatedEmail = ({ className = "", testId = "contact-email-link", showIcon = true }) => {
  const [email, setEmail] = useState("");
  useEffect(() => {
    const [user, domain] = SITE.emailParts.map(reverse);
    setEmail(`${user}${String.fromCharCode(64)}${domain}`);
  }, []);
  if (!email) return <span className={className} aria-hidden="true">&nbsp;</span>;
  return (
    <a
      href={`mailto:${email}`}
      data-testid={testId}
      className={`group inline-flex min-h-[44px] items-center gap-3 break-all transition-colors hover:text-volt-bright ${className}`}
    >
      {showIcon && <Mail aria-hidden="true" className="h-5 w-5 shrink-0 text-volt-bright transition-transform duration-300 group-hover:-rotate-12" />}
      <span>{email}</span>
    </a>
  );
};
