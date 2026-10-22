import { Link } from "react-router-dom";
import { NAV, SITE } from "@/config/site";
import { Logo } from "@/components/site/Logo";
import { ObfuscatedEmail } from "@/components/site/ObfuscatedEmail";
import { SocialLinks } from "@/components/site/SocialLinks";
import { useConsent } from "@/components/site/ConsentProvider";

const footLink = "inline-flex min-h-[44px] items-center text-sm text-slate-300 transition-colors hover:text-white";

export const Footer = () => {
  const { openSettings } = useConsent();
  const year = new Date().getFullYear();
  return (
    <footer data-testid="site-footer" className="relative border-t border-line bg-ink-950">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo height="h-8" testId="footer-logo-link" />
          <p className="body-copy mt-5 max-w-sm">
            Alex Cearnau. Sports social media, football content creation and sports storytelling. {SITE.availability}.
          </p>
          <div className="mt-6 text-paper">
            <ObfuscatedEmail testId="footer-email-link" />
          </div>
          <SocialLinks className="mt-4" />
        </div>
        <nav aria-label="Footer" className="md:col-span-3">
          <p className="eyebrow">Explore</p>
          <ul className="mt-5">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={footLink} data-testid={`footer-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-4">
          <p className="eyebrow">Legal</p>
          <ul className="mt-5">
            <li><Link to="/privacy-policy" className={footLink} data-testid="footer-privacy-link">Privacy Policy</Link></li>
            <li><Link to="/cookie-policy" className={footLink} data-testid="footer-cookie-policy-link">Cookie Policy</Link></li>
            <li>
              <button type="button" onClick={openSettings} className={footLink} data-testid="footer-cookie-settings-btn">Cookie Settings</button>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-3 py-8 text-xs leading-relaxed text-slate-400 md:flex-row md:justify-between">
          <p data-testid="footer-copyright">© {year} Alex Cearnau. All rights reserved.</p>
          <div className="max-w-2xl space-y-1 md:text-right">
            <p>Images: AI-generated atmospheric visuals created for this site; they do not depict real matches, clubs or players. Project mockups are original concept work; clubs and brands in concepts are fictional.</p>
            <p data-testid="footer-affiliation-note">Not affiliated with or endorsed by FC Barcelona or any club mentioned.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
