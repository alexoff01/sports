import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Camera, Clapperboard, Compass, Users } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { DriftMotif, GlowHalo } from "@/components/football/Atmosphere";
import { FloodlightIcon, BallIcon } from "@/components/football/motifs";
import { Picture } from "@/components/site/Picture";

const ITEMS = [
  { icon: Camera, title: "Content Creation", text: "Matchday photos, stories and graphics planned around the moments supporters care about most." },
  { icon: Compass, title: "Social Media Strategy", text: "Clear platform roles, posting rhythms and content pillars that a small team can keep up all season." },
  { icon: Clapperboard, title: "Video Production", text: "Vertical-first filming and editing for Reels, TikTok and YouTube Shorts, shot on a phone or a gimbal." },
  { icon: Users, title: "Community Building", text: "Formats that invite supporters in, with moderation and consent built in from the start." },
];

export const ApproachStrip = () => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-8%", "8%"]);

  return (
    <section ref={ref} aria-labelledby="approach-title" data-testid="home-approach" className="relative overflow-hidden border-t border-line bg-ink-900/40 py-section">
      <DriftMotif icon={FloodlightIcon} className="right-[8%] top-28 h-56 w-56 lg:right-[18%]" />
      <DriftMotif icon={BallIcon} className="-left-16 bottom-10 h-72 w-72" distance={40} />
      <GlowHalo className="-left-40 top-0 h-[520px] w-[520px]" />
      <div className="container-x grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal><p className="eyebrow">My Approach</p></Reveal>
          <Reveal delay={0.08}>
            <h2 id="approach-title" className="t-h2 mt-5">
              Strategy <span className="text-volt">+</span> Creativity <span className="text-volt">+</span> Sport
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="lead mt-6 max-w-md">Every idea starts with the sport and the people around it, then gets a plan and a format that fits the platform.</p>
          </Reveal>
          <Reveal delay={0.2} className="relative mt-10 aspect-[4/5] overflow-hidden border border-line [clip-path:polygon(0_0,100%_0,100%_88%,86%_100%,0_100%)]">
            <Picture img={motion.img} style={{ y }} src="/images/approach-seats-lg.webp" sizes="(min-width:1024px) 40vw, 100vw" alt="Rows of empty navy stadium seats raked by floodlight, the glowing pitch at the edge of the frame" className="h-[116%] w-full -translate-y-[8%] object-cover object-center" />
          </Reveal>
        </div>
        <ul className="grid gap-px self-end border border-line bg-line sm:grid-cols-2 lg:col-span-7">
          {ITEMS.map((item, i) => (
            <Reveal as="li" key={item.title} delay={i * 0.08} className="group relative bg-ink-900/85 p-8 transition-colors duration-500 hover:bg-ink-800 md:p-10">
              <span className="font-body text-xs font-semibold tracking-[0.24em] text-slate-400">{String(i + 1).padStart(2, "0")}</span>
              <item.icon aria-hidden="true" className="mt-8 h-9 w-9 text-volt-bright transition-transform duration-500 ease-cine group-hover:-translate-y-1 group-hover:rotate-[-6deg]" strokeWidth={1.5} />
              <h3 className="t-h3 mt-6">{item.title}</h3>
              <p className="body-copy mt-4">{item.text}</p>
              <span aria-hidden="true" className="absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 bg-volt transition-transform duration-700 ease-cine group-hover:scale-x-100" />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
};
