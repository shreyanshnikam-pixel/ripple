import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { PROJECTS_ON_DEVICE } from '../lib/projects';
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
      {PROJECTS_ON_DEVICE && <p className="reality__note proj-ondevice">{t('This copy of Ripple runs without a server, so projects and classes are saved on this device. Students join a class on the same device (a classroom computer, or a phone passed around). To let students join from their own devices, run Ripple with its server (see the README).')}</p>}
      <JoinForm initialCode={(params.get('code') ?? '').toUpperCase()} />
    </div>
  );
}
