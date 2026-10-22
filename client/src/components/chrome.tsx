import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useT } from '../i18n';
import { prefersReducedMotion } from '../lib/motion';
import { Arrow, RippleMark, useMagnetic } from './ui';

const LINKS = [
  { to: '/bills', label: 'Real bills' },
  { to: '/district', label: 'Your district' },
  { to: '/compare', label: 'Compare' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/about', label: 'About' },
];

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  const loc = useLocation();
  const cta = useMagnetic<HTMLAnchorElement>(0.2);
  const { t, lang, setLang } = useT();

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  // Close the phone menu when the route changes or Escape is pressed.
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`nav ${solid || open ? 'nav--solid' : ''}`}>
      <div className="wrap nav__inner">
        <Link to="/" className="brand" aria-label={t('Ripple home')}>
          <RippleMark />
          Ripple
        </Link>
        <nav className="nav__links" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className="nav__link nav__link--hide">
              {t(l.label)}
            </NavLink>
          ))}
          <NavLink to="/simulate" className="btn btn--sm nav__cta" ref={cta} style={{ marginLeft: 8 }}>
            {t('Open the simulator')} <Arrow size={16} />
          </NavLink>
          <button
            type="button"
            className="nav__lang"
            lang={lang === 'es' ? 'en' : 'es'}
            aria-label={lang === 'es' ? t('Switch to English') : t('Cambiar a español')}
            title={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
          >
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
          <button className="nav__menu" aria-expanded={open} aria-controls="nav-sheet" onClick={() => setOpen((o) => !o)}>
            <span className="sr-only">{open ? t('Close menu') : t('Open menu')}</span>
            <span className={`burger ${open ? 'is-open' : ''}`} aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </nav>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="nav-sheet"
            className="nav__sheet"
            aria-label="Menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="wrap">
              <NavLink to="/simulate" className="nav__sheet-link">
                {t('Open the simulator')}
              </NavLink>
              {LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} className="nav__sheet-link">
                  {t(l.label)}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
      <motion.div className="progress" style={{ scaleX }} />
    </header>
  );
}

export function Footer() {
  const { t } = useT();
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
          <Link to="/" className="brand">
            <RippleMark size={26} />
            Ripple
          </Link>
          <p>
            {t(
              'Built for the 2026 Congressional App Challenge. Ripple is a thinking tool: its reactions are simulated from patterns and published polls, not collected from real people. Use it to prepare, then go listen to the people your decision affects.',
            )}
          </p>
        </div>
        <nav className="footer__col" aria-label={t('Explore')}>
          <span className="label">{t('Explore')}</span>
          <Link to="/simulate">{t('Simulator')}</Link>
          <Link to="/bills">{t('Real bills in Congress')}</Link>
          <Link to="/district">{t('Your district')}</Link>
          <Link to="/compare">{t('Compare two versions')}</Link>
        </nav>
        <nav className="footer__col" aria-label={t('Learn')}>
          <span className="label">{t('Learn')}</span>
          <Link to="/methodology">{t('Methodology & sources')}</Link>
          <Link to="/about">{t('About & privacy')}</Link>
        </nav>
        <div className="footer__col">
          <span className="label">{t('Privacy')}</span>
          <p>{t('No accounts. No tracking. Your recent decisions stay in this browser, and survey answers are anonymous.')}</p>
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
