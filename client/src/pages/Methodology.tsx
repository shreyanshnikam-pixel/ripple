import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ANCHORS } from '../../../shared/anchors';
import { BENCHMARKS } from '../../../shared/benchmarks';
import { simulate } from '../../../shared/engine';
import { PERSONAS, SCOPE_META } from '../../../shared/personas';
import type { Scope } from '../../../shared/types';
import { Reveal, SplitHeading } from '../components/ui';

type Row = { id: string; label: string; support: number; basis: 'poll' | 'estimate'; population: string; source?: { org: string; year: number; url: string; finding: string }; note?: string; settings: Scope[] };

function anchorRows(): Row[] {
  const rows: Row[] = [];
  for (const a of ANCHORS) {
    rows.push({ id: a.id, label: a.label, support: a.support, basis: a.basis, population: a.population ?? 'everyone', source: a.basis === 'poll' ? a.source : undefined, note: a.note, settings: a.scopes });
    for (const v of a.variants ?? [])
      rows.push({ id: `${a.id}:${v.label}`, label: v.label, support: v.support, basis: v.basis, population: v.population ?? a.population ?? 'everyone', source: v.basis === 'poll' ? v.source : undefined, note: v.note, settings: a.scopes });
  }
  return rows;
}

const STEPS = [
  ['Read the decision', 'Ripple looks for topics (taxes, phones, schedules…), softening steps (a pilot, an opt-out, financial help), all-or-nothing words like “all” or “forever”, whether a rule is being lifted, and which setting the decision belongs to.'],
  ['Start from reality', 'If the decision matches a well-known policy, Ripple starts from published polling for it. If no poll exists, it uses a labeled estimate. If nothing matches, it uses its own model of how people weigh costs, freedoms and benefits.'],
  ['Adjust for wording', 'All-or-nothing language lowers support. Pilots, opt-outs, help with costs and asking people first raise it. Every adjustment is shown in the report.'],
  ['Give everyone a stake', 'Each of the 32 voices weighs twelve values differently and has its own stake as a student, parent, teacher, retiree, business owner and so on.'],
  ['Calibrate', 'Everyone is shifted by the same amount so day-one support in the poll’s population (for example, adults) matches the starting point. Differences between groups stay intact.'],
  ['Let opinions spread', '1,000 simulated people live in neighborhoods and drift toward what their neighbors think over four moments, from the announcement to a year later. The shock of change fades; on divisive topics, views harden.'],
] as const;

const POP = { adults: 'Adults', parents: 'Parents', everyone: 'Everyone in the room' } as Record<string, string>;

export default function Methodology() {
  useEffect(() => {
    document.title = 'Methodology · Ripple';
  }, []);
  const rows = useMemo(anchorRows, []);
  const [filter, setFilter] = useState<'all' | 'poll' | 'estimate'>('all');
  const [query, setQuery] = useState('');
  const shown = rows.filter((r) => (filter === 'all' || r.basis === filter) && (!query || `${r.label} ${r.source?.org ?? ''}`.toLowerCase().includes(query.toLowerCase())));
  const pollCount = rows.filter((r) => r.basis === 'poll').length;
  const sources = new Set(rows.map((r) => r.source?.url).filter(Boolean)).size;

  const [checks, setChecks] = useState<{ decision: string; poll: number; got: number; source: string; year: number }[] | null>(null);
  const [checking, setChecking] = useState(false);
  const runChecks = () => {
    setChecking(true);
    // Let the button repaint before the simulations run.
    setTimeout(() => {
      setChecks(
        BENCHMARKS.map((b) => {
          const r = simulate({ decision: b.decision, scope: b.scope, crowdSize: 1000 }, { withRecommendations: false });
          return { decision: b.decision, poll: b.poll, got: r.reality?.simulated ?? r.summary.support, source: b.source, year: b.year };
        }),
      );
      setChecking(false);
    }, 40);
  };
  const meanGap = checks ? checks.reduce((t, c) => t + Math.abs(c.got - c.poll), 0) / checks.length : 0;

  return (
    <div className="wrap page">
      <header className="page__head">
        <span className="label label--foam">Methodology</span>
        <SplitHeading as="h1" immediate className="display" lines={[['How', 'Ripple'], [<em key="w">works,</em>, 'honestly.']]} />
        <p className="lead">
          Ripple is a rehearsal, not a crystal ball. Here is exactly where its numbers come from, which ones are real polls, which ones are
          estimates, and what it can’t tell you.
        </p>
        <div className="page__stats">
          <div>
            <b className="num">{rows.length}</b>
            <span>well-known decisions Ripple recognizes</span>
          </div>
          <div>
            <b className="num">{pollCount}</b>
            <span>starting points from published polls</span>
          </div>
          <div>
            <b className="num">{sources}</b>
            <span>poll sources, each linked below</span>
          </div>
          <div>
            <b className="num">32</b>
            <span>simulated voices in four settings</span>
          </div>
        </div>
      </header>

      <section className="page__section" aria-labelledby="pipeline">
        <h2 className="h2" id="pipeline">
          Six steps, <em>every time.</em>
        </h2>
        <ol className="steps">
          {STEPS.map(([title, body], i) => (
            <Reveal as="li" key={title} delay={i * 0.05}>
              <span className="label">Step {i + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="page__section" aria-labelledby="checks">
        <h2 className="h2" id="checks">
          Checked against <em>real polls.</em>
        </h2>
        <p className="lead">
          Run the same checks as Ripple’s automated tests, right here in your browser. Because these polls set Ripple’s starting point,
          close agreement is expected. The check confirms the full simulation, with its crowd, social spread and group mix, doesn’t drift
          away from them.
        </p>
        <button className="btn" onClick={runChecks} disabled={checking}>
          {checking ? 'Running 24 simulations…' : checks ? 'Run the checks again' : 'Run the realism checks'}
        </button>
        {checks && (
          <motion.div className="panel checks" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="checks__summary">
              Average gap between Ripple and the published poll: <b className="num">{meanGap.toFixed(1)} points</b> across {checks.length} decisions.
            </p>
            <div className="checks__grid" role="table" aria-label="Ripple compared with published polls">
              <div className="checks__row checks__row--head" role="row">
                <span role="columnheader">Decision</span>
                <span role="columnheader">Poll vs Ripple (support, day one)</span>
                <span role="columnheader">Gap</span>
              </div>
              {checks.map((c) => (
                <div className="checks__row" role="row" key={c.decision}>
                  <span role="cell">
                    {c.decision}
                    <small>
                      {c.source}, {c.year}: {c.poll}%
                    </small>
                  </span>
                  <span role="cell" className="checks__track" aria-label={`Poll ${c.poll}%, Ripple ${c.got}%`}>
                    <i className="checks__poll" style={{ left: `${c.poll}%` }} />
                    <i className="checks__got" style={{ left: `${c.got}%` }} />
                  </span>
                  <span role="cell" className="num mono">
                    {c.got - c.poll > 0 ? '+' : ''}
                    {c.got - c.poll}
                  </span>
                </div>
              ))}
            </div>
            <p className="reality__note">
              <span className="key">
                <i style={{ background: 'var(--paper)', borderRadius: 1, width: 3 }} /> Published poll
              </span>{' '}
              <span className="key">
                <i style={{ background: 'var(--foam)' }} /> Ripple’s simulated crowd
              </span>
            </p>
          </motion.div>
        )}
      </section>

      <section className="page__section" aria-labelledby="sources">
        <h2 className="h2" id="sources">
          Every <em>starting point.</em>
        </h2>
        <div className="filters" role="group" aria-label="Filter starting points">
          {(
            [
              ['all', `All ${rows.length}`],
              ['poll', `Real polls · ${pollCount}`],
              ['estimate', `Estimates · ${rows.length - pollCount}`],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
          <label className="search">
            <span className="sr-only">Search</span>
            <input id="method-search" placeholder="Search, e.g. phones or Pew" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
        <div className="table-scroll panel" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Decision</th>
                <th style={{ textAlign: 'right' }}>Starts at</th>
                <th>Basis</th>
                <th>Among</th>
                <th>Source or note</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td className="n">{r.support}%</td>
                  <td>
                    <span className={`basis basis--${r.basis}`}>{r.basis === 'poll' ? 'Real poll' : 'Estimate'}</span>
                  </td>
                  <td>{POP[r.population]}</td>
                  <td style={{ minWidth: 260 }}>
                    {r.source ? (
                      <a className="reality__source" href={r.source.url} target="_blank" rel="noreferrer">
                        {r.source.org} ({r.source.year}) ↗
                      </a>
                    ) : (
                      <span className="reality__note">{r.note ?? 'Ripple estimate.'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="page__section" aria-labelledby="voices-list">
        <h2 className="h2" id="voices-list">
          The <em>32 voices.</em>
        </h2>
        <div className="voices-grid">
          {(Object.keys(PERSONAS) as Scope[]).map((s) => (
            <div className="panel" key={s}>
              <span className="label">{SCOPE_META[s].label}</span>
              <ul className="plain-list">
                {PERSONAS[s].map((p) => (
                  <li key={p.id}>
                    <b>{p.name}</b>
                    {p.age ? `, ${p.age}` : ''} · {p.role}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="page__section" aria-labelledby="limits">
        <h2 className="h2" id="limits">
          What Ripple <em>can’t</em> do.
        </h2>
        <ul className="limits">
          <li>It simulates reactions from patterns. It is not a poll of real people, and it can be wrong.</li>
          <li>Several polls are a few years old. Opinion moves, and each report shows the year of its source.</li>
          <li>Estimates are Ripple’s own judgment. They are labeled, and you can see the reasoning in each report.</li>
          <li>The 32 voices are archetypes. Real communities are more varied than any set of characters.</li>
          <li>Ripple does not model party, race or religion, and it never guesses yours.</li>
          <li>
            The best use of Ripple is to prepare: find who you might be forgetting, then go talk to them. Try{' '}
            <Link to="/simulate">a simulation</Link> and use “Ask real people” to compare.
          </li>
        </ul>
      </section>
    </div>
  );
}
