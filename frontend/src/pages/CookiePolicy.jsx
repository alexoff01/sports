import { useSeo } from "@/lib/seo";
import { LegalLayout } from "@/components/site/LegalLayout";
import { useConsent } from "@/components/site/ConsentProvider";
import { SITE } from "@/config/site";

const ROWS = [
  ["mv_consent", "Strictly necessary (local storage)", "Remembers your cookie choice, its date and the policy version. Set only after you make a choice.", "6 months", "First party"],
  ["mv_intro", "Strictly necessary (session storage)", "Shows the short intro animation only once per visit.", "Until the tab is closed", "First party"],
  ["__Host-admin_session, __Host-admin_csrf, __Host-admin_preauth", "Strictly necessary (cookies)", "Sign-in session, security token and sign-in step for the private administration area. Set only when the site owner signs in; never for visitors.", "Up to 12 hours (sign-in step: 5 minutes)", "First party"],
  ["__cf_bm, cf_clearance", "Strictly necessary (cookies)", "Set by the hosting provider's network (Cloudflare) to protect the site from bots and attacks (TODO_CONFIRM with the hosting provider).", "30 minutes / up to 1 year", "Third party (hosting)"],
];

const Table = () => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] border border-line text-left text-sm" data-testid="cookie-table">
      <thead className="bg-ink-900 text-xs uppercase tracking-[0.16em] text-slate-300">
        <tr><th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Purpose</th><th className="p-3">Duration</th><th className="p-3">Party</th></tr>
      </thead>
      <tbody className="divide-y divide-line">
        {ROWS.map(([name, cat, purpose, duration, party]) => (
          <tr key={name}><td className="p-3 font-mono">{name}</td><td className="p-3">{cat}</td><td className="p-3">{purpose}</td><td className="p-3">{duration}</td><td className="p-3">{party}</td></tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function CookiePolicy() {
  const { openSettings } = useConsent();
  useSeo({ title: "Cookie Policy", description: "Which cookies and similar technologies Alex Cearnau's portfolio uses and how to manage consent.", path: "/cookie-policy" });
  const sections = [
    { title: "1. What cookies are", body: <p>Cookies and similar technologies such as local storage are small pieces of data saved in your browser. Some are needed for a site to work; others are optional and need your consent under the EU ePrivacy rules and the GDPR.</p> },
    { title: "2. What this site uses", body: <><p>By default, only strictly necessary storage is used. No analytics, advertising or tracking technologies are currently installed, and nothing optional loads before you consent.</p><Table /><p>The hosting provider may set strictly necessary technical cookies to deliver the site securely (TODO_CONFIRM).</p></> },
    { title: "3. Optional categories", body: <ul><li><strong>Preferences:</strong> not currently used.</li><li><strong>Analytics:</strong> not currently used. If a privacy-friendly, IP-anonymised tool is added, it will be listed here and will only load after you allow it.</li><li><strong>Marketing:</strong> not used.</li></ul> },
    {
      title: "4. Managing your choice",
      body: (
        <>
          <p>You can accept, reject or customise categories at any time. Your choice is stored for six months, and you will be asked again if this policy changes. Withdrawing consent is as easy as giving it: use the Cookie Settings link in the footer.</p>
          <button type="button" onClick={openSettings} data-testid="cookie-policy-settings-btn" className="mt-2 inline-flex min-h-[48px] items-center border border-volt px-6 font-display font-bold uppercase tracking-[0.14em] text-paper transition-colors hover:bg-volt">Open Cookie Settings</button>
        </>
      ),
    },
    {
      title: "5. Third-party content",
      body: <p>Fonts and images are served from this site itself. There are no embedded maps, videos, social media widgets, advertising or tracking scripts. Version {SITE.cookiePolicyVersion}, last updated {SITE.legalUpdated}.</p>,
    },
  ];
  return <LegalLayout title="Cookie Policy" testId="cookie-policy-page" intro="This policy explains which cookies and similar technologies this portfolio uses and how you can control them." sections={sections} />;
}
