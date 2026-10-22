import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SplitHeading } from '../components/ui';
import { useT } from '../i18n';
import { apiFetch, HAS_SERVER } from '../lib/config';

interface Record {
  surveys: number;
  answers: number;
  meanAbsError: number | null;
  withinMargin: number | null;
  calibration: { topic: string; points: number; surveys: number; answers: number }[];
  list: { topic: string; predicted: number; actual: number; answers: number }[];
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

/** How close Ripple's predictions have been to real survey answers, and what it learned from them. */
export default function TrackRecord() {
  const { t, lang } = useT();
  const [data, setData] = useState<Record | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${t('Track record')} · Ripple`;
  }, [t]);
  useEffect(() => {
    if (!HAS_SERVER) return;
    apiFetch('/api/track-record', { timeoutMs: 8000 })
      .then((r) => (r?.ok ? r.json() : Promise.reject(new Error('unavailable'))))
      .then(setData)
      .catch(() => setError(t('The track record isn’t available right now.')));
  }, [t]);

  return (
    <div className="wrap page">
      <header className="page__head">
        <span className="label label--foam">{t('Track record')}</span>
        <SplitHeading
          as="h1"
          immediate
          className="display"
          lines={lang === 'es' ? [['¿Qué', 'tan', 'cerca'], [<em key="r">estuvo?</em>]] : [['How', 'close', 'was'], [<em key="r">Ripple?</em>]]}
        />
        <p className="lead">
          {t(
            'Every survey sent with Ripple saves the prediction first. When real answers come in, this page compares them, and Ripple learns a little from topics with enough data.',
          )}
        </p>
        {data && (
          <div className="page__stats">
            <div>
              <b className="num">{data.surveys}</b>
              <span>{t('surveys with 30+ answers')}</span>
            </div>
            <div>
              <b className="num">{data.answers.toLocaleString()}</b>
              <span>{t('real answers')}</span>
            </div>
            <div>
              <b className="num">{data.meanAbsError ?? '—'}</b>
              <span>{t('average gap, in points')}</span>
            </div>
            <div>
              <b className="num">{data.withinMargin == null ? '—' : `${Math.round(data.withinMargin * 100)}%`}</b>
              <span>{t('within the margin of error')}</span>
            </div>
          </div>
        )}
      </header>

      {!HAS_SERVER && (
        <p className="lead">{t('This copy of Ripple runs without a server, so there are no shared surveys to learn from. The full version keeps a public track record here.')}</p>
      )}
      {error && <p className="error">{error}</p>}

      {data && (
        <>
          <section className="page__section" aria-labelledby="tr-cal">
            <span className="label">{t('What Ripple learned')}</span>
            <h2 className="h2" id="tr-cal" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)' }}>
              {t('Calibration, carefully.')}
            </h2>
            {data.calibration.length ? (
              <div className="table-scroll panel">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('Topic')}</th>
                      <th style={{ textAlign: 'right' }}>{t('Surveys')}</th>
                      <th style={{ textAlign: 'right' }}>{t('Answers')}</th>
                      <th style={{ textAlign: 'right' }}>{t('Correction')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.calibration.map((c) => (
                      <tr key={c.topic}>
                        <td>{c.topic}</td>
                        <td className="n">{c.surveys}</td>
                        <td className="n">{c.answers.toLocaleString()}</td>
                        <td className="n">{signed(c.points)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="reality__note">{t('No topic has enough real answers yet. A topic needs at least 3 surveys with 30 or more answers each.')}</p>
            )}
            <ul className="limits">
              <li>{t('People who answer a shared link aren’t a random sample, so corrections are small: shrunk toward zero and capped at 5 points.')}</li>
              <li>{t('A correction only applies to its own topic, and every report that uses one says so in its reality check.')}</li>
              <li>{t('Only topics and numbers are shown here. What people wrote in surveys stays private.')}</li>
            </ul>
          </section>

          {data.list.length > 0 && (
            <section className="page__section" aria-labelledby="tr-list">
              <span className="label">{t('Every survey')}</span>
              <h2 className="h2" id="tr-list" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)' }}>
                {t('Predicted vs. real.')}
              </h2>
              <div className="table-scroll panel">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('Topic')}</th>
                      <th style={{ textAlign: 'right' }}>{t('Answers')}</th>
                      <th style={{ textAlign: 'right' }}>{t('Predicted support')}</th>
                      <th style={{ textAlign: 'right' }}>{t('Real support')}</th>
                      <th style={{ textAlign: 'right' }}>{t('Gap')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.list.map((s, i) => (
                      <tr key={i}>
                        <td>{s.topic}</td>
                        <td className="n">{s.answers}</td>
                        <td className="n">{s.predicted}%</td>
                        <td className="n">{s.actual}%</td>
                        <td className="n">{signed(s.actual - s.predicted)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <section className="page__section">
        <Link className="btn btn--ghost" to="/methodology">
          {t('How Ripple works')}
        </Link>
      </section>
    </div>
  );
}
