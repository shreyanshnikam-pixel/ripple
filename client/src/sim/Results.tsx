import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SCOPE_META, VALUE_LABELS } from '../../../shared/personas';
import type { PersonaReaction, Recommendation, SimulationResult, Value } from '../../../shared/types';
import { CrowdCanvas } from '../components/canvas';
import { Arrow, Avatar, Counter, Reveal, StanceIcon, StancePill, stanceSide } from '../components/ui';
import { useReducedMotion } from '../lib/motion';
import { useT } from '../i18n';
import type { Source } from '../lib/api';

const sideColor = (side: 'support' | 'neutral' | 'oppose') => (side === 'support' ? 'var(--support)' : side === 'oppose' ? 'var(--oppose)' : 'var(--neutral)');
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

export function Block({ id, eyebrow, title, intro, aside, children }: { id: string; eyebrow: string; title: ReactNode; intro?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="block" id={id} aria-labelledby={`${id}-title`}>
      <Reveal className="block__head">
        <div>
          <span className="label label--foam">{eyebrow}</span>
          <h2 className="h2" id={`${id}-title`}>
            {title}
          </h2>
          {intro && <p className="lead" style={{ fontSize: '1.02rem' }}>{intro}</p>}
        </div>
        {aside}
      </Reveal>
      {children}
    </section>
  );
}

function Legend() {
  const { t } = useT();
  return (
    <div className="legend">
      {(['support', 'neutral', 'oppose'] as const).map((s) => (
        <span className="key" key={s}>
          <i style={{ background: sideColor(s) }} />
          {s === 'support' ? t('For') : s === 'neutral' ? t('Undecided') : t('Against')}
        </span>
      ))}
    </div>
  );
}

// ───────── verdict ─────────
export function Verdict({ r, source, district }: { r: SimulationResult; source: Source; district?: string | null }) {
  const { t } = useT();
  const s = r.summary;
  const meta = SCOPE_META[r.scope];
  return (
    <div className="verdict">
      <Reveal className="panel verdict__main">
        <span className="label">
          {t('Simulated reaction')} · {t(meta.label)} · {r.crowdSize.toLocaleString()} {r.scope === 'personal' ? t('simulated reactions') : t(meta.crowdNoun)}
          {district ? ` · ${t('{district} population', { district })}` : ''}
        </span>
        <p className="verdict__decision">“{r.decision}”</p>
        <h2 className="verdict__word">{t(s.verdict)}.</h2>
        <p className="lead" style={{ color: 'var(--paper)' }}>
          {s.headline}
        </p>
        <p style={{ color: 'var(--mist)' }}>{s.trajectory}</p>
        <p className="source-note">
          <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--foam)', display: 'inline-block' }} />
          {source === 'api' ? t('Simulated on the Ripple server') : t('Simulated right here in your browser')} · {t('engine {engine}', { engine: r.engine })} · {t('same question, same answer')}
        </p>
      </Reveal>
      <Reveal className="panel verdict__side" delay={0.1}>
        <div>
          <span className="label">{t('Net support on day 1')}</span>
          <div className="net">
            <b>
              <Counter value={s.net} signed />
            </b>
            <span style={{ color: 'var(--mist)' }}>
              {t('points')}
              <br />
              <span className="num">±{s.marginOfError}</span> {t('sim. margin')}
            </span>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="stack" role="img" aria-label={t('{support}% for, {neutral}% undecided, {oppose}% against', { support: s.support, neutral: s.neutral, oppose: s.oppose })}>
            {(
              [
                ['support', s.support],
                ['neutral', s.neutral],
                ['oppose', s.oppose],
              ] as const
            ).map(([k, v], i) => (
              <motion.div key={k} style={{ background: sideColor(k) }} initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 + i * 0.12, ease: [0.22, 1, 0.36, 1] }} />
            ))}
          </div>
          <div className="legend">
            <span className="key">
              <i style={{ background: 'var(--support)' }} /> {t('For')} <b className="num" style={{ color: 'var(--paper)' }}>{s.support}%</b>
            </span>
            <span className="key">
              <i style={{ background: 'var(--neutral)' }} /> {t('Undecided')} <b className="num" style={{ color: 'var(--paper)' }}>{s.neutral}%</b>
            </span>
            <span className="key">
              <i style={{ background: 'var(--oppose)' }} /> {t('Against')} <b className="num" style={{ color: 'var(--paper)' }}>{s.oppose}%</b>
            </span>
          </div>
        </div>
        <div className="metrics">
          <div className="metric">
            <span className="label">{t('After a year')}</span>
            <b className="num">{t('{n} net', { n: signed(s.longTermNet) })}</b>
          </div>
          <div className="metric">
            <span className="label">{t('Polarization')}</span>
            <b className="num">{Math.round(s.polarization * 100)} / 100</b>
          </div>
          <div className="metric">
            <span className="label">{t('Backlash risk')}</span>
            <b>{t(s.backlashRisk)}</b>
          </div>
          <div className="metric">
            <span className="label">{t('Read confidence')}</span>
            <b>{t(s.confidence)}</b>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

// ───────── crowd ─────────
export function CrowdPanel({ r }: { r: SimulationResult }) {
  const { t } = useT();
  const step = useRef(0);
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });

  useEffect(() => {
    step.current = 0;
    setShown(0);
  }, [r.id]);

  useEffect(() => {
    if (inView && !reduced) setPlaying(true);
  }, [inView, reduced]);

  useEffect(() => {
    if (!playing) return;
    let i = shown >= 3 ? 0 : shown;
    step.current = i;
    setShown(i);
    const id = setInterval(() => {
      i++;
      if (i > 3) {
        setPlaying(false);
        clearInterval(id);
        return;
      }
      step.current = i;
      setShown(i);
    }, 1500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const go = (i: number) => {
    setPlaying(false);
    step.current = i;
    setShown(i);
  };
  const now = r.timeline[shown];
  const groupsByNet = r.groups.map((g, i) => ({ ...g, i })).sort((a, b) => b.net - a.net);

  return (
    <div className="crowd" ref={ref}>
      <div className="panel" style={{ padding: 12 }}>
        <div className="crowd__canvas">
          <CrowdCanvas
            agents={r.crowd}
            personas={r.personas}
            stepRef={step}
            highlight={highlight}
            label={t('Simulated crowd of {n} at {moment}: {support}% for, {neutral}% undecided, {oppose}% against', { n: r.crowdSize, moment: t(now.label), support: now.support, neutral: now.neutral, oppose: now.oppose })}
          />
        </div>
      </div>
      <div className="crowd__side">
        <div className="panel scrubber">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span className="label">{t('Moment in time')}</span>
            <button className="btn btn--ghost btn--sm" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
              {playing ? t('Pause') : t('Play the year')}
            </button>
          </div>
          <div className="scrubber__track" role="group" aria-label={t('Moment in time')}>
            {r.timeline.map((p, i) => (
              <button key={p.label} className={i === shown ? 'is-on' : ''} onClick={() => go(i)} aria-pressed={i === shown}>
                {t(p.label)}
                <small>{t(p.sublabel)}</small>
              </button>
            ))}
          </div>
          <div className="spread__counts" style={{ marginTop: 6 }} aria-live="polite">
            {(
              [
                ['support', 'For', now.support],
                ['neutral', 'Undecided', now.neutral],
                ['oppose', 'Against', now.oppose],
              ] as const
            ).map(([k, l, v]) => (
              <div className="count" key={k}>
                <span className="key">
                  <i style={{ background: sideColor(k) }} /> {t(l)}
                </span>
                <b className="num">{v}%</b>
              </div>
            ))}
          </div>
        </div>
        <div className="panel" style={{ display: 'grid', gap: 10 }}>
          <span className="label">{t('Highlight a group')}</span>
          <div className="group-list">
            {groupsByNet.map((g) => (
              <button
                key={g.personaId}
                className={highlight === g.i ? 'is-on' : ''}
                onMouseEnter={() => setHighlight(g.i)}
                onMouseLeave={() => setHighlight(null)}
                onFocus={() => setHighlight(g.i)}
                onBlur={() => setHighlight(null)}
              >
                <i style={{ background: g.net > 15 ? 'var(--support)' : g.net < -15 ? 'var(--oppose)' : 'var(--neutral)' }} />
                <span>{g.group}</span>
                <span className="num mono" style={{ fontSize: '0.8rem' }}>
                  {signed(g.net)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── voices ─────────
function PersonaCard({ p, i }: { p: PersonaReaction; i: number }) {
  const { t } = useT();
  const side = stanceSide(p.stance);
  const pct = Math.round(Math.abs(p.score) * 100);
  return (
    <Reveal as="article" className="persona" delay={(i % 3) * 0.06}>
      <div className="persona__top">
        <Avatar initials={p.initials} hue={p.hue} stance={p.stance} />
        <div style={{ minWidth: 0 }}>
          <div className="persona__name">
            {p.name}
            {p.age ? <span style={{ color: 'var(--fog)', fontWeight: 400 }}>, {p.age}</span> : null}
          </div>
          <div className="persona__role">{p.role}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <StancePill stance={p.stance} />
        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--fog)' }}>
          {t('{n}% of crowd', { n: Math.round(p.share * 100) })}
        </span>
      </div>
      <div className="lean" role="img" aria-label={side === 'oppose' ? t('Lean: {pct} out of 100 against', { pct }) : side === 'support' ? t('Lean: {pct} out of 100 for', { pct }) : t('Lean: {pct} out of 100 undecided', { pct })}>
        <span>{p.score < 0 && <i style={{ right: 0, width: `${pct}%`, background: 'var(--oppose)', borderRadius: '4px 0 0 4px' }} />}</span>
        <span>{p.score > 0 && <i style={{ left: 0, width: `${pct}%`, background: 'var(--support)', borderRadius: '0 4px 4px 0' }} />}</span>
      </div>
      <blockquote>“{p.quote}”</blockquote>
      <div className="persona__meta">
        <span>
          {t('Moved most by')} <b>{t(p.concern.label)}</b>
        </span>
        <span>
          {p.changeMindType === 'win' ? t('Would come around with:') : t('Would turn against it if:')}{' '}
          <b style={{ fontWeight: 500 }}>{p.changeMind}</b>
        </span>
      </div>
    </Reveal>
  );
}

export function VoicesBlock({ r }: { r: SimulationResult }) {
  const { t } = useT();
  const [filter, setFilter] = useState<'all' | 'support' | 'neutral' | 'oppose'>('all');
  const list = useMemo(() => [...r.personas].sort((a, b) => b.score - a.score).filter((p) => filter === 'all' || stanceSide(p.stance) === filter), [r, filter]);
  const counts = { support: 0, neutral: 0, oppose: 0 };
  r.personas.forEach((p) => counts[stanceSide(p.stance)]++);
  return (
    <>
      <div className="filters" role="group" aria-label={t('Filter voices')}>
        {(
          [
            ['all', t('All {n}', { n: r.personas.length })],
            ['support', `${t('For')} · ${counts.support}`],
            ['neutral', `${t('Undecided')} · ${counts.neutral}`],
            ['oppose', `${t('Against')} · ${counts.oppose}`],
          ] as const
        ).map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k !== 'all' && (
              <span style={{ width: 10, display: 'inline-flex', color: filter === k ? 'inherit' : sideColor(k) }}>
                <StanceIcon side={k} />
              </span>
            )}
            {l}
          </button>
        ))}
      </div>
      <motion.div className="persona-grid" layout>
        <AnimatePresence mode="popLayout">
          {list.map((p, i) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.35 }} style={{ display: 'grid' }}>
              <PersonaCard p={p} i={i} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {list.length === 0 && <p style={{ color: 'var(--mist)' }}>{t('No one landed in this group for this decision.')}</p>}
    </>
  );
}

// ───────── crosstabs ─────────
export function Crosstabs({ r }: { r: SimulationResult }) {
  const { t } = useT();
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const rows = [...r.groups].sort((a, b) => b.net - a.net);
  return (
    <div className="panel" style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Legend />
        <button className="linkish" onClick={() => setTable((on) => !on)}>
          {table ? t('Show as chart') : t('Show as table')}
        </button>
      </div>
      {table ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('Group')}</th>
                <th style={{ textAlign: 'right' }}>{t('For')}</th>
                <th style={{ textAlign: 'right' }}>{t('Undecided')}</th>
                <th style={{ textAlign: 'right' }}>{t('Against')}</th>
                <th style={{ textAlign: 'right' }}>{t('Net')}</th>
                <th style={{ textAlign: 'right' }}>{t('People')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.personaId}>
                  <td>{g.group}</td>
                  <td className="n">{g.support}%</td>
                  <td className="n">{g.neutral}%</td>
                  <td className="n">{g.oppose}%</td>
                  <td className="n">{signed(g.net)}</td>
                  <td className="n">{g.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="xtab" role="img" aria-label={t('Diverging bar chart of support and opposition by group. Use “Show as table” for exact numbers.')}>
          {rows.map((g, i) => (
            <div className="xtab__row" key={g.personaId} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.group}</span>
              <div className="xtab__bars">
                <div className="xtab__half xtab__half--left">
                  <motion.div style={{ background: 'var(--oppose)', borderRadius: '4px 0 0 4px' }} initial={{ width: 0 }} whileInView={{ width: `${g.oppose}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }} />
                  <motion.div style={{ background: 'var(--neutral)' }} initial={{ width: 0 }} whileInView={{ width: `${g.neutral / 2}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.05 }} />
                </div>
                <div className="xtab__half">
                  <motion.div style={{ background: 'var(--neutral)' }} initial={{ width: 0 }} whileInView={{ width: `${g.neutral / 2}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.05 }} />
                  <motion.div style={{ background: 'var(--support)', borderRadius: '0 4px 4px 0' }} initial={{ width: 0 }} whileInView={{ width: `${g.support}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }} />
                </div>
              </div>
              <span className="net-val num">{signed(g.net)}</span>
              {hover === i && (
                <span className="tooltip" style={{ left: '50%', top: 0 }}>
                  {g.group}
                  <small>
                    {t('{support}% for · {neutral}% undecided · {oppose}% against', { support: g.support, neutral: g.neutral, oppose: g.oppose })}
                  </small>
                </span>
              )}
            </div>
          ))}
          <div className="xtab__axis" aria-hidden="true">
            <span />
            <div>
              <span>{t('100% against')}</span>
              <span>0</span>
              <span>{t('100% for')}</span>
            </div>
            <span style={{ textAlign: 'right' }}>{t('Net')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── timeline chart ─────────
export function TimelineChart({ r }: { r: SimulationResult }) {
  const { t } = useT();
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = 280;
  const m = { l: 40, r: 104, t: 18, b: 40 };
  const x = (i: number) => m.l + (i / (r.timeline.length - 1)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - v / 100) * (H - m.t - m.b);
  const series = [
    { key: 'support' as const, label: 'For', color: 'var(--support)' },
    { key: 'neutral' as const, label: 'Undecided', color: 'var(--neutral)' },
    { key: 'oppose' as const, label: 'Against', color: 'var(--oppose)' },
  ];
  const last = r.timeline.length - 1;
  // keep end labels from colliding
  const ends = series.map((s) => ({ ...s, v: r.timeline[last][s.key], y: y(r.timeline[last][s.key]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;

  return (
    <div className="panel" style={{ display: 'grid', gap: 14 }}>
      <Legend />
      <div className="chart" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={r.timeline.map((p) => t('{moment}: {support}% for, {oppose}% against', { moment: t(p.label), support: p.support, oppose: p.oppose })).join('; ')}>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
              <text x={m.l - 8} y={y(v) + 4} textAnchor="end">
                {v}%
              </text>
            </g>
          ))}
          {r.timeline.map((p, i) => (
            <text key={p.label} x={x(i)} y={H - 14} textAnchor="middle">
              {t(p.label)}
            </text>
          ))}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={H - m.b} stroke="var(--mist)" strokeWidth="1" />}
          {series.map((s, si) => {
            const d = r.timeline.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[s.key])}`).join(' ');
            return (
              <motion.path
                key={s.key}
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, delay: si * 0.15, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
          {series.map((s) =>
            r.timeline.map((p, i) =>
              i === last || i === hover ? <circle key={s.key + i} cx={x(i)} cy={y(p[s.key])} r="4.5" fill={s.color} stroke="var(--surface)" strokeWidth="2" /> : null,
            ),
          )}
          {ends.map((e) => (
            <g key={e.key}>
              <line x1={x(last) + 10} x2={x(last) + 22} y1={e.y} y2={e.y} stroke={e.color} strokeWidth="2" strokeLinecap="round" />
              <text x={x(last) + 28} y={e.y + 4} style={{ fill: 'var(--paper)' }}>
                {t(e.label)} {e.v}%
              </text>
            </g>
          ))}
          {r.timeline.map((_, i) => (
            <rect key={i} x={x(i) - (W - m.l - m.r) / 6} y={m.t} width={(W - m.l - m.r) / 3} height={H - m.t - m.b} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
        {hover != null && (
          <div className="tooltip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(m.t / H) * 100}%`, transform: 'translate(-50%, -30%)' }}>
            {t(r.timeline[hover].label)} · {t(r.timeline[hover].sublabel)}
            <small>
              {t('{support}% for · {neutral}% undecided · {oppose}% against', { support: r.timeline[hover].support, neutral: r.timeline[hover].neutral, oppose: r.timeline[hover].oppose })}
            </small>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────── themes ─────────
export function Themes({ r }: { r: SimulationResult }) {
  const { t } = useT();
  return (
    <div className="panel theme-list">
      <span className="label">{t('What people are talking about')}</span>
      {r.themes.length === 0 && <p style={{ color: 'var(--mist)' }}>{t('No strong themes yet. Add more detail to your decision.')}</p>}
      {r.themes.map((th, i) => {
        const side = th.sentiment > 0.2 ? 'support' : th.sentiment < -0.2 ? 'oppose' : 'neutral';
        return (
          <div className="theme" key={th.value}>
            <div className="theme__top">
              <span>{t(th.label)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, display: 'inline-flex', color: sideColor(side) }}>
                  <StanceIcon side={side} />
                </span>
                {side === 'support' ? t('Pulls people toward yes') : side === 'oppose' ? t('Pulls people toward no') : t('Cuts both ways')}
              </span>
            </div>
            <div style={{ background: 'var(--line-soft)', borderRadius: '0 4px 4px 0' }}>
              <motion.div className="theme__bar" style={{ background: sideColor(side) }} initial={{ width: 0 }} whileInView={{ width: `${Math.max(4, th.weight * 100)}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────── town hall ─────────
export function TownHall({ r }: { r: SimulationResult }) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const reduced = useReducedMotion();
  const [count, setCount] = useState(reduced ? r.townHall.length : 0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduced) {
      setCount(r.townHall.length);
      return;
    }
    if (!inView) return;
    setCount(0);
    let n = 0;
    const id = setInterval(() => {
      n++;
      setCount(n);
      if (n >= r.townHall.length) clearInterval(id);
    }, 1100);
    return () => clearInterval(id);
  }, [inView, r.id, run, reduced, r.townHall.length]);

  const shown = r.townHall.slice(0, count);
  const typing = count < r.townHall.length && (inView || count > 0);

  return (
    <div ref={ref} style={{ display: 'grid', gap: 18 }}>
      <div className="hall" aria-live="polite">
        <AnimatePresence initial={false}>
          {shown.map((m, i) => {
            const mod = m.stance === 'moderator';
            return (
              <motion.div key={i} className={`msg ${mod ? 'msg--mod' : ''}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                {mod ? (
                  <span className="avatar mod-badge" style={{ width: 44, height: 44 }}>
                    {m.initials}
                  </span>
                ) : (
                  <Avatar initials={m.initials} hue={m.hue} stance={m.stance as PersonaReaction['stance']} size={44} />
                )}
                <div className="msg__bubble">
                  <div className="msg__who">
                    <b>{m.name}</b>
                    <span>{m.role}</span>
                    {!mod && <StancePill stance={m.stance as PersonaReaction['stance']} />}
                  </div>
                  {m.replyTo && <span className="msg__reply">↳ {t('replying to {name}', { name: m.replyTo })}</span>}
                  <p>{m.text}</p>
                  {!mod && m.agrees > 0 && (
                    <span className="msg__agree">
                      ▲ {m.agrees.toLocaleString()} {r.scope === 'personal' ? t('nods around the table') : t('people agree')}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {typing && (
          <div className="msg">
            <span />
            <span className="typing" aria-label={t('Someone is typing')}>
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>
      {count >= r.townHall.length && !reduced && (
        <button className="btn btn--ghost btn--sm" style={{ justifySelf: 'start' }} onClick={() => setRun((x) => x + 1)}>
          {t('Replay the conversation')}
        </button>
      )}
    </div>
  );
}

// ───────── fixes ─────────
export function Fixes({ r, onApply, busy }: { r: SimulationResult; onApply: (rec: Recommendation) => void; busy: boolean }) {
  const { t } = useT();
  if (!r.recommendations.length) return <p style={{ color: 'var(--mist)' }}>{t('Your decision already includes the usual fixes. Nice work.')}</p>;
  return (
    <div className="fixes">
      {r.recommendations.map((rec, i) => (
        <Reveal key={rec.id} className={`fix ${rec.replace ? 'fix--alt' : ''}`} delay={i * 0.08}>
          <span className="label">{rec.replace ? t('A narrower version') : `${t('Wins over')} · ${rec.target}`}</span>
          <h3>{rec.title}</h3>
          <p>{rec.detail}</p>
          {rec.replace && <p className="fix__quote">“{rec.replace}”</p>}
          <div className="fix__lift">
            {rec.replace ? (
              <>
                <b className="num">{rec.projectedSupport}%</b>
                <span style={{ color: 'var(--mist)', fontSize: '0.86rem' }}>
                  {t('projected support, up from {n}%', { n: r.summary.support })}
                </span>
              </>
            ) : (
              <>
                <b className="num">+{rec.projectedLift}</b>
                <span style={{ color: 'var(--mist)', fontSize: '0.86rem' }}>{t('points of net support, projected')}</span>
              </>
            )}
          </div>
          <button className={`btn btn--sm ${rec.replace ? '' : 'btn--ghost'}`} onClick={() => onApply(rec)} disabled={busy} style={{ justifySelf: 'start' }}>
            {rec.replace ? t('Try this version') : t('Apply and re-run')} <Arrow size={16} />
          </button>
        </Reveal>
      ))}
    </div>
  );
}

const BASIS_LABEL = { poll: 'Real poll', estimate: 'Ripple estimate', model: 'Ripple model' } as const;
const POP_LABEL = { adults: 'adults', parents: 'parents', everyone: 'everyone in the room' } as const;

/** Where the numbers came from: the starting point, each adjustment, and what the crowd did. */
export function RealityPanel({ r }: { r: SimulationResult }) {
  const { t } = useT();
  const rc = r.reality;
  if (!rc) return null;
  const a = rc.anchor;
  const pop = t(POP_LABEL[a.population]);
  const marks = [
    { v: a.support, id: 'start', label: 'Start' },
    { v: rc.simulated, id: 'simulated', label: 'Simulated' },
  ];
  return (
    <Reveal className="panel reality">
      <div className="reality__head">
        <div style={{ display: 'grid', gap: 6 }}>
          <span className="label">{t('Reality check')}</span>
          <h3 className="reality__title">{a.label}</h3>
        </div>
        <span className={`basis basis--${a.basis}`}>{t(BASIS_LABEL[a.basis])}</span>
      </div>
      <div className="reality__grid">
        <div className="reality__col">
          <span className="label">{t('Starting point')} · {pop}</span>
          <b className="reality__num num">{a.support}%</b>
          {a.source ? (
            <a className="reality__source" href={a.source.url} target="_blank" rel="noreferrer">
              {a.source.org} ({a.source.year}): {a.source.finding} ↗
            </a>
          ) : null}
          {a.note && <p className="reality__note">{a.note}</p>}
        </div>
        <div className="reality__col">
          <span className="label">{t('Adjusted for your wording')}</span>
          {rc.adjustments.length === 0 ? (
            <p className="reality__note">{t('No adjustments. Your wording matches the starting point.')}</p>
          ) : (
            <ul className="reality__steps">
              {rc.adjustments.map((x) => (
                <li key={x.label}>
                  <span>{x.label}</span>
                  <b className="num mono" style={{ color: x.points > 0 ? 'var(--support)' : 'var(--oppose)' }}>
                    {x.points > 0 ? '+' : '−'}
                    {Math.abs(x.points)}
                  </b>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="reality__col">
          <span className="label">{t('Simulated day 1')} · {pop}</span>
          <b className="reality__num num">{rc.simulated}%</b>
          <p className="reality__note">
            {t('Ripple aimed for {target}%. Across the whole simulated room, including groups the starting point leaves out, {support}% are for it.', { target: rc.target, support: r.summary.support })}
          </p>
        </div>
      </div>
      <div className="reality__track" role="img" aria-label={t('Starting point {start}%, simulated {sim}% among {pop}', { start: a.support, sim: rc.simulated, pop })}>
        <div className="reality__rail" />
        {marks.map((m) => (
          <span key={m.id} className={`reality__mark reality__mark--${m.id}`} style={{ left: `${m.v}%` }}>
            <i />
            <small>
              {t(m.label)} {m.v}%
            </small>
          </span>
        ))}
        <span className="reality__axis">
          <small>0%</small>
          <small>50%</small>
          <small>100%</small>
        </span>
      </div>
    </Reveal>
  );
}

export function Compare({ before, after }: { before: SimulationResult; after: SimulationResult }) {
  const { t } = useT();
  const d = after.summary.net - before.summary.net;
  return (
    <motion.div className="compare" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} role="status">
      <span className="label label--foam">{t('Before → after your fix')}</span>
      <span>
        {t('Net support')} <b className="num">{signed(before.summary.net)}</b> → <b className="num">{signed(after.summary.net)}</b>
      </span>
      <span className="pill" style={{ borderColor: d >= 0 ? 'var(--support)' : 'var(--oppose)' }}>
        <span style={{ width: 12, display: 'inline-flex', color: d >= 0 ? 'var(--support)' : 'var(--oppose)' }}>
          <StanceIcon side={d >= 0 ? 'support' : 'oppose'} />
        </span>
        {t('{n} points', { n: signed(d) })}
      </span>
      <span style={{ color: 'var(--mist)', fontSize: '0.9rem' }}>
        {t(before.summary.verdict)} → {t(after.summary.verdict)}
      </span>
    </motion.div>
  );
}

// ───────── method ─────────
export function Method({ r }: { r: SimulationResult }) {
  const { t } = useT();
  const impacts = Object.entries(r.analysis.impacts) as [Value, number][];
  return (
    <div className="two-col">
      <div className="panel method">
        <span className="label">{t('What Ripple read in your words')}</span>
        <div className="signals">
          {r.analysis.signals.length === 0 && <span style={{ color: 'var(--mist)' }}>{t('Nothing specific. Try naming the topic and who it affects.')}</span>}
          {r.analysis.signals.map((s) => (
            <span key={s.id} className={`tag ${s.kind === 'topic' ? 'tag--foam' : ''}`}>
              {s.kind === 'mitigation' ? '✓ ' : ''}
              {s.label}: “{s.matches.join('”, “')}”
            </span>
          ))}
        </div>
        <span className="label" style={{ marginTop: 8 }}>
          {t('How the decision touches each value')}
        </span>
        <div style={{ display: 'grid', gap: 8 }}>
          {impacts
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .map(([v, n]) => (
              <div className="impact-row" key={v}>
                <span>{t(VALUE_LABELS[v])}</span>
                <div
                  className="impact-bar"
                  role="img"
                  aria-label={n > 0 ? t('{value}: helps ({n})', { value: t(VALUE_LABELS[v]), n: Math.round(n * 100) }) : t('{value}: hurts ({n})', { value: t(VALUE_LABELS[v]), n: Math.round(n * 100) })}
                >
                  <div>{n < 0 && <span style={{ width: `${-n * 100}%`, background: 'var(--oppose)', borderRadius: '4px 0 0 4px' }} />}</div>
                  <div>{n > 0 && <span style={{ width: `${n * 100}%`, background: 'var(--support)', borderRadius: '0 4px 4px 0' }} />}</div>
                </div>
                <span className="num mono" style={{ textAlign: 'right' }}>
                  {signed(Math.round(n * 100))}
                </span>
              </div>
            ))}
        </div>
      </div>
      <div className="panel method">
        <span className="label">{t('How the simulation works')}</span>
        <p style={{ color: 'var(--mist)' }}>
          {t(
            'Ripple starts from a realistic level of support: a published poll when your decision matches one, or a labeled estimate. Each voice then weighs the decision by what it cares about and by its own stake in it, and Ripple shifts everyone equally so the starting point holds. Then {n} simulated people, placed in neighborhoods, drift toward what their neighbors think over four moments in time. Disruption fades as routines adjust; on divisive topics, strong views harden.',
            { n: r.crowdSize.toLocaleString() },
          )}
        </p>
        <p className="disclaimer">
          {t(
            'These are simulated reactions based on patterns, not a poll of real people. Use them to prepare questions and spot who you might be forgetting. Then talk to real people, starting with the {group}.',
            { group: [...r.groups].sort((a, b) => a.net - b.net)[0]?.group.toLowerCase() ?? t('people most affected') },
          )}
        </p>
        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--fog)' }}>
          {t('engine {engine} v{version} · seed {seed} · change {change} · divisive {divisive}', {
            engine: r.engine,
            version: r.version,
            seed: r.id.slice(0, 6),
            change: Math.round(r.analysis.changeMagnitude * 100),
            divisive: Math.round(r.analysis.polarizing * 100),
          })}
        </span>
      </div>
    </div>
  );
}
