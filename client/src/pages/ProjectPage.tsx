import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QrCode } from '../components/qr';
import { Toast } from '../components/ui';
import { useT } from '../i18n';
import { copyText } from '../lib/clipboard';
import { appUrl } from '../lib/config';
import { addSimulation, credentialFor, getProject, rememberProject, removeItem, type ProjectView } from '../lib/projects';
import { simulatorPath } from '../lib/share';
import { AnimatePresence } from 'framer-motion';
import type { Scope } from '../../../shared/types';

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const SCOPES: Scope[] = ['community', 'school', 'business', 'personal'];

export default function ProjectPage() {
  const { t, lang } = useT();
  const { id = '' } = useParams();
  const [key, setKey] = useState<string | null>(null);
  const [view, setView] = useState<ProjectView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState('');
  const [scope, setScope] = useState<Scope>('community');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  // The private key travels after the # in the link, so it never reaches a server log.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1)).get('k');
    if (hash) {
      rememberProject({ id, key: hash, name: '', kind: 'project' });
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setKey(hash ?? credentialFor(id));
  }, [id]);

  const load = useCallback(() => {
    if (!key) return;
    getProject(id, key)
      .then((v) => {
        setView(v);
        rememberProject({ id, name: v.project.name, kind: v.project.kind, ...(v.role === 'owner' ? { key } : { token: key, nickname: v.me ?? undefined }) });
        document.title = `${v.project.name} · Ripple`;
      })
      .catch((e: Error) => setError(t(e.message)));
  }, [id, key, t]);
  useEffect(load, [load]);
  useEffect(() => {
    const timer = window.setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  if (!key)
    return (
      <div className="wrap page">
        <header className="page__head">
          <span className="label label--foam">{t('Project')}</span>
          <h1 className="display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
            {t('This link is missing its private key.')}
          </h1>
          <p className="lead">{t('Open the project from the full link you saved, or join the class again with its code.')}</p>
          <Link className="btn btn--ghost" to="/projects" style={{ justifySelf: 'start' }}>
            {t('Projects & classes')}
          </Link>
        </header>
      </div>
    );
  if (error && !view)
    return (
      <div className="wrap page">
        <header className="page__head">
          <span className="label label--foam">{t('Project')}</span>
          <h1 className="display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
            {t('We couldn’t open this project.')}
          </h1>
          <p className="lead">{error}</p>
        </header>
      </div>
    );
  if (!view) return <div className="wrap page">{t('Loading…')}</div>;

  const { project: p, role, rollup: r } = view;
  const isClass = p.kind === 'class';
  const privateLink = appUrl(`/p/${p.id}#k=${key}`);
  const joinLink = p.joinCode ? appUrl(`/join?code=${p.joinCode}`) : '';

  const add = async () => {
    if (decision.trim().length < 3) return;
    setBusy(true);
    try {
      await addSimulation(id, key, { decision: decision.trim(), scope });
      setDecision('');
      load();
    } catch (e) {
      flash(e instanceof Error ? t(e.message) : t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap page">
      <header className="page__head">
        <span className="label label--foam">
          {isClass ? t('Class') : t('Project')} · {role === 'owner' ? (isClass ? t('Teacher view') : t('Owner')) : t('Joined as {name}', { name: view.me ?? '' })}
        </span>
        <h1 className="display" style={{ fontSize: 'clamp(2.4rem, 5.4vw, 4.4rem)' }}>
          {p.name}
        </h1>
        <div className="page__stats">
          <div>
            <b className="num">{r.simulations}</b>
            <span>{t('decisions simulated')}</span>
          </div>
          <div>
            <b className="num">{r.surveys}</b>
            <span>{t('surveys')}</span>
          </div>
          <div>
            <b className="num">{r.answers}</b>
            <span>{t('real answers')}</span>
          </div>
          <div>
            <b className="num">{isClass ? view.memberCount : r.averageGap == null ? '—' : r.averageGap}</b>
            <span>{isClass ? t('students') : t('average gap, in points')}</span>
          </div>
        </div>
      </header>

      {role === 'owner' && (
        <section className="page__section proj-share" aria-label={t('Sharing')}>
          {isClass && p.joinCode && (
            <div className="panel proj-code">
              <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
                <span className="label label--foam">{t('Students join with this code')}</span>
                <b className="proj-code__code mono">{p.joinCode}</b>
                <p className="reality__note">{t('Or scan the code, or open {link}', { link: joinLink })}</p>
                <button type="button" className="btn btn--sm" style={{ justifySelf: 'start' }} onClick={async () => flash((await copyText(joinLink)) ? t('Link copied') : t('Couldn’t copy the link'))}>
                  {t('Copy join link')}
                </button>
              </div>
              <QrCode text={joinLink} label={t('QR code to join the class')} />
            </div>
          )}
          <div className="panel" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            <span className="label">{t('Your private link')}</span>
            <p className="reality__note">{t('Anyone with this link can see and change this {kind}. Save it somewhere safe; it’s the only way back in from another device.', { kind: isClass ? t('class') : t('project') })}</p>
            <input className="survey-share__link" readOnly value={privateLink} onFocus={(e) => e.currentTarget.select()} aria-label={t('Your private link')} />
            <button type="button" className="btn btn--ghost btn--sm" style={{ justifySelf: 'start' }} onClick={async () => flash((await copyText(privateLink)) ? t('Link copied') : t('Couldn’t copy the link'))}>
              {t('Copy private link')}
            </button>
          </div>
        </section>
      )}

      <section className="page__section" aria-labelledby="add">
        <span className="label" id="add">
          {t('Add a decision')}
        </span>
        <form
          className="panel proj-add"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label className="sr-only" htmlFor="proj-decision">
            {t('A decision to simulate')}
          </label>
          <input id="proj-decision" value={decision} maxLength={500} onChange={(e) => setDecision(e.target.value)} placeholder={lang === 'es' ? t('Write it in English for now, e.g. “Start school at 8:30 a.m.”') : 'e.g. Start school at 8:30 a.m. instead of 7:30'} />
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} aria-label={t('Who it affects')}>
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {t(s === 'community' ? 'Community' : s === 'school' ? 'School' : s === 'business' ? 'Business' : 'Personal')}
              </option>
            ))}
          </select>
          <button className="btn" type="submit" disabled={busy || decision.trim().length < 3}>
            {busy ? t('Simulating…') : t('Simulate and save')}
          </button>
        </form>
        <p className="reality__note">{t('Or open the simulator: every result has a “Save to project” button, and surveys you create there can be added too.')}</p>
      </section>

      <section className="page__section" aria-labelledby="items">
        <span className="label" id="items">
          {t('Saved work')}
        </span>
        {view.items.length === 0 ? (
          <p className="reality__note">{t('Nothing saved yet.')}</p>
        ) : (
          <ul className="proj-items">
            {view.items.map((it) => {
              const s = it.surveyId ? view.surveys[it.surveyId] : undefined;
              const mine = role === 'owner' || it.author === view.me;
              return (
                <li key={it.id} className="panel proj-item">
                  <div className="proj-item__top">
                    <span className={`basis ${it.kind === 'survey' ? 'basis--poll' : ''}`}>{it.kind === 'survey' ? t('Survey') : t('Simulation')}</span>
                    {it.author && <span className="reality__note">{it.author}</span>}
                    <span className="reality__note">{new Date(it.created).toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <p className="proj-item__decision">“{it.decision}”</p>
                  {it.kind === 'survey' ? (
                    <p className="reality__note">
                      {s && s.n
                        ? t('{n} real answers: {real}% for, vs. {pred}% predicted', { n: s.n, real: s.support, pred: s.predicted })
                        : t('No answers yet. Predicted support: {pred}%', { pred: it.snapshot.support })}
                    </p>
                  ) : (
                    <p className="reality__note">
                      {t(it.snapshot.verdict)} · {t('net {net}', { net: signed(it.snapshot.net) })} · {it.snapshot.support}% / {it.snapshot.oppose}%
                    </p>
                  )}
                  <div className="actions">
                    <Link className="btn btn--ghost btn--sm" to={it.kind === 'survey' && it.surveyId ? `/survey/${it.surveyId}/results` : simulatorPath({ decision: it.decision, scope: it.scope, mix: it.mix, district: it.district ?? undefined })}>
                      {it.kind === 'survey' ? t('See results') : t('Open the report')}
                    </Link>
                    {mine && (
                      <button
                        type="button"
                        className="linkish"
                        onClick={async () => {
                          try {
                            await removeItem(id, key, it.id);
                            load();
                          } catch (e) {
                            flash(e instanceof Error ? t(e.message) : t('Something went wrong.'));
                          }
                        }}
                      >
                        {t('Remove')}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {role === 'owner' && isClass && (
        <section className="page__section" aria-labelledby="students">
          <span className="label" id="students">
            {t('Students')}
          </span>
          {view.members && view.members.length ? (
            <div className="table-scroll panel">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('Nickname')}</th>
                    <th style={{ textAlign: 'right' }}>{t('Items added')}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.members.map((m) => (
                    <tr key={m}>
                      <td>{m}</td>
                      <td className="n">{r.byAuthor.find((a) => a.author === m)?.items ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="reality__note">{t('No students yet. Share the code above.')}</p>
          )}
          {r.averageGap != null && <p className="reality__note">{t('Across this class’s surveys, real support landed {gap} points from Ripple’s prediction on average.', { gap: r.averageGap })}</p>}
        </section>
      )}
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
    </div>
  );
}
