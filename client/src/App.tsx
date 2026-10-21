import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ClickRipples, Footer, Nav } from './components/chrome';
import { resetScroll, startSmoothScroll } from './lib/smooth';
import { ROUTER_BASENAME, USE_MEMORY_ROUTER } from './lib/config';
import Landing from './pages/Landing';

// Everything but the landing page loads on demand, and is prefetched once the browser is idle.
const pages = {
  simulator: () => import('./pages/Simulator'),
  methodology: () => import('./pages/Methodology'),
  about: () => import('./pages/About'),
  district: () => import('./pages/District'),
  bills: () => import('./pages/Bills'),
  compare: () => import('./pages/Compare'),
  survey: () => import('./pages/Survey'),
  surveyResults: () => import('./pages/SurveyResults'),
  notFound: () => import('./pages/NotFound'),
};
const Simulator = lazy(pages.simulator);
const Methodology = lazy(pages.methodology);
const About = lazy(pages.about);
const District = lazy(pages.district);
const Bills = lazy(pages.bills);
const Compare = lazy(pages.compare);
const Survey = lazy(pages.survey);
const SurveyResults = lazy(pages.surveyResults);
const NotFound = lazy(pages.notFound);

function prefetchPages() {
  const run = () => Object.values(pages).forEach((load) => load().catch(() => undefined));
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2500);
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      id="main"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.3 } }}
    >
      <Suspense fallback={<div className="wrap page" aria-busy="true" />}>{children}</Suspense>
    </motion.main>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" onExitComplete={resetScroll}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Page><Landing /></Page>} />
        <Route path="/simulate" element={<Page><Simulator /></Page>} />
        <Route path="/methodology" element={<Page><Methodology /></Page>} />
        <Route path="/about" element={<Page><About /></Page>} />
        <Route path="/district" element={<Page><District /></Page>} />
        <Route path="/bills" element={<Page><Bills /></Page>} />
        <Route path="/compare" element={<Page><Compare /></Page>} />
        <Route path="/survey/:id" element={<Page><Survey /></Page>} />
        <Route path="/survey/:id/results" element={<Page><SurveyResults /></Page>} />
        <Route path="*" element={<Page><NotFound /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}

function Shell() {
  useEffect(() => startSmoothScroll(), []);
  useEffect(prefetchPages, []);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <ClickRipples />
      <Nav />
      <AnimatedRoutes />
      <Footer />
    </>
  );
}

export default function App() {
  const future = { v7_startTransition: true, v7_relativeSplatPath: true };
  if (USE_MEMORY_ROUTER)
    return (
      <MemoryRouter future={future}>
        <Shell />
      </MemoryRouter>
    );
  return (
    <BrowserRouter basename={ROUTER_BASENAME} future={future}>
      <Shell />
    </BrowserRouter>
  );
}
