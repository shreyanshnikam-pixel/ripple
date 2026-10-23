import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EXAMPLES } from '../../../shared/examples';
import type { SimulationResult } from '../../../shared/types';
import { RippleField } from '../components/canvas';
import { Arrow, Avatar, SplitHeading, StanceIcon, stanceSide, useMagnetic } from '../components/ui';
import { useReducedMotion } from '../lib/motion';
import { useT } from '../i18n';

const HERO = [EXAMPLES[1], EXAMPLES[4], EXAMPLES[8], EXAMPLES[11], EXAMPLES[2]];
const HERO_EXAMPLES = { en: HERO.map((e) => e.text), es: HERO.map((e) => e.es) };

function useTypewriter(texts: string[], enabled: boolean) {
  const [out, setOut] = useState(texts[0]);
  useEffect(() => {
    if (!enabled) return;
    let i = 0;
    let n = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = texts[i];
      if (!deleting) {
        n++;
        setOut(t.slice(0, n));
        if (n >= t.length) {
          deleting = true;
          timer = setTimeout(tick, 2200);
          return;
        }
        timer = setTimeout(tick, 34 + Math.random() * 40);
      } else {
        n -= 2;
        setOut(t.slice(0, Math.max(0, n)));
        if (n <= 0) {
          deleting = false;
          i = (i + 1) % texts.length;
          timer = setTimeout(tick, 400);
          return;
        }
        timer = setTimeout(tick, 18);
      }
    };
    timer = setTimeout(tick, 1200);
    return () => clearTimeout(timer);
  }, [texts, enabled]);
  return out;
}

export function DecisionBar({ id, autoFocus = false }: { id: string; autoFocus?: boolean }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const btn = useMagnetic<HTMLButtonElement>(0.15);
  const { t, lang } = useT();
  const examples = HERO_EXAMPLES[lang === 'es' ? 'es' : 'en'];
  const typed = useTypewriter(examples, !reduced && !focused && !value);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = value.trim() || examples[0];
    navigate(`/simulate?d=${encodeURIComponent(text)}&run=1`);
  };
  return (
    <form className="composer-mini" onSubmit={submit} role="search">
      <label htmlFor={id} className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {t('Describe a decision')}
      </label>
      <input
        id={id}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? t('What are you deciding?') : typed}
        autoComplete="off"
        maxLength={500}
      />
      <button className="btn" type="submit" ref={btn}>
        {t('Simulate reactions')} <Arrow />
      </button>
    </form>
  );
}

export function Hero({ demo }: { demo: SimulationResult }) {
  const ref = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { t, lang } = useT();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const contentO = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -220]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -300]);

  const sorted = [...demo.personas].sort((a, b) => b.score - a.score);
  const bubbles = [sorted[0], sorted[sorted.length - 1], sorted[1], sorted[sorted.length - 2]];
  const firstSentence = (q: string) => (q.match(/^.*?[.!?](?=\s+[A-Z“"]|$)/)?.[0] ?? q).trim();
  const spots = [
    { left: '2.5%', top: '22%', y: y1, delay: 1.4 },
    { right: '2.5%', top: '28%', y: y2, delay: 1.7 },
    { left: '3%', bottom: '9%', y: y2, delay: 2.0 },
    { right: '2.5%', bottom: '13%', y: y3, delay: 2.3 },
  ];

  return (
    <section className="hero" ref={ref} aria-labelledby="hero-title">
      <RippleField className="hero__canvas" />
      <div className="hero__veil" />
      <div className="hero__bubbles" aria-hidden="true">
        {bubbles.map((p, i) => {
          const { y, delay, ...pos } = spots[i];
          return (
            <motion.div
              key={p.id}
              className="bubble"
              style={{ ...pos, y }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <Avatar initials={p.initials} hue={p.hue} stance={p.stance} size={34} />
              <div>
                <strong>
                  {p.name}, {p.role.toLowerCase()}{' '}
                  <span style={{ color: stanceSide(p.stance) === 'support' ? 'var(--support)' : stanceSide(p.stance) === 'oppose' ? 'var(--oppose)' : 'var(--neutral)', display: 'inline-block', width: 10, verticalAlign: 'middle' }}>
                    <StanceIcon side={stanceSide(p.stance)} />
                  </span>
                </strong>
                “{firstSentence(p.quote)}”
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div className="wrap hero__content" style={{ y: contentY, opacity: contentO }}>
        <motion.span className="label label--foam" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {t('A decision simulator for students, communities & leaders')}
        </motion.span>
        <SplitHeading
          as="h1"
          immediate
          className="display"
          lines={lang === 'es' ? [['Cada', 'decisión'], ['genera', <em key="w">ondas.</em>]] : [['Every', 'decision'], ['makes', <em key="w">waves.</em>]]}
        />
        <motion.p className="lead" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.8 }}>
          {t(
            'Type a decision you’re weighing. Ripple builds a crowd of 1,000 simulated people, from parents and students to shop owners and retirees, and shows how they’ll react, argue, and change their minds before you commit.',
          )}
        </motion.p>
        <motion.div style={{ width: '100%', display: 'grid', justifyItems: 'center', gap: 18 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95, duration: 0.8 }}>
          <DecisionBar id="hero-decision" />
          <div className="hero__examples">
            {[EXAMPLES[0], EXAMPLES[9], EXAMPLES[12]].map((e) => ({ ...e, text: lang === 'es' ? e.es : e.text })).map((e) => (
              <button key={e.text} className="chip" onClick={() => navigate(`/simulate?d=${encodeURIComponent(e.text)}&s=${e.scope}&run=1`)}>
                <span className="label" style={{ fontSize: '0.66rem' }}>
                  {t(e.tag)}
                </span>
                {e.text}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
      <div className="scroll-cue" aria-hidden="true">
        <span className="label">{t('Scroll')}</span>
        <span />
      </div>
    </section>
  );
}
