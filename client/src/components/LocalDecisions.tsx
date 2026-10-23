import { useMemo } from 'react';
import { startFor } from '../../../shared/engine';
import { LOCAL_CATEGORIES, LOCAL_DECISIONS, type LocalDecision } from '../../../shared/local';
import { useT } from '../i18n';
import { Arrow } from './ui';

/** Town-sized decisions (parks, bond votes, school start times…), each one click from a simulation. */
export function LocalDecisions({ onRun, place }: { onRun: (d: LocalDecision) => void; place?: string }) {
  const { t, lang } = useT();
  const start = useMemo(() => new Map(LOCAL_DECISIONS.map((d) => [d.id, startFor(d.decision, d.scope)])), []);
  return (
    <div className="local">
      {LOCAL_CATEGORIES.map((c) => (
        <div key={c.id} className="panel local__group">
          <span className="label">{t(c.label)}</span>
          <ul>
            {LOCAL_DECISIONS.filter((d) => d.category === c.id).map((d) => {
              const a = start.get(d.id)!;
              const poll = a.basis === 'poll' && a.source;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    className="local__item"
                    onClick={() => onRun(d)}
                    aria-label={place ? t('Simulate “{title}” for {place}', { title: t(d.title), place }) : t('Simulate “{title}”', { title: t(d.title) })}
                    title={lang === 'es' ? d.decision : undefined}
                  >
                    <span className="local__who">{t(d.who)}</span>
                    <b className="local__title">{t(d.title)}</b>
                    <span className={`basis ${poll ? 'basis--poll' : ''}`}>
                      {poll ? t('Real poll: {support}% ({org}, {year})', { support: a.support, org: a.source!.org, year: a.source!.year }) : t('Ripple estimate')}
                    </span>
                    <Arrow />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
