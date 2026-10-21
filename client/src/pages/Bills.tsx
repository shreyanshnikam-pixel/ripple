import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BILL_STAGES, BILLS, type Bill, type BillStage } from '../../../shared/bills';
import { startFor } from '../../../shared/engine';
import { Arrow, SplitHeading } from '../components/ui';
import { districtFromCode, recalledDistrict, type DistrictPick } from '../lib/district';
import { simulatorPath } from '../lib/share';

const FILTERS: { id: 'all' | 'law' | 'passed' | 'pending'; label: string; test: (s: BillStage) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'law', label: 'Became law', test: (s) => s === 'law' },
  { id: 'passed', label: 'Passed a chamber', test: (s) => s === 'passed-one' || s === 'passed-both' },
  { id: 'pending', label: 'Waiting in Congress', test: (s) => s === 'introduced' || s === 'committee' },
];

const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

/** The published poll a simulation of this bill starts from, if there is one. */
function pollFor(b: Bill) {
  const a = startFor(b.decision, b.scope);
  return a.basis === 'poll' && a.source ? { support: a.support, source: a.source } : null;
}

function Progress({ stage }: { stage: BillStage }) {
  const at = BILL_STAGES.findIndex((s) => s.id === stage);
  return (
    <ol className="bill__progress" aria-label={`Progress: ${BILL_STAGES[at].label}`}>
      {BILL_STAGES.map((s, i) => (
        <li key={s.id} className={i <= at ? 'is-done' : ''} aria-current={i === at ? 'step' : undefined}>
          <i />
          <span>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

function BillCard({ b, i, home, onSimulate }: { b: Bill; i: number; home: DistrictPick | null; onSimulate: (b: Bill, district?: DistrictPick) => void }) {
  const poll = pollFor(b);
  return (
    <motion.article
      className="panel bill"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: (i % 2) * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="bill__top">
        <span className="bill__number mono">{b.number}</span>
        <span className="reality__note">{b.congress}th Congress</span>
        {b.stage === 'law' && <span className="basis basis--poll">Law</span>}
      </div>
      <h3 className="bill__title">{b.title}</h3>
      <p className="reality__note">
        {b.sponsor} · introduced {fmtDate(b.introduced)}
      </p>
      <p className="bill__summary">{b.summary}</p>
      <Progress stage={b.stage} />
      <p className="bill__status">{b.status}</p>
      {poll && (
        <p className="reality__note">
          Public opinion: <b style={{ color: 'var(--paper)' }}>{poll.support}%</b> support in a{' '}
          <a className="reality__source" href={poll.source.url} target="_blank" rel="noreferrer">
            {poll.source.year} {poll.source.org} poll
          </a>
          .
        </p>
      )}
      <div className="actions bill__actions">
        <button type="button" className="btn btn--sm" onClick={() => onSimulate(b)}>
          Simulate reactions <Arrow size={16} />
        </button>
        {home && b.scope === 'community' && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onSimulate(b, home)}>
            In {home.district.label}
          </button>
        )}
        <a className="linkish" href={b.url} target="_blank" rel="noreferrer">
          Read it on Congress.gov ↗
        </a>
      </div>
    </motion.article>
  );
}

export default function Bills() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [query, setQuery] = useState('');
  const [home, setHome] = useState<DistrictPick | null>(null);

  useEffect(() => {
    document.title = 'Real bills in Congress · Ripple';
    const saved = recalledDistrict();
    if (saved) districtFromCode(saved).then(setHome).catch(() => undefined);
  }, []);

  const sorted = useMemo(() => [...BILLS].sort((a, b) => b.introduced.localeCompare(a.introduced)), []);
  const f = FILTERS.find((x) => x.id === filter)!;
  const q = query.trim().toLowerCase();
  const shown = sorted.filter((b) => f.test(b.stage) && (!q || `${b.number} ${b.title} ${b.summary} ${b.sponsor}`.toLowerCase().includes(q)));
  const laws = BILLS.filter((b) => b.stage === 'law').length;
  const checked = BILLS.reduce((latest, b) => (b.checked > latest ? b.checked : latest), '');

  const simulate = (b: Bill, district?: DistrictPick) =>
    navigate(simulatorPath({ decision: b.decision, scope: b.scope, mix: district?.mix, district: district?.district.label }));

  return (
    <div className="wrap page">
      <header className="page__head">
        <span className="label label--foam">Real bills in Congress</span>
        <SplitHeading as="h1" immediate className="display" lines={[['Real', 'bills,'], [<em key="s">simulated.</em>]]} />
        <p className="lead">
          These are real bills and laws from Congress on questions Americans have been polled about. Read what each one does, see how far it got,
          and simulate how people would react, across the country or in your own district.
        </p>
        <div className="page__stats">
          <div>
            <b className="num">{BILLS.length}</b>
            <span>bills and laws</span>
          </div>
          <div>
            <b className="num">{laws}</b>
            <span>became law</span>
          </div>
          <div>
            <b className="num">{new Set(BILLS.map((b) => b.topic)).size}</b>
            <span>topics with real polling</span>
          </div>
          <div>
            <b className="num">{home ? home.district.label : '—'}</b>
            <span>
              {home ? (
                'your district'
              ) : (
                <Link to="/district" className="reality__source">
                  Add your district
                </Link>
              )}
            </span>
          </div>
        </div>
      </header>

      <section className="page__section" aria-label="Bills">
        <div className="bills__controls">
          <div className="segmented" role="radiogroup" aria-label="Filter by progress">
            {FILTERS.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={filter === x.id} onClick={() => setFilter(x.id)}>
                {filter === x.id && <motion.span layoutId="bills-filter" className="seg-bg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                <span>{x.label}</span>
              </button>
            ))}
          </div>
          <label className="search">
            <span className="sr-only">Search bills</span>
            <input type="search" placeholder="Search bills" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
        <p className="reality__note" aria-live="polite">
          Showing {shown.length} of {BILLS.length}
        </p>
        <div className="bills">
          {shown.map((b, i) => (
            <BillCard key={b.id} b={b} i={i} home={home} onSimulate={simulate} />
          ))}
        </div>
        {shown.length === 0 && <p className="reality__note">No bills match. Try another word or filter.</p>}
      </section>

      <section className="page__section" aria-labelledby="bills-how">
        <span className="label">How to read this page</span>
        <h2 className="h2" id="bills-how" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)' }}>
          Real bills. <em>Simulated</em> reactions.
        </h2>
        <ul className="limits">
          <li>
            Bill numbers, sponsors and progress come from Congress.gov and official sources{checked ? `, checked ${fmtDate(checked)}` : ''}. Bills keep
            moving, so follow the Congress.gov link for the latest.
          </li>
          <li>Summaries describe what each bill does in plain words. They don’t take a side.</li>
          <li>
            “Simulate reactions” runs Ripple on the idea behind the bill, starting from the published poll shown on the card. A simulation is a
            rehearsal, not a measurement of how people feel about the bill itself.
          </li>
          <li>
            Want your representative’s take? <Link to="/district">Find your district</Link> to see who represents you and how to reach them.
          </li>
        </ul>
      </section>
    </div>
  );
}
