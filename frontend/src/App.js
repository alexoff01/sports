import { lazy, Suspense, useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { FloodlightIntro } from "@/components/football/FloodlightIntro";
import { SiteBackground } from "@/components/football/SiteBackground";
import { MatchClockProgress } from "@/components/football/MatchClockProgress";
import { SpotlightCursor } from "@/components/football/SpotlightCursor";
import { PageTransition } from "@/components/site/PageTransition";
import { CookieBanner } from "@/components/site/CookieBanner";
import { ConsentProvider } from "@/components/site/ConsentProvider";
import { ErrorBoundary } from "@/components/site/ErrorBoundary";
import Home from "@/pages/Home";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import CookiePolicy from "@/pages/CookiePolicy";
import NotFound from "@/pages/NotFound";

const Studio = lazy(() => import("@/admin/AdminApp"));
// Only a SHA-256 digest of the private route ships in the public bundle; the route itself never does.
const PRIVATE_DIGEST = process.env.REACT_APP_ADMIN_PATH_HASH;
const PUBLIC_SEGMENTS = new Set(["", "projects", "about", "contact", "privacy-policy", "cookie-policy"]);

const sha256Hex = async (text) => {
  const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
};

const page = (Component) => (
  <PageTransition>
    <Component />
  </PageTransition>
);

const PublicSite = () => {
  const location = useLocation();
  return (
    <>
      <a href="#main" className="sr-only z-[90] bg-volt px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4" data-testid="skip-to-content">
        Skip to content
      </a>
      <SiteBackground />
      <SpotlightCursor />
      <MatchClockProgress />
      <FloodlightIntro />
      <Header />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={page(Home)} />
          <Route path="/projects" element={page(Projects)} />
          <Route path="/projects/:slug" element={page(ProjectDetail)} />
          <Route path="/about" element={page(About)} />
          <Route path="/contact" element={page(Contact)} />
          <Route path="/privacy-policy" element={page(PrivacyPolicy)} />
          <Route path="/cookie-policy" element={page(CookiePolicy)} />
          <Route path="*" element={page(NotFound)} />
        </Routes>
      </main>
      <Footer />
      <CookieBanner />
    </>
  );
};

const RouteGate = () => {
  const { pathname } = useLocation();
  const segment = pathname.split("/")[1] ?? "";
  const known = PUBLIC_SEGMENTS.has(segment) || !PRIVATE_DIGEST || !window.crypto?.subtle;
  const [match, setMatch] = useState(null);

  useEffect(() => {
    if (known) return undefined;
    let live = true;
    sha256Hex(segment)
      .then((digest) => live && setMatch({ segment, ok: digest === PRIVATE_DIGEST }))
      .catch(() => live && setMatch({ segment, ok: false }));
    return () => {
      live = false;
    };
  }, [segment, known]);

  if (known) return <PublicSite />;
  if (!match || match.segment !== segment) return <div className="min-h-screen bg-ink-950" />;
  if (!match.ok) return <PublicSite />;
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-950" />}>
      <Studio />
    </Suspense>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ConsentProvider>
          <BrowserRouter>
            <SmoothScroll />
            <RouteGate />
          </BrowserRouter>
        </ConsentProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}

export default App;
