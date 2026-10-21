import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { analyze } from '../../../shared/engine';
import { SCOPE_META } from '../../../shared/personas';
import type { Scope, ScopeChoice, SimulationResult } from '../../../shared/types';
import { Arrow, SplitHeading, Toast } from '../components/ui';
import { runSimulation } from '../lib/api';
import { copyText } from '../lib/clipboard';
import { appUrl } from '../lib/config';
import { parseScope, simulatorPath } from '../lib/share';
import { scrollToTarget, ScrollTrigger } from '../lib/smooth';

const SCOPES: { id: ScopeChoice; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'personal', label: 'Personal' },
  { id: 'school', label: 'School' },
  { id: 'community', label: 'Community' },
  { id: 'business', label: 'Business' },
];

export const PAIRS: { label: string; a: string; b: string; scope: ScopeChoice }[] = [
  { label: 'Phones at school', a: 'Ban phones at school all day', b: 'Ban phones during class, with lockers students can use in an emergency', scope: 'school' },
  { label: 'A library tax', a: 'Raise property taxes to build a new library', b: 'Raise property taxes by 0.5% for five years to build a new library, and let residents vote on it first', scope: 'community' },
  { label: 'School uniforms', a: 'Require school uniforms', b: 'Require school uniforms, with free uniforms for families who need them', scope: 'school' },
  { label: 'Gas cars', a: 'Ban all gas-powered cars by 2030', b: 'Phase out sales of new gas-powered cars by 2035, with rebates for electric cars', scope: 'community' },
  { label: 'Taxes', a: 'Raise taxes on everyone to fund schools', b: 'Raise taxes on households earning over $400,000 to fund schools', scope: 'community' },
];

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const BASIS = { poll: 'Real poll', estimate: 'Ripple estimate', model: 'Ripple model' } as const;

function Marker({ side }: { side: 'a' | 'b' }) {
  return <i className={`cmp-marker cmp-marker--${side}`} aria-hidden="true" />;
}

function VersionCard({ side, r }: { side: 'a' | 'b'; r: SimulationResult }) {
  const s = r.summary;
  const anchor = r.reality?.anchor;
  return (
    <motion.div className="panel cmp-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: side === 'b' ? 0.08 : 0 }}>
      <span className="label cmp-card__label">
        <Marker side={side} /> Version {side.toUpperCase()}
      </span>
      <p className="verdict__decision">“{r.decision}”</p>
      <div className="cmp-card__net">
        <b className="num">{signed(s.net)}</b>
        <span className="reality__note">
          net support on day 1
          <br />
          {s.verdict}
        </span>
      </div>
      <div className="stack" role="img" aria-label={`${s.support}% for, ${s.neutral}% undecided, ${s.oppose}% against`}>
        <div style={{ width: `${s.support}%`, background: 'var(--support)' }} />
        <div style={{ width: `${s.neutral}%`, background: 'var(--neutral)' }} />
        <div style={{ width: `${s.oppose}%`, background: 'var(--oppose)' }} />
      </div>
      <div className="legend">
        <span className="key">
          <i style={{ background: 'var(--support)' }} /> For <b className="num">{s.support}%</b>
        </span>
        <span className="key">
          <i style={{ background: 'var(--neutral)' }} /> Undecided <b className="num">{s.neutral}%</b>
        </span>
        <span className="key">
          <i style={{ background: 'var(--oppose)' }} /> Against <b className="num">{s.oppose}%</b>
        </span>
      </div>
      <ul className="reality__steps">
        <li>
          <span>After a year</span>
          <b className="num" style={{ color: 'var(--paper)' }}>
            {signed(s.longTermNet)}
          </b>
        </li>
        {anchor && (
          <li>
            <span>Starts from</span>
            <span style={{ color: 'var(--paper)', textAlign: 'right' }}>
              {anchor.label} · {BASIS[anchor.basis]}
            </span>
          </li>
        )}
        {r.reality?.adjustments.map((a) => (
          <li key={a.label}>
            <span>{a.label}</span>
            <b className="num" style={{ color: 'var(--paper)' }}>
              {signed(a.points)}
            </b>
          </li>
        ))}
      </ul>
      <Link className="linkish" to={simulatorPath({ decision: r.decision, scope: r.scope, mix: r.mix })}>
        Open the full report for Version {side.toUpperCase()} →
      </Link>
    </motion.div>
  );
}

/** Group by group: each group's net support under A (ring) and B (dot), sorted by how much B moves it. */
function GroupShift({ a, b }: { a: SimulationResult; b: SimulationResult }) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const rows = a.groups
    .map((ga) => {
      const gb = b.groups.find((x) => x.personaId === ga.personaId);
      return gb ? { id: ga.personaId, group: ga.group, a: ga.net, b: gb.net, d: gb.net - ga.net } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((x, y) => y.d - x.d);
  const pos = (net: number) => `${(net + 100) / 2}%`;
  return (
    <div className="panel" style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div className="legend">
          <span className="key">
            <Marker side="a" /> Version A
          </span>
          <span className="key">
            <Marker side="b" /> Version B
          </span>
        </div>
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
                <th style={{ textAlign: 'right' }}>Net, A</th>
                <th style={{ textAlign: 'right' }}>Net, B</th>
                <th style={{ textAlign: 'right' }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id}>
                  <td>{g.group}</td>
                  <td className="n">{signed(g.a)}</td>
                  <td className="n">{signed(g.b)}</td>
                  <td className="n">{signed(g.d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="shift" role="img" aria-label="Dot chart of each group's net support under Version A and Version B. Use 'Show as table' for exact numbers.">
          {rows.map((g, i) => (
            <div className="shift__row" key={g.id} onMouseEnter={() => setHover(g.id)} onMouseLeave={() => setHover(null)}>
              <span className="shift__name">{g.group}</span>
              <div className="shift__track">
                <i className="shift__zero" />
                <motion.i
                  className="shift__link"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                  style={{ left: pos(Math.min(g.a, g.b)), width: `${Math.abs(g.d) / 2}%` }}
                />
                <i className="cmp-marker cmp-marker--a shift__dot" style={{ left: pos(g.a) }} />
                <motion.i
                  className="cmp-marker cmp-marker--b shift__dot"
                  initial={{ left: pos(g.a) }}
                  whileInView={{ left: pos(g.b) }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.2 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="net-val num">{signed(g.d)}</span>
              {hover === g.id && (
                <span className="tooltip" style={{ left: '50%', top: 0 }}>
                  {g.group}
                  <small>
                    A {signed(g.a)} → B {signed(g.b)} ({signed(g.d)} points)
                  </small>
                </span>
              )}
            </div>
          ))}
          <div className="shift__axis" aria-hidden="true">
            <span />
            <div>
              <span>−100 net</span>
              <span>0</span>
              <span>+100 net</span>
            </div>
            <span style={{ textAlign: 'right' }}>Change</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const [a, setA] = useState(() => (params.get('a') ?? '').slice(0, 500));
  const [b, setB] = useState(() => (params.get('b') ?? '').slice(0, 500));
  const [scope, setScope] = useState<ScopeChoice>(() => parseScope(params.get('s')));
  const [results, setResults] = useState<[SimulationResult, SimulationResult] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const autoRan = useRef(false);

  useEffect(() => {
    document.title = 'Compare · Ripple';
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const run = useCallback(
    async (va: string, vb: string, sc: ScopeChoice) => {
      if (va.trim().length < 3 || vb.trim().length < 3 || busy) return;
      setBusy(true);
      setError(null);
      // Both versions must face the same crowd, so "Auto" settles on Version A's setting for both.
      const useScope: Scope = sc !== 'auto' ? sc : analyze(va, 'auto').scope;
      try {
        const [ra, rb] = await Promise.all([runSimulation({ decision: va.trim(), scope: useScope }), runSimulation({ decision: vb.trim(), scope: useScope })]);
        setResults([ra.result, rb.result]);
        const q = new URLSearchParams({ a: va.trim(), b: vb.trim() });
        if (sc !== 'auto') q.set('s', sc);
        setParams(q, { replace: true });
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          scrollToTarget('#cmp-out', -110);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [busy, setParams],
  );

  useEffect(() => {
    if (autoRan.current) return;
    if (params.get('run') === '1' && a && b) {
      autoRan.current = true;
      setTimeout(() => run(a, b, scope), 300);
    }
  }, [params, a, b, scope, run]);

  const [ra, rb] = results ?? [null, null];
  const d = ra && rb ? rb.summary.net - ra.summary.net : 0;
  const year = ra && rb ? rb.summary.longTermNet - ra.summary.longTermNet : 0;
  const headline = !ra || !rb ? '' : Math.abs(d) < 3 ? 'The two versions land about the same.' : `Version ${d > 0 ? 'B' : 'A'} wins by ${Math.abs(d)} points.`;

  const shareLink = async () => {
    if (!ra || !rb) return;
    const q = new URLSearchParams({ a: ra.decision, b: rb.decision });
    if (scope !== 'auto') q.set('s', scope);
    q.set('run', '1');
    flash((await copyText(appUrl(`/compare?${q.toString()}`))) ? 'Link copied' : 'Couldn’t copy the link');
  };

  return (
    <div className="wrap page cmp-page">
      <header className="page__head">
        <span className="label label--foam">Compare</span>
        <SplitHeading as="h1" immediate className="display" lines={[['Same', 'idea,'], [<em key="d">different</em>, <em key="w">words.</em>]]} />
        <p className="lead">
          A pilot instead of a mandate, “during class” instead of “all day”: small changes can win or lose a room. Write two versions of a decision
          and Ripple runs both past the same simulated crowd.
        </p>
      </header>

      <section className="page__section" aria-label="Two versions">
        <form
          className="panel cmp-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(a, b, scope);
          }}
        >
          <div className="cmp-form__pair">
            {(
              [
                ['a', a, setA, 'e.g. Ban phones at school all day'],
                ['b', b, setB, 'e.g. Ban phones during class only'],
              ] as const
            ).map(([side, value, set, ph]) => (
              <div key={side} style={{ display: 'grid', gap: 8 }}>
                <label className="label cmp-card__label" htmlFor={`cmp-${side}`}>
                  <Marker side={side} /> Version {side.toUpperCase()}
                </label>
                <textarea id={`cmp-${side}`} value={value} maxLength={500} placeholder={ph} onChange={(e) => set(e.target.value)} />
              </div>
            ))}
          </div>
          <div className="composer__row">
            <div style={{ display: 'grid', gap: 8 }}>
              <span className="label" id="cmp-scope">
                Who it affects
              </span>
              <div className="segmented" role="radiogroup" aria-labelledby="cmp-scope">
                {SCOPES.map((s) => (
                  <button type="button" key={s.id} role="radio" aria-checked={scope === s.id} onClick={() => setScope(s.id)}>
                    {scope === s.id && <motion.span layoutId="cmp-seg" className="seg-bg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button className="btn" type="submit" disabled={busy || a.trim().length < 3 || b.trim().length < 3} style={{ alignSelf: 'end' }}>
              {busy ? 'Simulating both…' : 'Compare'} <Arrow />
            </button>
          </div>
          <div className="examples-row">
            <span className="label" style={{ marginRight: 4 }}>
              Try
            </span>
            {PAIRS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="chip"
                aria-pressed={a === p.a && b === p.b}
                onClick={() => {
                  setA(p.a);
                  setB(p.b);
                  setScope(p.scope);
                  run(p.a, p.b, p.scope);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </form>
      </section>

      <div id="cmp-out" style={{ scrollMarginTop: 110 }}>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <AnimatePresence mode="wait">
          {ra && rb && !busy && (
            <motion.section key={ra.id + rb.id} className="page__section" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} aria-label="Comparison">
              <div className="cmp-head">
                <span className="label label--foam">The result</span>
                <h2 className="h2">{headline}</h2>
                <p className="lead">
                  Net support (percent for minus percent against) on day one: Version A <b className="num">{signed(ra.summary.net)}</b>, Version B{' '}
                  <b className="num">{signed(rb.summary.net)}</b>.{' '}
                  {Math.abs(year) >= 3 ? `A year later the gap is ${Math.abs(year)} points.` : 'A year later they end up close together.'} Both were simulated with
                  the same {ra.crowdSize.toLocaleString()} {SCOPE_META[ra.scope].crowdNoun}.
                </p>
              </div>
              <div className="cmp-pair">
                <VersionCard side="a" r={ra} />
                <VersionCard side="b" r={rb} />
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <span className="label">Group by group</span>
                <h3 className="h2" style={{ fontSize: 'clamp(1.5rem, 2.8vw, 2.1rem)' }}>
                  Who moves, <em>and how far.</em>
                </h3>
                <GroupShift a={ra} b={rb} />
              </div>
              <div className="actions">
                <button type="button" className="btn" onClick={shareLink}>
                  Copy link to this comparison
                </button>
                <Link className="btn btn--ghost" to="/simulate">
                  Open the simulator
                </Link>
              </div>
              <p className="reality__note">These are simulated reactions, not survey results. Use them to prepare, then ask real people.</p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
    </div>
  );
}
