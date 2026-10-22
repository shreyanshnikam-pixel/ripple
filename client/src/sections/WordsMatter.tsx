import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { simulate } from '../../../shared/engine';
import type { Scope } from '../../../shared/types';
import { Reveal } from '../components/ui';
import { useT } from '../i18n';
import { Emph } from './Emph';

const LADDER: { decision: string; scope: Scope; show: string }[] = [
  { decision: 'Ban phones during class', scope: 'school', show: 'Ban phones during class' },
  { decision: 'Ban phones for the entire school day', scope: 'school', show: 'Ban phones for the entire school day' },
  { decision: 'Ban all devices at school', scope: 'school', show: 'Ban all devices at school' },
  { decision: 'Ban all devices', scope: 'community', show: 'Ban all devices, everywhere' },
];

/** The same idea worded four ways, run through the real engine. The wordings are engine input and stay in English. */
export function WordsMatter() {
  const navigate = useNavigate();
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const near = useInView(ref, { once: true, margin: '600px 0px' });
  type Row = (typeof LADDER)[number] & { adults: number; anchor: NonNullable<ReturnType<typeof simulate>['reality']>['anchor'] };
  const [rows, setRows] = useState<Row[]>([]);
  // Run the four simulations only when the section is about to scroll into view.
  useEffect(() => {
    if (!near || rows.length) return;
    const timer = setTimeout(() => {
      setRows(
        LADDER.map((l) => {
          const r = simulate({ decision: l.decision, scope: l.scope, crowdSize: 1000 }, { withRecommendations: false });
          return { ...l, adults: r.reality!.simulated, anchor: r.reality!.anchor };
        }),
      );
    }, 30);
    return () => clearTimeout(timer);
  }, [near, rows.length]);
  const sources = [...new Map(rows.filter((r) => r.anchor.source).map((r) => [r.anchor.source!.url, r.anchor.source!])).values()];

  return (
    <section className="section" aria-labelledby="words-title">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="label label--foam">{t('Grounded in real polls')}</span>
          <h2 className="h2" id="words-title">
            <Emph text={t('Change a few words, and *the room* changes with you.')} />
          </h2>
          <p className="lead">
            {t(
              'When a decision matches a well-studied policy, Ripple starts from published polling, then adjusts for your exact wording. Everything else is clearly labeled as an estimate. Here’s one idea, worded four ways.',
            )}
          </p>
        </Reveal>
        <div className="panel ladder" role="list" ref={ref} style={{ minHeight: 420 }}>
          <div className="ladder__row" style={{ cursor: 'default', paddingBlock: 4 }} aria-hidden="true">
            <span className="label">{t('Decision')}</span>
            <span className="label">{t('Simulated support among adults, day one')}</span>
            <span />
          </div>
          {rows.map((row, i) => (
            <button
              key={row.decision}
              role="listitem"
              className="ladder__row"
              onClick={() => navigate(`/simulate?d=${encodeURIComponent(row.decision)}&s=${row.scope}&run=1`)}
              aria-label={t('{decision}: {adults}% support among adults{poll}. Open in the simulator.', {
                decision: row.show,
                adults: row.adults,
                poll: row.anchor.basis === 'poll' ? t(', real poll {support}%', { support: row.anchor.support }) : '',
              })}
            >
              <span>
                <span className="ladder__decision">“{row.show}”</span>
                <span className="ladder__meta">
                  {row.anchor.basis === 'poll' && row.anchor.source
                    ? t('Real poll: {support}% ({org}, {year})', { support: row.anchor.support, org: row.anchor.source.org, year: row.anchor.source.year })
                    : t('Ripple estimate, no poll asks this')}
                </span>
              </span>
              <span className="ladder__track">
                <motion.span
                  className="ladder__bar"
                  style={{ display: 'block' }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.max(1, row.adults)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                />
                {row.anchor.basis === 'poll' && <span className="ladder__poll" style={{ left: `${row.anchor.support}%` }} title={t('Real poll: {support}%', { support: row.anchor.support })} />}
              </span>
              <span className="ladder__val num">{row.adults}%</span>
            </button>
          ))}
          <p style={{ color: 'var(--mist)', fontSize: '0.84rem', padding: '10px 12px 0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--paper)' }} aria-hidden="true" /> {t('White line = the published poll.')}
            {sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" style={{ color: 'var(--foam)' }}>
                {s.org} ({s.year}) ↗
              </a>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
