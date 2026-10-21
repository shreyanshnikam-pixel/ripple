import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ClickRipples, Footer, Nav } from './components/chrome';
import { resetScroll, startSmoothScroll } from './lib/smooth';
import { ROUTER_BASENAME, USE_MEMORY_ROUTER } from './lib/config';
import Landing from './pages/Landing';
import Simulator from './pages/Simulator';
import NotFound from './pages/NotFound';
import Methodology from './pages/Methodology';
import About from './pages/About';
import District from './pages/District';
import Bills from './pages/Bills';
import Compare from './pages/Compare';

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      id="main"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.3 } }}
    >
      {children}
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
        <Route path="*" element={<Page><NotFound /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}

function Shell() {
  useEffect(() => startSmoothScroll(), []);
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
