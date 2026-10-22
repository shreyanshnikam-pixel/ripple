import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { QrCode } from '../components/qr';
import { Toast } from '../components/ui';
import { useT } from '../i18n';
import { copyText } from '../lib/clipboard';
import { appUrl } from '../lib/config';
import { isLocal, mySurveys, surveyResults, type SurveyResults as Results } from '../lib/surveys';
import { RealVsPredicted } from './Survey';
import { AnimatePresence } from 'framer-motion';

const STANCE = { support: 'For', neutral: 'Not sure', oppose: 'Against' } as const;
const COLOR = { support: 'var(--support)', neutral: 'var(--neutral)', oppose: 'var(--oppose)' } as const;
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

export default function SurveyResults() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const key = params.get('k') ?? mySurveys()[id] ?? null;
  const [res, setRes] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const local = isLocal(id);
  const link = appUrl(`/survey/${id}`);
  const { t } = useT();

  useEffect(() => {
    document.title = t('Survey results · Ripple');
  }, [t]);

  useEffect(() => {
    let live = true;
    const load = () =>
      surveyResults(id, key)
        .then((r) => live && setRes(r))
        .catch((e: Error) => live && setError(e.message));
    load();
    // Answers arrive live during a class or meeting.
    const timer = window.setInterval(load, local ? 4000 : 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [id, key, local]);

  if (error && !res)
    return (
      <div className="wrap page">
        <header className="page__head">
          <span className="label label--foam">{t('Survey results')}</span>
          <h1 className="display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
            {t('We couldn’t open these results.')}
          </h1>
          <p className="lead">{t(error)}</p>
        </header>
      </div>
    );
  if (!res) return <div className="wrap page">{t('Loading results…')}</div>;

  const tl = res.tally;
  return (
    <div className="wrap page">
      <header className="page__head">
        <span className="label label--foam">
          {t('Listen for real · results')}
          {res.def.district ? ` · ${res.def.district}` : ''}
        </span>
        <h1 className="survey__q" style={{ fontSize: 'clamp(2rem, 4.4vw, 3.4rem)' }}>
          “{res.def.decision}”
        </h1>
        <div className="page__stats">
          <div>
            <b className="num">{tl.n}</b>
            <span>{t('real answers')}</span>
          </div>
          <div>
            <b className="num">{tl.n ? signed(tl.net) : '—'}</b>
            <span>{t('real net support')}</span>
          </div>
          <div>
            <b className="num">{signed(res.def.predicted.support - res.def.predicted.oppose)}</b>
            <span>{t('Ripple predicted')}</span>
          </div>
          <div>
            <b className="num">{local ? t('This device') : t('Live')}</b>
            <span>{local ? t('pass it around') : t('updates every 15 seconds')}</span>
          </div>
        </div>
      </header>

      <section className="page__section" aria-label={t('Real answers and the prediction')}>
        <div className="panel">
          <RealVsPredicted res={res} />
        </div>
      </section>

      {res.owner && (
        <section className="page__section survey-share" aria-label={t('Share the survey')}>
          <div className="panel survey-share__panel">
            <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
              <span className="label">{local ? t('Collect answers on this device') : t('Share the survey')}</span>
              {local ? (
                <p className="reality__note">{t('This copy of Ripple has no server, so the survey lives on this device. Open it, then hand the device to each person.')}</p>
              ) : (
                <>
                  <p className="reality__note">{t('Anyone with the link can answer once. Put the code on a slide so a room can scan it.')}</p>
                  <input className="survey-share__link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
                </>
              )}
              <div className="actions">
                {!local && (
                  <button type="button" className="btn btn--sm" onClick={async () => {
                      setToast((await copyText(link)) ? t('Link copied') : t('Couldn’t copy the link'));
                      setTimeout(() => setToast(null), 2200);
                    }}>
                    {t('Copy link')}
                  </button>
                )}
                <Link className={local ? 'btn btn--sm' : 'btn btn--ghost btn--sm'} to={`/survey/${id}`}>
                  {local ? t('Start collecting answers') : t('Open the survey')}
                </Link>
              </div>
            </div>
            {!local && <QrCode text={link} label={t('QR code for the survey link')} />}
          </div>
        </section>
      )}

      {tl.byGroup.length > 0 && (
        <section className="page__section" aria-labelledby="by-group">
          <span className="label">{t('Group by group')}</span>
          <h2 className="h2" id="by-group" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)' }}>
            {t('Who the simulation')} <em>{t('got right.')}</em>
          </h2>
          <div className="table-scroll panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('Group')}</th>
                  <th style={{ textAlign: 'right' }}>{t('Answers')}</th>
                  <th style={{ textAlign: 'right' }}>{t('Real support')}</th>
                  <th style={{ textAlign: 'right' }}>{t('Predicted support')}</th>
                  <th style={{ textAlign: 'right' }}>{t('Difference')}</th>
                </tr>
              </thead>
              <tbody>
                {tl.byGroup.map((g) => {
                  const p = res.def.predicted.byGroup[g.group] ?? 0;
                  return (
                    <tr key={g.group}>
                      <td>{g.group}</td>
                      <td className="n">{g.n}</td>
                      <td className="n">{g.support}%</td>
                      <td className="n">{p}%</td>
                      <td className="n">{signed(g.support - p)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="reality__note">{t('Groups appear once three or more people in them have answered.')}</p>
        </section>
      )}

      {res.owner && (
        <section className="page__section" aria-labelledby="reasons">
          <span className="label">{t('In their words')}</span>
          <h2 className="h2" id="reasons" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)' }}>
            {t('What real people')} <em>{t('said.')}</em>
          </h2>
          {res.reasons?.length ? (
            <ul className="survey-reasons">
              {res.reasons.map((x, i) => (
                <li key={i} className="panel">
                  <span className="ai-stance" style={{ borderColor: COLOR[x.stance] }}>
                    <i style={{ background: COLOR[x.stance] }} />
                    {t(STANCE[x.stance])}
                  </span>
                  <p>{x.reason}</p>
                  {x.group && <small className="reality__note">{x.group}</small>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="reality__note">{t('No written reasons yet. Only you can see these.')}</p>
          )}
        </section>
      )}

      <section className="page__section">
        <ul className="limits">
          <li>{t('People who answer a shared link aren’t a random sample, so small differences don’t mean much.')}</li>
          <li>{t('Ripple’s prediction was frozen when the survey was made, so this is a fair test of the simulation.')}</li>
          <li>{t('Answers are anonymous. Ripple doesn’t store names, emails or IP addresses with answers.')}</li>
        </ul>
      </section>
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
    </div>
  );
}
