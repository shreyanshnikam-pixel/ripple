import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ClickRipples, Footer, Nav } from './components/chrome';
import { resetScroll, startSmoothScroll } from './lib/smooth';
import Landing from './pages/Landing';
import Simulator from './pages/Simulator';
import NotFound from './pages/NotFound';

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
  // The hosted demo runs inside a sandboxed frame, so it keeps routes in memory.
  const Router = __DEMO_BUILD__ ? MemoryRouter : BrowserRouter;
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Shell />
    </Router>
  );
}
