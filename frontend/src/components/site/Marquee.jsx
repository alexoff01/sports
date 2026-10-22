const ITEMS = ["Matchday Coverage", "Player Storytelling", "Vertical Video", "Fan Engagement", "Campaign Planning", "Sports Communication"];

const Row = ({ hidden }) => (
  <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
    {ITEMS.map((item, i) => (
      <span key={item} className="flex items-center">
        <span className={`px-8 font-display text-[clamp(3rem,8vw,7rem)] font-extrabold uppercase leading-none ${i % 2 ? "text-outline" : "text-paper"}`}>
          {item}
        </span>
        <span className="h-3 w-3 rotate-45 bg-volt" aria-hidden="true" />
      </span>
    ))}
  </div>
);

export const Marquee = () => (
  <section aria-label="Areas of focus" data-testid="home-marquee" className="relative overflow-hidden border-y border-line bg-ink-950/55 py-10 md:py-14">
    <div className="marquee-track flex w-max">
      <Row />
      <Row hidden />
    </div>
  </section>
);
