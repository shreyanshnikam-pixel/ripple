import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SimulationResult } from '../../../shared/types';
import { CrowdCanvas } from '../components/canvas';
import { Avatar, Reveal } from '../components/ui';
import { ScrollTrigger } from '../lib/smooth';
import { prefersReducedMotion } from '../lib/motion';
import { useT } from '../i18n';
import { Emph } from './Emph';

const STEPS = [
  {
    title: 'Describe the decision',
    body: 'Write it the way you would say it out loud. Ripple reads the topics, who it touches, and anything you have already done to soften it, like a pilot or an opt-out.',
  },
  {
    title: 'Meet the people it affects',
    body: 'Ripple picks the right room for the decision: your family for a personal choice, students and teachers for a school policy, residents for a city plan, customers and staff for a business.',
  },
  {
    title: 'Watch opinion spread',
    body: '1,000 simulated people react, talk to their neighbors, and adjust over a year. Some groups dig in. Others come around once the change becomes routine.',
  },
  {
    title: 'Find the version people can live with',
    body: 'See who is for it, who is against it and why, then try fixes like a pilot program or a cost cap and watch the projected support change.',
  },
];

const MOCK_TAGS = ['Rules & restrictions', 'Phones & screens', 'School life'];

function TypingMock() {
  const { t } = useT();
  // An example decision, as typed into the engine: it stays in English.
  const text = 'Ban phones during the school day';
  const [n, setN] = useState(prefersReducedMotion() ? text.length : 0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setInterval(() => setN((x) => (x >= text.length ? x : x + 1)), 55);
    return () => clearInterval(id);
  }, []);
  const done = n >= text.length;
  return (
    <div className="mock-input">
      <span className="label">{t('Your decision')}</span>
      <div className="mock-input__box">
        {text.slice(0, n)}
        <span className="caret" />
      </div>
      <div className="mock-tags">
        {MOCK_TAGS.map((tag, i) => (
          <motion.span key={tag} className="tag tag--foam" initial={{ opacity: 0, y: 8 }} animate={done ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.15 }}>
            {t(tag)}
          </motion.span>
        ))}
        <motion.span className="tag" initial={{ opacity: 0 }} animate={done ? { opacity: 1 } : {}} transition={{ delay: 0.5 }}>
          {t('Setting: School')}
        </motion.span>
      </div>
    </div>
  );
}

function VoiceRing({ demo }: { demo: SimulationResult }) {
  const { t } = useT();
  return (
    <div className="ring-of-voices">
      <div className="center">
        <span>
          <b style={{ display: 'block', color: 'var(--paper)', fontSize: '1.1rem' }}>{t('{n} voices', { n: demo.personas.length })}</b>
          {t('{n} people', { n: demo.crowdSize.toLocaleString() })}
        </span>
      </div>
      {demo.personas.map((p, i) => {
        const a = (i / demo.personas.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <motion.div
            key={p.id}
            className="voice"
            style={{ left: `${50 + Math.cos(a) * 40}%`, top: `${50 + Math.sin(a) * 40}%` }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 220, damping: 18 }}
            title={`${p.name}, ${p.role}`}
          >
            <Avatar initials={p.initials} hue={p.hue} size={undefined} />
          </motion.div>
        );
      })}
    </div>
  );
}

function SpreadMock({ demo }: { demo: SimulationResult }) {
  const { t } = useT();
  const step = useRef(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      step.current = 3;
      return;
    }
    let s = 0;
    const id = setInterval(() => {
      s = (s + 1) % 5;
      step.current = Math.min(3, s);
    }, 1100);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ position: 'relative', width: '86%', aspectRatio: '1' }}>
      <CrowdCanvas agents={demo.crowd} personas={demo.personas} stepRef={step} label={t('A simulated crowd changing its opinion over a year')} interactive={false} />
    </div>
  );
}

function ReportMock({ demo }: { demo: SimulationResult }) {
  const fix = demo.recommendations[0];
  const { t } = useT();
  return (
    <div className="mini-report">
      <span className="label">{t('Who’s for it, by group')}</span>
      {demo.groups.slice(0, 5).map((g, i) => (
        <div className="row" key={g.personaId}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.group}</span>
          <div style={{ display: 'flex', gap: 2, height: 10 }}>
            <motion.div style={{ background: 'var(--support)', borderRadius: '4px 0 0 4px' }} initial={{ width: 0 }} animate={{ width: `${g.support}%` }} transition={{ delay: 0.1 + i * 0.08, duration: 0.8 }} />
            <motion.div style={{ background: 'var(--neutral)' }} initial={{ width: 0 }} animate={{ width: `${g.neutral}%` }} transition={{ delay: 0.2 + i * 0.08, duration: 0.8 }} />
            <motion.div style={{ background: 'var(--oppose)', borderRadius: '0 4px 4px 0' }} initial={{ width: 0 }} animate={{ width: `${g.oppose}%` }} transition={{ delay: 0.3 + i * 0.08, duration: 0.8 }} />
          </div>
          <span className="num mono" style={{ textAlign: 'right' }}>
            {g.net > 0 ? '+' : ''}
            {g.net}
          </span>
        </div>
      ))}
      {fix && (
        <motion.div className="tag tag--foam" style={{ justifySelf: 'start', marginTop: 8, fontSize: '0.8rem', padding: '8px 14px' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          {t('Try “{fix}” → +{lift} pts projected', { fix: fix.title, lift: fix.projectedLift })}
        </motion.div>
      )}
    </div>
  );
}

export function HowItWorks({ demo }: { demo: SimulationResult }) {
  const [active, setActive] = useState(0);
  const { t } = useT();
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const triggers = refs.current.map((el, i) =>
      el
        ? ScrollTrigger.create({
            trigger: el,
            start: 'top 55%',
            end: 'bottom 55%',
            onToggle: (self) => self.isActive && setActive(i),
          })
        : null,
    );
    return () => triggers.forEach((t) => t?.kill());
  }, []);

  const visual = (i: number) =>
    i === 0 ? <TypingMock /> : i === 1 ? <VoiceRing demo={demo} /> : i === 2 ? <SpreadMock demo={demo} /> : <ReportMock demo={demo} />;

  return (
    <section className="section" id="how" aria-labelledby="how-title">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="label label--foam">{t('How it works')}</span>
          <h2 className="h2" id="how-title">
            <Emph text={t('A rehearsal for the *room* you are about to walk into.')} />
          </h2>
        </Reveal>
        <div className="how">
          <div className="how__steps">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                ref={(el) => (refs.current[i] = el)}
                className={`how__step ${active === i ? 'is-active' : ''}`}
                style={{ minHeight: 'clamp(220px, 46vh, 420px)' }}
              >
                <span className="label">{t('Step {n}', { n: i + 1 })}</span>
                <h3>{t(s.title)}</h3>
                <p>{t(s.body)}</p>
                <div className="how__mobile-visual">
                  <div className="how__stage-inner">{visual(i)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="how__stage" aria-hidden="true">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                className="how__stage-inner"
                initial={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.03, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {visual(active)}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
