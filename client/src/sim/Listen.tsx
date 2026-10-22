import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SimulationResult } from '../../../shared/types';
import { QrCode } from '../components/qr';
import { Reveal } from '../components/ui';
import { copyText } from '../lib/clipboard';
import { appUrl } from '../lib/config';
import { createSurvey } from '../lib/surveys';
import { SaveToProject } from './SaveToProject';
import { useT } from '../i18n';

/** "Listen for real": turn the simulated question into a 30-second survey for real people. */
export function ListenPanel({ r, district, onCopied, onFlash }: { r: SimulationResult; district: string | null; onCopied: (ok: boolean) => void; onFlash?: (msg: string) => void }) {
  const { t } = useT();
  const [made, setMade] = useState<{ id: string; key: string; local: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setMade(null);
    setError(null);
  }, [r.id]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      setMade(await createSurvey(r, district));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Couldn’t create the survey.'));
    } finally {
      setBusy(false);
    }
  };

  const link = made ? appUrl(`/survey/${made.id}`) : '';
  const results = made ? `/survey/${made.id}/results?k=${encodeURIComponent(made.key)}` : '';
  return (
    <Reveal className="panel listen">
      <div className="listen__text">
        <span className="label label--foam">{t('Listen for real')}</span>
        <h3>{t('Ask the real people.')}</h3>
        <p className="reality__note">
          {t('Turn this question into a 30-second anonymous survey. Ripple saves today’s prediction, so you can see how close the simulation was, group by group, as real answers come in.')}
        </p>
        {!made && (
          <div className="actions">
            <button type="button" className="btn btn--sm" onClick={create} disabled={busy}>
              {busy ? t('Creating…') : t('Create a survey')}
            </button>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {made && (
          <div style={{ display: 'grid', gap: 10 }}>
            {made.local ? (
              <p className="reality__note">{t('This copy of Ripple has no server, so the survey lives on this device: open it and pass the device around.')}</p>
            ) : (
              <input className="survey-share__link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label={t('Survey link')} />
            )}
            <div className="actions">
              {!made.local && (
                <button type="button" className="btn btn--sm" onClick={async () => onCopied(await copyText(link))}>
                  {t('Copy survey link')}
                </button>
              )}
              <Link className={made.local ? 'btn btn--sm' : 'btn btn--ghost btn--sm'} to={made.local ? `/survey/${made.id}` : results}>
                {made.local ? t('Start collecting answers') : t('Watch the results')}
              </Link>
              {!made.local && onFlash && <SaveToProject r={r} district={district} surveyId={made.id} onDone={onFlash} />}
              {made.local && (
                <Link className="btn btn--ghost btn--sm" to={results}>
                  {t('Results')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
      {made && !made.local && <QrCode text={link} label={t('QR code for the survey link')} />}
    </Reveal>
  );
}
