import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="wrap not-found">
      <div style={{ display: 'grid', gap: 20, justifyItems: 'center' }}>
        <span className="label">404</span>
        <h1 className="h2">This page made no waves.</h1>
        <Link className="btn" to="/">
          Back to Ripple
        </Link>
      </div>
    </section>
  );
}
