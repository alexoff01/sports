import { useSeo } from "@/lib/seo";
import { LegalLayout } from "@/components/site/LegalLayout";
import { useConsent } from "@/components/site/ConsentProvider";

const Table = () => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[520px] border border-line text-left text-sm">
      <thead className="bg-ink-900 text-xs uppercase tracking-[0.16em] text-slate-300">
        <tr><th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Purpose</th><th className="p-3">Duration</th></tr>
      </thead>
      <tbody className="divide-y divide-line">
        <tr><td className="p-3 font-mono">mv_consent</td><td className="p-3">Strictly necessary (local storage)</td><td className="p-3">Remembers your cookie choice, its date and the policy version.</td><td className="p-3">6 months</td></tr>
        <tr><td className="p-3 font-mono">mv_intro</td><td className="p-3">Strictly necessary (session storage)</td><td className="p-3">Shows the short intro animation only once per visit.</td><td className="p-3">Until the tab is closed</td></tr>
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
          <p>You can accept, reject or customise categories at any time. Your choice is stored for six months, and you will be asked again if this policy changes.</p>
          <button type="button" onClick={openSettings} data-testid="cookie-policy-settings-btn" className="mt-2 inline-flex min-h-[48px] items-center border border-volt px-6 font-display font-bold uppercase tracking-[0.14em] text-paper transition-colors hover:bg-volt">Open Cookie Settings</button>
        </>
      ),
    },
  ];
  return <LegalLayout title="Cookie Policy" testId="cookie-policy-page" intro="This policy explains which cookies and similar technologies this portfolio uses and how you can control them." sections={sections} />;
}
