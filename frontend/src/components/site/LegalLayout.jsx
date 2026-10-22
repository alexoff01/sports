import { SITE } from "@/config/site";
import { DriftMotif, GlowHalo } from "@/components/football/Atmosphere";
import { CornerFlagIcon, WhistleIcon } from "@/components/football/motifs";

export const LegalLayout = ({ title, testId, intro, sections }) => (
  <article className="container-x relative pb-section pt-40 md:pt-48" data-testid={testId}>
    <GlowHalo className="-left-40 top-16 h-[480px] w-[480px]" />
    <DriftMotif icon={WhistleIcon} className="right-4 top-48 -z-10 h-56 w-56" />
    <DriftMotif icon={CornerFlagIcon} className="bottom-40 right-16 -z-10 h-64 w-64" distance={40} />
    <p className="eyebrow">Legal</p>
    <h1 className="t-h1 mt-6">{title}</h1>
    <p className="mt-6 text-sm text-slate-400">Last updated: {SITE.legalUpdated} · Version {SITE.cookiePolicyVersion}</p>
    <p className="lead mt-6 max-w-3xl">{intro}</p>
    <p className="mt-6 max-w-3xl border-l-2 border-volt bg-ink-900 p-4 text-sm text-slate-300">
      This text is a template prepared in good faith and should be reviewed by a qualified legal professional before launch.
    </p>
    <div className="mt-14 max-w-3xl space-y-12">
      {sections.map((s) => (
        <section key={s.title} aria-labelledby={`legal-${s.title.replace(/\W+/g, "-").toLowerCase()}`}>
          <h2 id={`legal-${s.title.replace(/\W+/g, "-").toLowerCase()}`} className="t-h3">{s.title}</h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-300 [&_a]:text-volt-bright [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
            {s.body}
          </div>
        </section>
      ))}
    </div>
  </article>
);
