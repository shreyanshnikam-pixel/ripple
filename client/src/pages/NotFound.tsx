import { Link } from 'react-router-dom';
import { useT } from '../i18n';

export default function NotFound() {
  const { t } = useT();
  return (
    <section className="wrap not-found">
      <div style={{ display: 'grid', gap: 20, justifyItems: 'center' }}>
        <span className="label">404</span>
        <h1 className="h2">{t('This page made no waves.')}</h1>
        <Link className="btn" to="/">
          {t('Back to Ripple')}
        </Link>
      </div>
    </section>
  );
}
