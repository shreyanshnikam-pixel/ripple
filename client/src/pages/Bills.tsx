import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BILL_STAGES, BILLS, type Bill, type BillStage } from '../../../shared/bills';
import { startFor } from '../../../shared/engine';
import { Arrow, SplitHeading } from '../components/ui';
import { useT, type Lang } from '../i18n';
import { districtFromCode, recalledDistrict, type DistrictPick } from '../lib/district';
import { simulatorPath } from '../lib/share';

const FILTERS: { id: 'all' | 'law' | 'passed' | 'pending'; label: string; test: (s: BillStage) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'law', label: 'Became law', test: (s) => s === 'law' },
  { id: 'passed', label: 'Passed a chamber', test: (s) => s === 'passed-one' || s === 'passed-both' },
  { id: 'pending', label: 'Waiting in Congress', test: (s) => s === 'introduced' || s === 'committee' },
];

const fmtDate = (iso: string, lang: Lang = 'en') =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

/** The published poll a simulation of this bill starts from, if there is one. */
function pollFor(b: Bill) {
  const a = startFor(b.decision, b.scope);
  return a.basis === 'poll' && a.source ? { support: a.support, source: a.source } : null;
}

function Progress({ stage }: { stage: BillStage }) {
  const { t } = useT();
  const at = BILL_STAGES.findIndex((s) => s.id === stage);
  return (
    <ol className="bill__progress" aria-label={t('Progress: {stage}', { stage: t(BILL_STAGES[at].label) })}>
      {BILL_STAGES.map((s, i) => (
        <li key={s.id} className={i <= at ? 'is-done' : ''} aria-current={i === at ? 'step' : undefined}>
          <i />
          <span>{t(s.label)}</span>
        </li>
      ))}
    </ol>
  );
}

function BillCard({ b, i, home, onSimulate }: { b: Bill; i: number; home: DistrictPick | null; onSimulate: (b: Bill, district?: DistrictPick) => void }) {
  const poll = pollFor(b);
  const { t, lang } = useT();
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
        <span className="reality__note">{t('{n}th Congress', { n: b.congress })}</span>
        {b.stage === 'law' && <span className="basis basis--poll">{t('Law')}</span>}
      </div>
      <h3 className="bill__title">{b.title}</h3>
      <p className="reality__note">
        {b.sponsor} · {t('introduced {date}', { date: fmtDate(b.introduced, lang) })}
      </p>
      <p className="bill__summary">{b.summary}</p>
      <Progress stage={b.stage} />
      <p className="bill__status">{b.status}</p>
      {poll && (
        <p className="reality__note">
          {t('Public opinion:')} <b style={{ color: 'var(--paper)' }}>{poll.support}%</b> {t('support in a')}{' '}
          <a className="reality__source" href={poll.source.url} target="_blank" rel="noreferrer">
            {t('{year} {org} poll', { year: poll.source.year, org: poll.source.org })}
          </a>
          .
        </p>
      )}
      <div className="actions bill__actions">
        <button type="button" className="btn btn--sm" onClick={() => onSimulate(b)}>
          {t('Simulate reactions')} <Arrow size={16} />
        </button>
        {home && b.scope === 'community' && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onSimulate(b, home)}>
            {t('In {district}', { district: home.district.label })}
          </button>
        )}
        <a className="linkish" href={b.url} target="_blank" rel="noreferrer">
          {t('Read it on Congress.gov ↗')}
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
  const { t, lang } = useT();

  useEffect(() => {
    document.title = t('Real bills in Congress · Ripple');
  }, [t]);

  useEffect(() => {
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
        <span className="label label--foam">{t('Real bills in Congress')}</span>
        <SplitHeading
          as="h1"
          immediate
          className="display"
          lines={lang === 'es' ? [['Proyectos', 'reales,'], [<em key="s">simulados.</em>]] : [['Real', 'bills,'], [<em key="s">simulated.</em>]]}
        />
        <p className="lead">
          {t(
            'These are real bills and laws from Congress on questions Americans have been polled about. Read what each one does, see how far it got, and simulate how people would react, across the country or in your own district.',
          )}
        </p>
        <div className="page__stats">
          <div>
            <b className="num">{BILLS.length}</b>
            <span>{t('bills and laws')}</span>
          </div>
          <div>
            <b className="num">{laws}</b>
            <span>{t('became law')}</span>
          </div>
          <div>
            <b className="num">{new Set(BILLS.map((b) => b.topic)).size}</b>
            <span>{t('topics with real polling')}</span>
          </div>
          <div>
            <b className="num">{home ? home.district.label : '—'}</b>
            <span>
              {home ? (
                t('your district')
              ) : (
                <Link to="/district" className="reality__source">
                  {t('Add your district')}
                </Link>
              )}
            </span>
          </div>
        </div>
      </header>

      <section className="page__section" aria-label={t('Bills')}>
        <div className="bills__controls">
          <div className="segmented" role="radiogroup" aria-label={t('Filter by progress')}>
            {FILTERS.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={filter === x.id} onClick={() => setFilter(x.id)}>
                {filter === x.id && <motion.span layoutId="bills-filter" className="seg-bg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                <span>{t(x.label)}</span>
              </button>
            ))}
          </div>
          <label className="search">
            <span className="sr-only">{t('Search bills')}</span>
            <input type="search" placeholder={t('Search bills')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
        <p className="reality__note" aria-live="polite">
          {t('Showing {n} of {total}', { n: shown.length, total: BILLS.length })}
        </p>
        <div className="bills">
          {shown.map((b, i) => (
            <BillCard key={b.id} b={b} i={i} home={home} onSimulate={simulate} />
          ))}
        </div>
        {shown.length === 0 && <p className="reality__note">{t('No bills match. Try another word or filter.')}</p>}
      </section>

      <section className="page__section" aria-labelledby="bills-how">
        <span className="label">{t('How to read this page')}</span>
        <h2 className="h2" id="bills-how" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)' }}>
          {lang === 'es' ? (
            <>
              Proyectos reales. Reacciones <em>simuladas.</em>
            </>
          ) : (
            <>
              Real bills. <em>Simulated</em> reactions.
            </>
          )}
        </h2>
        <ul className="limits">
          <li>
            {checked
              ? t('Bill numbers, sponsors and progress come from Congress.gov and official sources, checked {date}. Bills keep moving, so follow the Congress.gov link for the latest.', { date: fmtDate(checked, lang) })
              : t('Bill numbers, sponsors and progress come from Congress.gov and official sources. Bills keep moving, so follow the Congress.gov link for the latest.')}
          </li>
          <li>{t('Summaries describe what each bill does in plain words. They don’t take a side.')}</li>
          <li>
            {t(
              '“Simulate reactions” runs Ripple on the idea behind the bill, starting from the published poll shown on the card. A simulation is a rehearsal, not a measurement of how people feel about the bill itself.',
            )}
          </li>
          <li>
            {t('Want your representative’s take?')} <Link to="/district">{t('Find your district')}</Link>{' '}
            {t('to see who represents you and how to reach them.')}
          </li>
        </ul>
      </section>
    </div>
  );
}
