import { useSeo } from "@/lib/seo";
import { HomeHero } from "@/components/home/HomeHero";
import { Marquee } from "@/components/site/Marquee";
import { SelectedProjects } from "@/components/home/SelectedProjects";
import { ApproachStrip } from "@/components/home/ApproachStrip";

export default function Home() {
  useSeo({
    title: "Sports Social Media & Content Creator",
    description: "Alex Cearnau (Mativo Hub): sports social media, football content creation and sports storytelling concepts. Open to junior roles, internships and collaborations.",
    path: "/",
  });
  return (
    <>
      <HomeHero />
      <Marquee />
      <SelectedProjects />
      <ApproachStrip />
    </>
  );
}
