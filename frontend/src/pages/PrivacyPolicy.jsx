import { useSeo } from "@/lib/seo";
import { LegalLayout } from "@/components/site/LegalLayout";
import { ObfuscatedEmail } from "@/components/site/ObfuscatedEmail";

const SECTIONS = [
  {
    title: "1. Who is responsible for your data",
    body: (
      <>
        <p>The data controller for this website is Alex Cearnau, Oradea, Romania (full postal address: TODO_CONFIRM).</p>
        <p>Contact for any privacy question: <ObfuscatedEmail showIcon={false} testId="privacy-email-link" className="!min-h-0" /></p>
      </>
    ),
  },
  {
    title: "2. What this website is",
    body: <p>This is a personal portfolio and digital business card. Nothing is sold here: there are no products, payments, accounts for visitors, newsletters or comments.</p>,
  },
  {
    title: "3. Personal data I process",
    body: (
      <ul>
        <li><strong>Contact form:</strong> your name, email address, inquiry type, message and the fact that you accepted this policy, plus the date and time of submission.</li>
        <li><strong>Abuse prevention:</strong> to limit spam, a one-way hash of your IP address is kept for up to two hours. The IP address itself is not stored.</li>
        <li><strong>Analytics:</strong> none at the moment. If privacy-friendly, IP-anonymised analytics are added later, they will only run after you allow the Analytics category in Cookie Settings.</li>
      </ul>
    ),
  },
  {
    title: "4. Why and on what legal basis",
    body: (
      <ul>
        <li>Answering your inquiry and taking steps you request before a possible collaboration or employment: Article 6(1)(b) GDPR, and your consent given through the form checkbox (Article 6(1)(a)).</li>
        <li>Keeping the site secure and preventing spam: legitimate interest (Article 6(1)(f)).</li>
        <li>Optional analytics, if ever enabled: your consent (Article 6(1)(a)), which you can withdraw at any time.</li>
      </ul>
    ),
  },
  {
    title: "5. Who receives your data",
    body: (
      <>
        <p>Messages are delivered to my inbox through a transactional email service and stored in a protected database. Service providers involved: hosting provider (TODO_CONFIRM), email delivery provider (TODO_CONFIRM) and database provider (TODO_CONFIRM). They act as processors under data processing agreements.</p>
        <p>Your data is never sold or shared for advertising. If any provider processes data outside the European Economic Area, appropriate safeguards such as Standard Contractual Clauses apply (details: TODO_CONFIRM).</p>
      </>
    ),
  },
  {
    title: "6. How long data is kept",
    body: <p>Contact messages are deleted automatically after 12 months, or sooner if you ask. Abuse-prevention hashes are deleted after two hours. If a message leads to a collaboration or employment process, relevant information may be kept for as long as that process requires (TODO_CONFIRM).</p>,
  },
  {
    title: "7. Your rights",
    body: (
      <>
        <p>Under the GDPR you have the right to access your data, to rectification, to erasure, to restriction of processing, to data portability and to object to processing. Where processing is based on consent, you can withdraw it at any time without affecting earlier processing.</p>
        <p>To exercise any right, write to the email address above. You also have the right to lodge a complaint with the Romanian supervisory authority, ANSPDCP (Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal), <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">www.dataprotection.ro</a>, or with the authority in your country of residence.</p>
      </>
    ),
  },
  {
    title: "8. Security",
    body: <p>Data is sent over encrypted connections (HTTPS), validated on the server, and access to stored messages is restricted to the site owner with multi-factor authentication.</p>,
  },
  {
    title: "9. Changes to this policy",
    body: <p>If this policy changes, the new version and date will be published on this page.</p>,
  },
];

export default function PrivacyPolicy() {
  useSeo({ title: "Privacy Policy", description: "How Alex Cearnau's portfolio website handles personal data under the GDPR.", path: "/privacy-policy" });
  return <LegalLayout title="Privacy Policy" testId="privacy-policy-page" intro="This policy explains what personal data this website processes, why, and the rights you have under the EU General Data Protection Regulation (GDPR)." sections={SECTIONS} />;
}
