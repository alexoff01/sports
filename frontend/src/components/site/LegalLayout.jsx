import { SITE } from "@/config/site";

export const LegalLayout = ({ title, testId, intro, sections }) => (
  <article className="container-x pb-section pt-40 md:pt-48" data-testid={testId}>
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
