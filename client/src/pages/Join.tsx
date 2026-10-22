import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { HAS_SERVER } from '../lib/config';
import { JoinForm } from './Projects';

/** Where a class's QR code or join link lands. */
export default function Join() {
  const { t } = useT();
  const [params] = useSearchParams();
  useEffect(() => {
    document.title = `${t('Join a class')} · Ripple`;
  }, [t]);
  return (
    <div className="wrap page survey">
      <header className="page__head">
        <span className="label label--foam">{t('Join a class')}</span>
        <h1 className="display" style={{ fontSize: 'clamp(2.4rem, 5.4vw, 4.2rem)' }}>
          {t('Your teacher started a class on Ripple.')}
        </h1>
      </header>
      {HAS_SERVER ? <JoinForm initialCode={(params.get('code') ?? '').toUpperCase()} /> : <p className="lead">{t('Projects and classes need the Ripple server, and this copy runs only in your browser. Everything else works here.')}</p>}
    </div>
  );
}
