import { Award, BarChart3, Brush, CalendarRange, Clapperboard, MessagesSquare, Smartphone } from "lucide-react";
import { useSeo } from "@/lib/seo";
import { SITE } from "@/config/site";
import { Picture } from "@/components/site/Picture";
import { MaskedHeadline } from "@/components/site/MaskedHeadline";
import { Reveal } from "@/components/site/Reveal";
import { CtaLink } from "@/components/site/CtaLink";
import { CtaBand } from "@/components/site/CtaBand";

const APPROACH = [
  { title: "Creativity", text: "Look for the angle nobody filmed: the tunnel, the kit room, the fan who never misses a match." },
  { title: "Strategy", text: "Give every platform a job, plan the season ahead and keep the posting rhythm realistic." },
  { title: "Storytelling", text: "Build each post around a person and a moment, so it means something beyond the score." },
  { title: "Community", text: "Treat supporters as part of the story, with clear rules on consent and respect." },
];

const SKILLS = [
  { icon: Smartphone, title: "Content Creation", text: "Planning and producing photo, story and short-form video content for sports channels." },
  { icon: MessagesSquare, title: "Social Media Management", text: "Scheduling, community replies and keeping a consistent voice across platforms." },
  { icon: CalendarRange, title: "Strategy & Planning", text: "Content pillars, calendars and campaign concepts built around the sporting season." },
  { icon: BarChart3, title: "Analytics & Reporting", text: "Choosing the right measures for an objective and reading platform insights to learn and adjust." },
  { icon: Brush, title: "Editing & Design", text: "Vertical video editing, matchday templates and simple, consistent visual systems." },
  { icon: Clapperboard, title: "Communication", text: "Clear, natural writing for captions, briefs and updates to teammates and stakeholders." },
];

const AboutHero = () => (
  <section className="container-x grid gap-12 pb-section pt-40 md:pt-48 lg:grid-cols-12 lg:items-end" aria-labelledby="about-title">
    <div className="lg:col-span-7">
      <p className="eyebrow">About Me</p>
      <MaskedHeadline testId="about-title" className="h-display mt-6" delay={0.25} lines={[{ text: "Sports lover." }, { text: "Digital creator.", accent: true }]} />
      <Reveal delay={0.45}>
        <div className="mt-10 max-w-xl space-y-5">
          <p className="lead">I'm Alex Cearnau, a football fan from Oradea, Romania, building a career in sports social media and digital content.</p>
          <p className="body-copy">Through my own concept projects, I plan campaigns, matchday content and short-form video to practise how clubs and athletes can tell better stories online. I'm looking for a junior role, internship or collaboration where I can learn from a professional team and contribute from day one.</p>
        </div>
        <div className="mt-10"><CtaLink to="/contact" testId="about-hero-contact-btn">Work with me</CtaLink></div>
      </Reveal>
    </div>
    <Reveal delay={0.3} className="lg:col-span-5">
      <div className="relative aspect-[4/5] overflow-hidden border border-line [clip-path:polygon(12%_0,100%_0,100%_100%,0_100%,0_10%)]">
        <Picture src="/images/about-creator-lg.webp" sizes="(min-width:1024px) 40vw, 100vw" alt="Back view of a creator filming a floodlit pitch with a camera on a gimbal" className="h-full w-full object-cover object-[center_35%]" />
      </div>
    </Reveal>
  </section>
);

const Certification = () => (
  <section className="container-x pb-section" aria-labelledby="cert-title">
    <Reveal className="grid gap-8 border border-line bg-ink-900 p-8 md:grid-cols-12 md:items-center md:p-12" data-testid="certification-block">
      <Award aria-hidden="true" className="h-14 w-14 text-volt-bright md:col-span-1" strokeWidth={1.3} />
      <div className="md:col-span-8">
        <p className="eyebrow">Certification</p>
        <h2 id="cert-title" className="t-h2 mt-4">{SITE.qualification.title}</h2>
        <p className="lead mt-3">{SITE.qualification.issuer}, {SITE.qualification.year}</p>
      </div>
      <p className="text-xs leading-relaxed text-slate-400 md:col-span-3">Stated as a qualification only. No affiliation with or endorsement by FC Barcelona is implied.</p>
    </Reveal>
  </section>
);

const Approach = () => (
  <section className="border-y border-line bg-ink-900/40 py-section" aria-labelledby="about-approach-title">
    <div className="container-x">
      <p className="eyebrow">My Approach</p>
      <h2 id="about-approach-title" className="t-h2 mt-5">Creativity · Strategy · <span className="text-volt">Storytelling · Community</span></h2>
      <ol className="mt-14 grid gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-4">
        {APPROACH.map((a, i) => (
          <Reveal as="li" key={a.title} delay={i * 0.08} className="bg-ink-950 p-8">
            <span className="font-display text-6xl font-extrabold text-outline">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="t-h3 mt-6">{a.title}</h3>
            <p className="body-copy mt-3">{a.text}</p>
          </Reveal>
        ))}
      </ol>
    </div>
  </section>
);

const Skills = () => (
  <section className="container-x py-section" aria-labelledby="skills-title">
    <p className="eyebrow">Skills &amp; Expertise</p>
    <h2 id="skills-title" className="t-h2 mt-5">What I bring <span className="text-volt">to a team.</span></h2>
    <p className="lead mt-5 max-w-2xl">Capabilities I practise in my own projects and want to keep developing in a professional setting.</p>
    <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="skills-grid">
      {SKILLS.map((s, i) => (
        <Reveal as="li" key={s.title} delay={(i % 3) * 0.08} className="group border border-line bg-ink-900/60 p-8 transition-[border-color,background-color] duration-500 hover:border-volt hover:bg-ink-800">
          <s.icon aria-hidden="true" className="h-8 w-8 text-volt-bright transition-transform duration-500 group-hover:scale-110" strokeWidth={1.5} />
          <h3 className="t-h3 mt-6">{s.title}</h3>
          <p className="body-copy mt-3">{s.text}</p>
        </Reveal>
      ))}
    </ul>
  </section>
);

const QuoteBand = () => (
  <section className="relative overflow-hidden border-y border-line" aria-label="Statement" data-testid="quote-band">
    <Picture src="/images/band-grass-lines-lg.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-bottom opacity-40" />
    <div className="absolute inset-0 bg-ink-950/70" aria-hidden="true" />
    <Reveal className="container-x relative py-28 md:py-36">
      <p className="max-w-5xl font-display text-[clamp(2rem,5vw,4.25rem)] font-bold uppercase leading-[1] text-paper">{SITE.quote}</p>
    </Reveal>
  </section>
);

export default function About() {
  useSeo({
    title: "About Me",
    description: "About Alex Cearnau: sports lover and digital creator from Oradea, Romania. Social Media in Sports, FC Barcelona Innovation Hub, 2025.",
    path: "/about",
  });
  return (
    <>
      <AboutHero />
      <Certification />
      <Approach />
      <Skills />
      <QuoteBand />
      <CtaBand title="Looking for a junior sports creator?" accent="Let's talk." testId="about-cta-band" />
    </>
  );
}
