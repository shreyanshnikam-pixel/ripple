import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SCOPE_META, VALUE_LABELS } from '../../../shared/personas';
import type { PersonaReaction, Recommendation, SimulationResult, Value } from '../../../shared/types';
import { CrowdCanvas } from '../components/canvas';
import { Arrow, Avatar, Counter, Reveal, StanceIcon, StancePill, stanceSide } from '../components/ui';
import { useReducedMotion } from '../lib/motion';
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
  return (
    <div className="legend">
      {(['support', 'neutral', 'oppose'] as const).map((s) => (
        <span className="key" key={s}>
          <i style={{ background: sideColor(s) }} />
          {s === 'support' ? 'For' : s === 'neutral' ? 'Undecided' : 'Against'}
        </span>
      ))}
    </div>
  );
}

// ───────── verdict ─────────
export function Verdict({ r, source, district }: { r: SimulationResult; source: Source; district?: string | null }) {
  const s = r.summary;
  const meta = SCOPE_META[r.scope];
  return (
    <div className="verdict">
      <Reveal className="panel verdict__main">
        <span className="label">
          Simulated reaction · {meta.label} · {r.crowdSize.toLocaleString()} {r.scope === 'personal' ? 'simulated reactions' : meta.crowdNoun}
          {district ? ` · ${district} population` : ''}
        </span>
        <p className="verdict__decision">“{r.decision}”</p>
        <h2 className="verdict__word">{s.verdict}.</h2>
        <p className="lead" style={{ color: 'var(--paper)' }}>
          {s.headline}
        </p>
        <p style={{ color: 'var(--mist)' }}>{s.trajectory}</p>
        <p className="source-note">
          <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--foam)', display: 'inline-block' }} />
          {source === 'api' ? 'Simulated on the Ripple server' : 'Simulated right here in your browser'} · engine {r.engine} · same question, same answer
        </p>
      </Reveal>
      <Reveal className="panel verdict__side" delay={0.1}>
        <div>
          <span className="label">Net support on day 1</span>
          <div className="net">
            <b>
              <Counter value={s.net} signed />
            </b>
            <span style={{ color: 'var(--mist)' }}>
              points
              <br />
              <span className="num">±{s.marginOfError}</span> sim. margin
            </span>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="stack" role="img" aria-label={`${s.support}% for, ${s.neutral}% undecided, ${s.oppose}% against`}>
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
              <i style={{ background: 'var(--support)' }} /> For <b className="num" style={{ color: 'var(--paper)' }}>{s.support}%</b>
            </span>
            <span className="key">
              <i style={{ background: 'var(--neutral)' }} /> Undecided <b className="num" style={{ color: 'var(--paper)' }}>{s.neutral}%</b>
            </span>
            <span className="key">
              <i style={{ background: 'var(--oppose)' }} /> Against <b className="num" style={{ color: 'var(--paper)' }}>{s.oppose}%</b>
            </span>
          </div>
        </div>
        <div className="metrics">
          <div className="metric">
            <span className="label">After a year</span>
            <b className="num">{signed(s.longTermNet)} net</b>
          </div>
          <div className="metric">
            <span className="label">Polarization</span>
            <b className="num">{Math.round(s.polarization * 100)} / 100</b>
          </div>
          <div className="metric">
            <span className="label">Backlash risk</span>
            <b>{s.backlashRisk}</b>
          </div>
          <div className="metric">
            <span className="label">Read confidence</span>
            <b>{s.confidence}</b>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

// ───────── crowd ─────────
export function CrowdPanel({ r }: { r: SimulationResult }) {
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
  const t = r.timeline[shown];
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
            label={`Simulated crowd of ${r.crowdSize} at ${t.label}: ${t.support}% for, ${t.neutral}% undecided, ${t.oppose}% against`}
          />
        </div>
      </div>
      <div className="crowd__side">
        <div className="panel scrubber">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span className="label">Moment in time</span>
            <button className="btn btn--ghost btn--sm" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
              {playing ? 'Pause' : 'Play the year'}
            </button>
          </div>
          <div className="scrubber__track" role="group" aria-label="Moment in time">
            {r.timeline.map((p, i) => (
              <button key={p.label} className={i === shown ? 'is-on' : ''} onClick={() => go(i)} aria-pressed={i === shown}>
                {p.label}
                <small>{p.sublabel}</small>
              </button>
            ))}
          </div>
          <div className="spread__counts" style={{ marginTop: 6 }} aria-live="polite">
            {(
              [
                ['support', 'For', t.support],
                ['neutral', 'Undecided', t.neutral],
                ['oppose', 'Against', t.oppose],
              ] as const
            ).map(([k, l, v]) => (
              <div className="count" key={k}>
                <span className="key">
                  <i style={{ background: sideColor(k) }} /> {l}
                </span>
                <b className="num">{v}%</b>
              </div>
            ))}
          </div>
        </div>
        <div className="panel" style={{ display: 'grid', gap: 10 }}>
          <span className="label">Highlight a group</span>
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
          {Math.round(p.share * 100)}% of crowd
        </span>
      </div>
      <div className="lean" role="img" aria-label={`Lean: ${pct} out of 100 ${side === 'oppose' ? 'against' : side === 'support' ? 'for' : 'undecided'}`}>
        <span>{p.score < 0 && <i style={{ right: 0, width: `${pct}%`, background: 'var(--oppose)', borderRadius: '4px 0 0 4px' }} />}</span>
        <span>{p.score > 0 && <i style={{ left: 0, width: `${pct}%`, background: 'var(--support)', borderRadius: '0 4px 4px 0' }} />}</span>
      </div>
      <blockquote>“{p.quote}”</blockquote>
      <div className="persona__meta">
        <span>
          Moved most by <b>{p.concern.label}</b>
        </span>
        <span>
          {p.changeMindType === 'win' ? 'Would come around with: ' : 'Would turn against it if: '}
          <b style={{ fontWeight: 500 }}>{p.changeMind}</b>
        </span>
      </div>
    </Reveal>
  );
}

export function VoicesBlock({ r }: { r: SimulationResult }) {
  const [filter, setFilter] = useState<'all' | 'support' | 'neutral' | 'oppose'>('all');
  const list = useMemo(() => [...r.personas].sort((a, b) => b.score - a.score).filter((p) => filter === 'all' || stanceSide(p.stance) === filter), [r, filter]);
  const counts = { support: 0, neutral: 0, oppose: 0 };
  r.personas.forEach((p) => counts[stanceSide(p.stance)]++);
  return (
    <>
      <div className="filters" role="group" aria-label="Filter voices">
        {(
          [
            ['all', `All ${r.personas.length}`],
            ['support', `For · ${counts.support}`],
            ['neutral', `Undecided · ${counts.neutral}`],
            ['oppose', `Against · ${counts.oppose}`],
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
      {list.length === 0 && <p style={{ color: 'var(--mist)' }}>No one landed in this group for this decision.</p>}
    </>
  );
}

// ───────── crosstabs ─────────
export function Crosstabs({ r }: { r: SimulationResult }) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const rows = [...r.groups].sort((a, b) => b.net - a.net);
  return (
    <div className="panel" style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Legend />
        <button className="linkish" onClick={() => setTable((t) => !t)}>
          {table ? 'Show as chart' : 'Show as table'}
        </button>
      </div>
      {table ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Group</th>
                <th style={{ textAlign: 'right' }}>For</th>
                <th style={{ textAlign: 'right' }}>Undecided</th>
                <th style={{ textAlign: 'right' }}>Against</th>
                <th style={{ textAlign: 'right' }}>Net</th>
                <th style={{ textAlign: 'right' }}>People</th>
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
        <div className="xtab" role="img" aria-label="Diverging bar chart of support and opposition by group. Use 'Show as table' for exact numbers.">
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
                    {g.support}% for · {g.neutral}% undecided · {g.oppose}% against
                  </small>
                </span>
              )}
            </div>
          ))}
          <div className="xtab__axis" aria-hidden="true">
            <span />
            <div>
              <span>100% against</span>
              <span>0</span>
              <span>100% for</span>
            </div>
            <span style={{ textAlign: 'right' }}>Net</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── timeline chart ─────────
export function TimelineChart({ r }: { r: SimulationResult }) {
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
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={r.timeline.map((t) => `${t.label}: ${t.support}% for, ${t.oppose}% against`).join('; ')}>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
              <text x={m.l - 8} y={y(v) + 4} textAnchor="end">
                {v}%
              </text>
            </g>
          ))}
          {r.timeline.map((t, i) => (
            <text key={t.label} x={x(i)} y={H - 14} textAnchor="middle">
              {t.label}
            </text>
          ))}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={H - m.b} stroke="var(--mist)" strokeWidth="1" />}
          {series.map((s, si) => {
            const d = r.timeline.map((t, i) => `${i ? 'L' : 'M'}${x(i)},${y(t[s.key])}`).join(' ');
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
            r.timeline.map((t, i) =>
              i === last || i === hover ? <circle key={s.key + i} cx={x(i)} cy={y(t[s.key])} r="4.5" fill={s.color} stroke="var(--surface)" strokeWidth="2" /> : null,
            ),
          )}
          {ends.map((e) => (
            <g key={e.key}>
              <line x1={x(last) + 10} x2={x(last) + 22} y1={e.y} y2={e.y} stroke={e.color} strokeWidth="2" strokeLinecap="round" />
              <text x={x(last) + 28} y={e.y + 4} style={{ fill: 'var(--paper)' }}>
                {e.label} {e.v}%
              </text>
            </g>
          ))}
          {r.timeline.map((_, i) => (
            <rect key={i} x={x(i) - (W - m.l - m.r) / 6} y={m.t} width={(W - m.l - m.r) / 3} height={H - m.t - m.b} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
        {hover != null && (
          <div className="tooltip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(m.t / H) * 100}%`, transform: 'translate(-50%, -30%)' }}>
            {r.timeline[hover].label} · {r.timeline[hover].sublabel}
            <small>
              {r.timeline[hover].support}% for · {r.timeline[hover].neutral}% undecided · {r.timeline[hover].oppose}% against
            </small>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────── themes ─────────
export function Themes({ r }: { r: SimulationResult }) {
  return (
    <div className="panel theme-list">
      <span className="label">What people are talking about</span>
      {r.themes.length === 0 && <p style={{ color: 'var(--mist)' }}>No strong themes yet. Add more detail to your decision.</p>}
      {r.themes.map((t, i) => {
        const side = t.sentiment > 0.2 ? 'support' : t.sentiment < -0.2 ? 'oppose' : 'neutral';
        return (
          <div className="theme" key={t.value}>
            <div className="theme__top">
              <span>{t.label}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, display: 'inline-flex', color: sideColor(side) }}>
                  <StanceIcon side={side} />
                </span>
                {side === 'support' ? 'Pulls people toward yes' : side === 'oppose' ? 'Pulls people toward no' : 'Cuts both ways'}
              </span>
            </div>
            <div style={{ background: 'var(--line-soft)', borderRadius: '0 4px 4px 0' }}>
              <motion.div className="theme__bar" style={{ background: sideColor(side) }} initial={{ width: 0 }} whileInView={{ width: `${Math.max(4, t.weight * 100)}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────── town hall ─────────
export function TownHall({ r }: { r: SimulationResult }) {
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
                  {m.replyTo && <span className="msg__reply">↳ replying to {m.replyTo}</span>}
                  <p>{m.text}</p>
                  {!mod && m.agrees > 0 && (
                    <span className="msg__agree">
                      ▲ {m.agrees.toLocaleString()} {r.scope === 'personal' ? 'nods around the table' : 'people agree'}
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
            <span className="typing" aria-label="Someone is typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>
      {count >= r.townHall.length && !reduced && (
        <button className="btn btn--ghost btn--sm" style={{ justifySelf: 'start' }} onClick={() => setRun((x) => x + 1)}>
          Replay the conversation
        </button>
      )}
    </div>
  );
}

// ───────── fixes ─────────
export function Fixes({ r, onApply, busy }: { r: SimulationResult; onApply: (rec: Recommendation) => void; busy: boolean }) {
  if (!r.recommendations.length) return <p style={{ color: 'var(--mist)' }}>Your decision already includes the usual fixes. Nice work.</p>;
  return (
    <div className="fixes">
      {r.recommendations.map((rec, i) => (
        <Reveal key={rec.id} className={`fix ${rec.replace ? 'fix--alt' : ''}`} delay={i * 0.08}>
          <span className="label">{rec.replace ? 'A narrower version' : `Wins over · ${rec.target}`}</span>
          <h3>{rec.title}</h3>
          <p>{rec.detail}</p>
          {rec.replace && <p className="fix__quote">“{rec.replace}”</p>}
          <div className="fix__lift">
            {rec.replace ? (
              <>
                <b className="num">{rec.projectedSupport}%</b>
                <span style={{ color: 'var(--mist)', fontSize: '0.86rem' }}>
                  projected support, up from {r.summary.support}%
                </span>
              </>
            ) : (
              <>
                <b className="num">+{rec.projectedLift}</b>
                <span style={{ color: 'var(--mist)', fontSize: '0.86rem' }}>points of net support, projected</span>
              </>
            )}
          </div>
          <button className={`btn btn--sm ${rec.replace ? '' : 'btn--ghost'}`} onClick={() => onApply(rec)} disabled={busy} style={{ justifySelf: 'start' }}>
            {rec.replace ? 'Try this version' : 'Apply and re-run'} <Arrow size={16} />
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
  const rc = r.reality;
  if (!rc) return null;
  const a = rc.anchor;
  const pop = POP_LABEL[a.population];
  const marks = [
    { v: a.support, label: 'Start' },
    { v: rc.simulated, label: 'Simulated' },
  ];
  return (
    <Reveal className="panel reality">
      <div className="reality__head">
        <div style={{ display: 'grid', gap: 6 }}>
          <span className="label">Reality check</span>
          <h3 className="reality__title">{a.label}</h3>
        </div>
        <span className={`basis basis--${a.basis}`}>{BASIS_LABEL[a.basis]}</span>
      </div>
      <div className="reality__grid">
        <div className="reality__col">
          <span className="label">Starting point · {pop}</span>
          <b className="reality__num num">{a.support}%</b>
          {a.source ? (
            <a className="reality__source" href={a.source.url} target="_blank" rel="noreferrer">
              {a.source.org} ({a.source.year}): {a.source.finding} ↗
            </a>
          ) : null}
          {a.note && <p className="reality__note">{a.note}</p>}
        </div>
        <div className="reality__col">
          <span className="label">Adjusted for your wording</span>
          {rc.adjustments.length === 0 ? (
            <p className="reality__note">No adjustments. Your wording matches the starting point.</p>
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
          <span className="label">Simulated day 1 · {pop}</span>
          <b className="reality__num num">{rc.simulated}%</b>
          <p className="reality__note">
            Ripple aimed for {rc.target}%. Across the whole simulated room, including groups the starting point leaves out, {r.summary.support}% are for it.
          </p>
        </div>
      </div>
      <div className="reality__track" role="img" aria-label={`Starting point ${a.support}%, simulated ${rc.simulated}% among ${pop}`}>
        <div className="reality__rail" />
        {marks.map((m) => (
          <span key={m.label} className={`reality__mark reality__mark--${m.label.toLowerCase()}`} style={{ left: `${m.v}%` }}>
            <i />
            <small>
              {m.label} {m.v}%
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
  const d = after.summary.net - before.summary.net;
  return (
    <motion.div className="compare" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} role="status">
      <span className="label label--foam">Before → after your fix</span>
      <span>
        Net support <b className="num">{signed(before.summary.net)}</b> → <b className="num">{signed(after.summary.net)}</b>
      </span>
      <span className="pill" style={{ borderColor: d >= 0 ? 'var(--support)' : 'var(--oppose)' }}>
        <span style={{ width: 12, display: 'inline-flex', color: d >= 0 ? 'var(--support)' : 'var(--oppose)' }}>
          <StanceIcon side={d >= 0 ? 'support' : 'oppose'} />
        </span>
        {signed(d)} points
      </span>
      <span style={{ color: 'var(--mist)', fontSize: '0.9rem' }}>
        {before.summary.verdict} → {after.summary.verdict}
      </span>
    </motion.div>
  );
}

// ───────── method ─────────
export function Method({ r }: { r: SimulationResult }) {
  const impacts = Object.entries(r.analysis.impacts) as [Value, number][];
  return (
    <div className="two-col">
      <div className="panel method">
        <span className="label">What Ripple read in your words</span>
        <div className="signals">
          {r.analysis.signals.length === 0 && <span style={{ color: 'var(--mist)' }}>Nothing specific. Try naming the topic and who it affects.</span>}
          {r.analysis.signals.map((s) => (
            <span key={s.id} className={`tag ${s.kind === 'topic' ? 'tag--foam' : ''}`}>
              {s.kind === 'mitigation' ? '✓ ' : ''}
              {s.label}: “{s.matches.join('”, “')}”
            </span>
          ))}
        </div>
        <span className="label" style={{ marginTop: 8 }}>
          How the decision touches each value
        </span>
        <div style={{ display: 'grid', gap: 8 }}>
          {impacts
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .map(([v, n]) => (
              <div className="impact-row" key={v}>
                <span>{VALUE_LABELS[v]}</span>
                <div className="impact-bar" role="img" aria-label={`${VALUE_LABELS[v]}: ${n > 0 ? 'helps' : 'hurts'} (${Math.round(n * 100)})`}>
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
        <span className="label">How the simulation works</span>
        <p style={{ color: 'var(--mist)' }}>
          Ripple starts from a realistic level of support: a published poll when your decision matches one, or a labeled
          estimate. Each voice then weighs the decision by what it cares about and by its own stake in it, and Ripple shifts
          everyone equally so the starting point holds. Then {r.crowdSize.toLocaleString()} simulated people, placed in
          neighborhoods, drift toward what their neighbors think over four moments in time. Disruption fades as routines adjust;
          on divisive topics, strong views harden.
        </p>
        <p className="disclaimer">
          These are simulated reactions based on patterns, not a poll of real people. Use them to prepare questions and spot who you
          might be forgetting. Then talk to real people, starting with the{' '}
          {[...r.groups].sort((a, b) => a.net - b.net)[0]?.group.toLowerCase() ?? 'people most affected'}.
        </p>
        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--fog)' }}>
          engine {r.engine} v{r.version} · seed {r.id.slice(0, 6)} · change {Math.round(r.analysis.changeMagnitude * 100)} · divisive {Math.round(r.analysis.polarizing * 100)}
        </span>
      </div>
    </div>
  );
}
