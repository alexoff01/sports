import { responsive } from "@/lib/api";

export const PhoneMockup = ({ image, alt, platform, caption, index }) => (
  <figure className="group" data-testid={`content-mockup-${index}`}>
    <div className="relative mx-auto aspect-[9/18] w-full max-w-[280px] overflow-hidden rounded-[24px] border border-line-strong bg-ink-900 p-2 transition-transform duration-700 ease-cine group-hover:-translate-y-2">
      <div className="relative h-full overflow-hidden rounded-[18px]">
        <img {...responsive(image, "280px")} alt={alt} loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <span className="bg-ink-950/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur">{platform}</span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-slate-200">Mockup</span>
        </div>
        {caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent p-4 pt-14">
            <p className="text-[13px] leading-snug text-paper">{caption}</p>
          </div>
        )}
      </div>
    </div>
    <figcaption className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-slate-400">{platform} concept</figcaption>
  </figure>
);
