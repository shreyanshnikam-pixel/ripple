import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SimulationResult } from '../../../shared/types';
import { QrCode } from '../components/qr';
import { Reveal } from '../components/ui';
import { copyText } from '../lib/clipboard';
import { appUrl } from '../lib/config';
import { createSurvey } from '../lib/surveys';

/** "Listen for real": turn the simulated question into a 30-second survey for real people. */
export function ListenPanel({ r, district, onCopied }: { r: SimulationResult; district: string | null; onCopied: (ok: boolean) => void }) {
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
      setError(e instanceof Error ? e.message : 'Couldn’t create the survey.');
    } finally {
      setBusy(false);
    }
  };

  const link = made ? appUrl(`/survey/${made.id}`) : '';
  const results = made ? `/survey/${made.id}/results?k=${encodeURIComponent(made.key)}` : '';
  return (
    <Reveal className="panel listen">
      <div className="listen__text">
        <span className="label label--foam">Listen for real</span>
        <h3>Ask the real people.</h3>
        <p className="reality__note">
          Turn this question into a 30-second anonymous survey. Ripple saves today’s prediction, so you can see how close the simulation was, group
          by group, as real answers come in.
        </p>
        {!made && (
          <div className="actions">
            <button type="button" className="btn btn--sm" onClick={create} disabled={busy}>
              {busy ? 'Creating…' : 'Create a survey'}
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
              <p className="reality__note">This copy of Ripple has no server, so the survey lives on this device: open it and pass the device around.</p>
            ) : (
              <input className="survey-share__link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Survey link" />
            )}
            <div className="actions">
              {!made.local && (
                <button type="button" className="btn btn--sm" onClick={async () => onCopied(await copyText(link))}>
                  Copy survey link
                </button>
              )}
              <Link className={made.local ? 'btn btn--sm' : 'btn btn--ghost btn--sm'} to={made.local ? `/survey/${made.id}` : results}>
                {made.local ? 'Start collecting answers' : 'Watch the results'}
              </Link>
              {made.local && (
                <Link className="btn btn--ghost btn--sm" to={results}>
                  Results
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
      {made && !made.local && <QrCode text={link} label="QR code for the survey link" />}
    </Reveal>
  );
}
