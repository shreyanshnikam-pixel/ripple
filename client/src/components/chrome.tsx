import { motion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { scrollToTarget } from '../lib/smooth';
import { prefersReducedMotion } from '../lib/motion';
import { Arrow, RippleMark, useMagnetic } from './ui';

export function Nav() {
  const [solid, setSolid] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  const loc = useLocation();
  const navigate = useNavigate();
  const cta = useMagnetic<HTMLAnchorElement>(0.2);

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const jump = (id: string) => {
    if (loc.pathname !== '/') {
      navigate('/');
      setTimeout(() => scrollToTarget(id), 450);
    } else scrollToTarget(id);
  };

  return (
    <header className={`nav ${solid ? 'nav--solid' : ''}`}>
      <div className="wrap nav__inner">
        <Link to="/" className="brand" aria-label="Ripple home">
          <RippleMark />
          Ripple
        </Link>
        <nav className="nav__links" aria-label="Main">
          <button className="nav__link nav__link--hide" onClick={() => jump('#how')}>
            How it works
          </button>
          <button className="nav__link nav__link--hide" onClick={() => jump('#voices')}>
            Voices
          </button>
          <button className="nav__link nav__link--hide" onClick={() => jump('#principles')}>
            Principles
          </button>
          <NavLink to="/simulate" className="btn btn--sm" ref={cta} style={{ marginLeft: 8 }}>
            Open the simulator <Arrow size={16} />
          </NavLink>
        </nav>
      </div>
      <motion.div className="progress" style={{ scaleX }} />
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <div style={{ display: 'grid', gap: 12 }}>
          <Link to="/" className="brand">
            <RippleMark size={26} />
            Ripple
          </Link>
          <p>
            Built for the 2026 Congressional App Challenge. Ripple is a thinking tool: its reactions are simulated from patterns, not
            collected from real people. Use it to prepare, then go listen to the people your decision affects.
          </p>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <span className="label">Privacy</span>
          <p>No accounts. No tracking. Your recent decisions stay in this browser.</p>
        </div>
      </div>
    </footer>
  );
}

/** A small ring that expands wherever you click. On brand, and never in the way. */
export function ClickRipples() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const on = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const el = document.createElement('span');
      el.className = 'click-ripple';
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 950);
    };
    window.addEventListener('pointerdown', on);
    return () => window.removeEventListener('pointerdown', on);
  }, []);
  return null;
}
