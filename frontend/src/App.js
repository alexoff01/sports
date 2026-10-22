import { lazy, Suspense } from "react";
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

const AdminApp = lazy(() => import("@/admin/AdminApp"));
const ADMIN_PATH = process.env.REACT_APP_ADMIN_PATH;

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

function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ConsentProvider>
          <BrowserRouter>
            <SmoothScroll />
            <Routes>
              {ADMIN_PATH && (
                <Route
                  path={`/${ADMIN_PATH}/*`}
                  element={
                    <Suspense fallback={<div className="min-h-screen bg-ink-950" />}>
                      <AdminApp />
                    </Suspense>
                  }
                />
              )}
              <Route path="*" element={<PublicSite />} />
            </Routes>
          </BrowserRouter>
        </ConsentProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}

export default App;
