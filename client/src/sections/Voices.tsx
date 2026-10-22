import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PERSONAS, VALUE_LABELS, SCOPE_META } from '../../../shared/personas';
import type { Scope, Value } from '../../../shared/types';
import { Arrow, Avatar, Reveal } from '../components/ui';
import { gsap } from '../lib/smooth';
import { prefersReducedMotion } from '../lib/motion';
import { CrowdCanvas } from '../components/canvas';
import type { SimulationResult } from '../../../shared/types';
import { StanceIcon } from '../components/ui';
import { useT } from '../i18n';
import { Emph } from './Emph';

const PICKS: [Scope, string][] = [
  ['community', 'harold'],
  ['school', 'maya'],
  ['personal', 'future'],
  ['business', 'marcus'],
  ['community', 'darnell'],
  ['school', 'alvarez'],
  ['personal', 'mom'],
  ['community', 'priya'],
];

export function Voices() {
  const pin = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { t } = useT();
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 761px)', () => {
      const t = track.current!;
      const dist = () => Math.max(0, t.scrollWidth - window.innerWidth);
      gsap.to(t, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: { trigger: pin.current, start: 'top top', end: () => `+=${dist()}`, scrub: 0.8, pin: true, invalidateOnRefresh: true, anticipatePin: 1 },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section id="voices" aria-labelledby="voices-title" style={{ paddingTop: 'clamp(60px, 10vw, 140px)' }}>
      <div className="wrap">
        <Reveal className="section-head">
          <span className="label label--foam">{t('The voices')}</span>
          <h2 className="h2" id="voices-title">
            <Emph text={t('32 people who will *never* agree on everything.')} />
          </h2>
          <p className="lead">
            {t(
              'Each voice weighs twelve values differently, from cost and safety to tradition and freedom, and reacts to change at its own pace. Together they make the room you are deciding for.',
            )}
          </p>
        </Reveal>
      </div>
      <div className="voices-pin" ref={pin}>
        <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center' }} className="voices-pin__inner">
          <div className="voices-track" ref={track}>
            {PICKS.map(([scope, id]) => {
              const p = PERSONAS[scope].find((x) => x.id === id)!;
              const top = (Object.entries(p.values) as [Value, number][]).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
              // The persona's name, role and words come from the engine and stay in English.
              const [v] = top[0];
              const line = p.lines[v]?.con ?? '';
              return (
                <article className="voice-card" key={id}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <Avatar initials={p.name.replace(/^(Dr|Mr|Mrs|Ms|Coach|Grandpa)\.?\s+/, '').split(' ').map((w) => w[0]).join('').slice(0, 2)} hue={p.hue} size={56} />
                    <span className="label">{t(SCOPE_META[scope].label)}</span>
                  </div>
                  <div>
                    <h3>
                      {p.name}
                      {p.age ? <span style={{ color: 'var(--fog)', fontSize: '1rem' }}>, {p.age}</span> : null}
                    </h3>
                    <p className="role">{p.role}</p>
                  </div>
                  <blockquote>“{line}”</blockquote>
                  <div className="values" aria-label={t('What this person cares about most')}>
                    {top.map(([val, w]) => (
                      <div className="value-row" key={val}>
                        <span>{t(VALUE_LABELS[val])}</span>
                        <div className="value-bar">
                          <span style={{ width: `${w * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
            <article className="voice-card voice-card--more">
              <span className="label">{t('And 24 more')}</span>
              <h3 style={{ fontSize: '2rem' }}>{t('Your family. Your school. Your town. Your customers.')}</h3>
              <Link to="/simulate" className="btn" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
                {t('Meet them')} <Arrow />
              </Link>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Spread({ demo }: { demo: SimulationResult }) {
  const section = useRef<HTMLElement>(null);
  const step = useRef(0);
  const [shown, setShown] = useState(0);
  const { t } = useT();

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const st = { p: 0 };
      gsap.to(st, {
        p: 1,
        ease: 'none',
        onUpdate: () => {
          step.current = st.p * 3;
          setShown(Math.round(st.p * 3));
        },
        scrollTrigger: { trigger: section.current, start: 'top top', end: '+=1800', scrub: 0.5, pin: true, anticipatePin: 1 },
      });
    });
    return () => mm.revert();
  }, []);

  const go = (i: number) => {
    step.current = i;
    setShown(i);
  };
  const now = demo.timeline[shown];

  return (
    <section className="spread" ref={section} aria-labelledby="spread-title">
      <div className="wrap spread__grid">
        <div>
          <span className="label label--foam">{t('Watch it ripple')}</span>
          <h2 className="h2" id="spread-title" style={{ marginTop: 16 }}>
            <Emph text={t('One decision. *One year.* A thousand minds.')} />
          </h2>
          <p className="lead" style={{ marginTop: 18 }}>
            “{demo.decision}.” {t('Scroll to move through time. Every dot is a simulated person, and every person listens to their neighbors.')}
          </p>
          <div className="spread__steps" role="group" aria-label={t('Moment in time')}>
            {demo.timeline.map((p, i) => (
              <button key={p.label} className={i === shown ? 'is-on' : ''} onClick={() => go(i)} aria-pressed={i === shown}>
                {t(p.label)}
                <small>{t(p.sublabel)}</small>
              </button>
            ))}
          </div>
          <div className="spread__counts" aria-live="polite">
            <div className="count">
              <span className="key">
                <i style={{ background: 'var(--support)' }} /> {t('For')}
              </span>
              <b className="num">{now.support}%</b>
            </div>
            <div className="count">
              <span className="key">
                <i style={{ background: 'var(--neutral)' }} /> {t('Undecided')}
              </span>
              <b className="num">{now.neutral}%</b>
            </div>
            <div className="count">
              <span className="key">
                <i style={{ background: 'var(--oppose)' }} /> {t('Against')}
              </span>
              <b className="num">{now.oppose}%</b>
            </div>
          </div>
          <p style={{ marginTop: 22, color: 'var(--mist)', fontSize: 'var(--fs-small)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 12, color: 'var(--support)', display: 'inline-flex' }}>
              <StanceIcon side="support" />
            </span>
            {demo.summary.trajectory}
          </p>
        </div>
        <div className="spread__canvas">
          <CrowdCanvas agents={demo.crowd} personas={demo.personas} stepRef={step} label={t('Simulated crowd at {moment}: {support}% for, {oppose}% against', { moment: t(now.label), support: now.support, oppose: now.oppose })} />
        </div>
      </div>
    </section>
  );
}
