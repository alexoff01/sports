import { Link } from "react-router-dom";
import { useSeo } from "@/lib/seo";

export default function NotFound() {
  useSeo({ title: "Page not found", description: "The page you are looking for does not exist.", path: "/404", noindex: true });
  return (
    <section className="container-x flex min-h-[85vh] flex-col justify-center pb-20 pt-40" data-testid="not-found-page">
      <p className="eyebrow">Error 404</p>
      <h1 className="h-display mt-6">Off<span className="text-volt">side.</span></h1>
      <p className="lead mt-8 max-w-xl">This page does not exist or has moved. Head back to the home page or browse the projects.</p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link to="/" data-testid="not-found-home-link" className="inline-flex min-h-[52px] items-center border border-volt bg-volt px-7 font-display font-bold uppercase tracking-[0.14em]">Back to home</Link>
        <Link to="/projects" className="inline-flex min-h-[52px] items-center border border-line-strong px-7 font-display font-bold uppercase tracking-[0.14em]">View projects</Link>
      </div>
    </section>
  );
}
