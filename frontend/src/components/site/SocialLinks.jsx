import { Instagram, Linkedin } from "lucide-react";
import { confirmedSocials } from "@/config/site";

const TikTok = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.8 5.8 0 1 0 4.9 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6Z" />
  </svg>
);
const XIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
  </svg>
);

const ICONS = { linkedin: Linkedin, instagram: Instagram, tiktok: TikTok, x: XIcon };

export const SocialLinks = ({ className = "" }) => {
  if (confirmedSocials.length === 0) return null;
  return (
    <ul className={`flex gap-2 ${className}`} aria-label="Social profiles">
      {confirmedSocials.map((s) => {
        const Icon = ICONS[s.id];
        return (
          <li key={s.id}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer me"
              aria-label={`${s.label} (opens in a new tab)`}
              data-testid={`social-link-${s.id}`}
              className="group grid h-11 w-11 place-items-center border border-line transition-colors duration-300 hover:border-volt hover:bg-volt"
            >
              <Icon aria-hidden="true" className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            </a>
          </li>
        );
      })}
    </ul>
  );
};
