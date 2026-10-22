import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EXAMPLES } from '../../../shared/examples';
import { Reveal, SplitHeading } from '../components/ui';
import { DecisionBar } from './Hero';
import { prefersReducedMotion } from '../lib/motion';
import { useT } from '../i18n';
import { Emph } from './Emph';

const CASES = [
  {
    who: 'Student councils',
    title: 'Pitch the policy your whole school can live with.',
    body: 'Hear from freshmen, athletes, working students and teachers before you bring a proposal to the principal.',
    example: EXAMPLES[1],
  },
  {
    who: 'City councils & civic groups',
    title: 'Hold the town hall before the town hall.',
    body: 'See which neighbors will show up angry, which will show up grateful, and what would bring the middle along.',
    example: EXAMPLES[4],
  },
  {
    who: 'Families & students',
    title: 'Talk through the big personal choices.',
    body: 'A gap year, a new job, a move. Hear how your parents, friends, mentors and future self might react.',
    example: EXAMPLES[9],
  },
  {
    who: 'Small businesses',
    title: 'Change without losing your regulars.',
    body: 'Test a price change or a new policy on loyal customers, new customers, staff and neighbors first.',
    example: EXAMPLES[11],
  },
];

function TiltCard({ c }: { c: (typeof CASES)[number] }) {
  const ref = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const reduced = prefersReducedMotion();
  const { t } = useT();
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || reduced || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 6}deg) rotateY(${(px - 0.5) * 8}deg) translateY(-4px)`;
    el.style.setProperty('--gx', `${px * 100}%`);
    el.style.setProperty('--gy', `${py * 100}%`);
  };
  const leave = () => {
    if (ref.current) ref.current.style.transform = '';
  };
  return (
    <button
      ref={ref}
      className="case"
      onPointerMove={move}
      onPointerLeave={leave}
      onClick={() => navigate(`/simulate?d=${encodeURIComponent(c.example.text)}&s=${c.example.scope}&run=1`)}
      style={{ transition: 'transform 0.5s cubic-bezier(.22,1,.36,1), border-color .3s', font: 'inherit', color: 'inherit' }}
    >
      <span className="case__glow" />
      <span className="label label--foam">{t(c.who)}</span>
      <h3>{t(c.title)}</h3>
      <p>{t(c.body)}</p>
      <span className="case__decision">
        <span>“{c.example.text}”</span>
        <span className="case__go" aria-hidden="true">
          →
        </span>
      </span>
    </button>
  );
}

export function UseCases() {
  const { t } = useT();
  return (
    <section className="section" aria-labelledby="cases-title">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="label label--foam">{t('Who it’s for')}</span>
          <h2 className="h2" id="cases-title">
            <Emph text={t('Anyone about to make a call that *other people* have to live with.')} />
          </h2>
        </Reveal>
        <div className="cases">
          {CASES.map((c, i) => (
            <Reveal key={c.who} delay={(i % 2) * 0.1}>
              <TiltCard c={c} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const icons = {
  eye: (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 20s6-11 17-11 17 11 17 11-6 11-17 11S3 20 3 20Z" />
      <circle cx="20" cy="20" r="5" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="13" cy="14" r="4" />
      <circle cx="27" cy="14" r="4" />
      <circle cx="20" cy="22" r="4" />
      <path d="M5 33c1-5 4-8 8-8M35 33c-1-5-4-8-8-8M12 36c1-5 4-7 8-7s7 2 8 7" />
    </svg>
  ),
  ear: (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 30c0-4 6-4 6-8M30 10a12 12 0 0 1 2 6" />
      <path d="M12 18a8 8 0 1 1 16 0c0 6-6 7-6 12a4 4 0 0 1-8 0" />
      <circle cx="20" cy="18" r="3" />
    </svg>
  ),
};

export function Principles() {
  const { t } = useT();
  const items = [
    {
      icon: icons.eye,
      title: 'Shows its work',
      body: 'Every report shows its starting point, from a real poll when one exists, and each adjustment for your wording. Estimates are labeled as estimates.',
    },
    {
      icon: icons.people,
      title: 'Diverse by design',
      body: 'Every crowd mixes ages, incomes and roles, including the people who are easiest to forget: working students, renters, retirees on fixed incomes.',
    },
    {
      icon: icons.ear,
      title: 'A rehearsal, not a replacement',
      body: 'Simulated people are a starting point. Every report ends by pointing you to the real people who were most opposed, so you can go listen.',
    },
  ];
  return (
    <section className="section" id="principles" aria-labelledby="principles-title">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="label label--foam">{t('Principles')}</span>
          <h2 className="h2" id="principles-title">
            <Emph text={t('Built to widen the circle of people you *consider*.')} />
          </h2>
        </Reveal>
        <div className="principles">
          {items.map((it, i) => (
            <Reveal className="principle" key={it.title} delay={i * 0.1}>
              {it.icon}
              <h3>{t(it.title)}</h3>
              <p>{t(it.body)}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  const ref = useRef<HTMLElement>(null);
  const { t, lang } = useT();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.4, 1.5]);
  const rot = useTransform(scrollYProgress, [0, 1], [0, 40]);
  return (
    <section className="final" ref={ref} aria-labelledby="final-title">
      <motion.div className="final__rings" style={{ scale, rotate: rot }} aria-hidden="true">
        {[220, 420, 640, 880, 1140, 1420].map((s, i) => (
          <i key={s} style={{ width: s, height: s, opacity: 1 - i * 0.14, borderStyle: i % 2 ? 'dashed' : 'solid' }} />
        ))}
      </motion.div>
      <div className="wrap" style={{ position: 'relative' }}>
        <span className="label label--foam">{t('Your turn')}</span>
        <SplitHeading
          as="h2"
          className="display"
          lines={
            lang === 'es'
              ? [['Antes', 'de', 'decidir,'], [<em key="r">escucha</em>, 'a', 'tu', 'gente.']]
              : [['Before', 'you', 'decide,'], [<em key="r">hear</em>, 'the', 'room.']]
          }
        />
        <DecisionBar id="final-decision" />
      </div>
    </section>
  );
}
