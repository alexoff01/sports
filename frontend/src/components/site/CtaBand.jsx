import { Reveal } from "@/components/site/Reveal";
import { CtaLink } from "@/components/site/CtaLink";
import { GoalNet } from "@/components/football/GoalNet";
import { LightBeam } from "@/components/football/Atmosphere";

export const CtaBand = ({ title = "Have a project in mind?", accent = "Let's talk.", text, testId = "cta-band" }) => (
  <section data-testid={testId} className="relative overflow-hidden border-y border-line bg-ink-900/70">
    <GoalNet className="inset-y-0 right-0 w-full md:w-1/2" />
    <LightBeam className="-top-1/4 left-[8%]" />
    <div aria-hidden="true" className="absolute -right-24 top-1/2 h-[140%] w-1/2 -translate-y-1/2 skew-x-[-18deg] border-l border-volt/40 bg-volt/[0.06]" />
    <div className="container-x relative flex flex-col gap-10 py-20 md:flex-row md:items-end md:justify-between md:py-28">
      <Reveal>
        <h2 className="t-h1 max-w-4xl">
          {title} <span className="text-volt">{accent}</span>
        </h2>
        {text && <p className="lead mt-6 max-w-xl">{text}</p>}
      </Reveal>
      <Reveal delay={0.15}>
        <CtaLink to="/contact" testId={`${testId}-btn`}>Get in touch</CtaLink>
      </Reveal>
    </div>
  </section>
);
