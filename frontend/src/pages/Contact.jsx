import { MapPin } from "lucide-react";
import { useSeo } from "@/lib/seo";
import { SITE } from "@/config/site";
import { MaskedHeadline } from "@/components/site/MaskedHeadline";
import { Reveal } from "@/components/site/Reveal";
import { ObfuscatedEmail } from "@/components/site/ObfuscatedEmail";
import { SocialLinks } from "@/components/site/SocialLinks";
import { ContactForm } from "@/components/contact/ContactForm";
import { responsive } from "@/lib/api";

export default function Contact() {
  useSeo({
    title: "Contact",
    description: "Get in touch with Alex Cearnau about sports social media roles, internships, collaborations and sports content projects.",
    path: "/contact",
  });
  return (
    <section className="relative pb-section pt-40 md:pt-48" aria-labelledby="contact-title">
      <div className="container-x">
        <p className="eyebrow">Contact</p>
        <MaskedHeadline testId="contact-title" className="t-h1 mt-6 max-w-6xl" delay={0.25} lines={[{ text: "Let's create something" }, { text: "that moves people.", accent: true }]} />
        <Reveal delay={0.4}>
          <p className="lead mt-8 max-w-2xl">
            Open to job opportunities, internships, collaborations and sports content projects. Tell me a little about what you have in mind and I'll get back to you.
          </p>
        </Reveal>
        <div className="mt-16 grid gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-7" delay={0.1}>
            <ContactForm />
          </Reveal>
          <Reveal as="aside" delay={0.2} className="space-y-8 lg:col-span-4 lg:col-start-9" aria-label="Contact details">
            <div className="border border-line bg-ink-900 p-8" data-testid="contact-details">
              <p className="eyebrow">Direct</p>
              <div className="mt-5 text-lg text-paper"><ObfuscatedEmail /></div>
              <SocialLinks className="mt-5" />
              <p className="mt-8 flex gap-3 border-t border-line pt-6 text-sm leading-relaxed text-slate-300" data-testid="contact-location">
                <MapPin aria-hidden="true" className="h-5 w-5 shrink-0 text-volt-bright" />
                {SITE.availability}
              </p>
            </div>
            <div className="relative hidden aspect-[4/3] overflow-hidden border border-line sm:block [clip-path:polygon(0_0,100%_0,100%_86%,88%_100%,0_100%)]">
              <img {...responsive("/images/ball-night-1600.webp", "(min-width:1024px) 30vw, 100vw")} alt="A football on dewy grass at night" loading="lazy" className="h-full w-full object-cover" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
