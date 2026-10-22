import { Reveal } from "@/components/site/Reveal";

export const SectionHeader = ({ eyebrow, title, intro, align = "left", children, id }) => (
  <div className={`flex flex-col gap-6 md:flex-row md:items-end md:justify-between ${align === "center" ? "text-center" : ""}`}>
    <div className="max-w-3xl">
      <Reveal>
        <p className="eyebrow">{eyebrow}</p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 id={id} className="t-h2 mt-5">
          {title}
        </h2>
      </Reveal>
      {intro && (
        <Reveal delay={0.16}>
          <p className="lead mt-5 max-w-2xl">{intro}</p>
        </Reveal>
      )}
    </div>
    {children && <Reveal delay={0.2}>{children}</Reveal>}
  </div>
);
