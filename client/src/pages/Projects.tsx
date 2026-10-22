import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SplitHeading } from '../components/ui';
import { useT } from '../i18n';
import { HAS_SERVER } from '../lib/config';
import { createProject, joinClass, savedProjects, type SavedProject } from '../lib/projects';

function CreateForm({ kind, onDone }: { kind: 'project' | 'class'; onDone: (id: string) => void }) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="panel proj-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          onDone((await createProject(name, kind)).id);
        } catch (err) {
          setError(err instanceof Error ? t(err.message) : t('Something went wrong.'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="label label--foam">{kind === 'class' ? t('For teachers and club leaders') : t('For you or your team')}</span>
      <h2 className="proj-form__title">{kind === 'class' ? t('Start a class') : t('Start a project')}</h2>
      <p className="reality__note">
        {kind === 'class'
          ? t('Students join with a code and a nickname. Every simulation and survey they add rolls up here, with how close the predictions were.')
          : t('Keep a semester’s decisions, surveys and results in one place, like a student council’s.')}
      </p>
      <label className="sr-only" htmlFor={`new-${kind}`}>
        {t('Name')}
      </label>
      <div className="district-run__form">
        <input id={`new-${kind}`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={kind === 'class' ? t('e.g. Civics, period 3') : t('e.g. Student council, fall 2026')} />
        <button className="btn" type="submit" disabled={busy || name.trim().length < 2}>
          {busy ? t('Creating…') : t('Create')}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function JoinForm({ initialCode = '' }: { initialCode?: string }) {
  const { t } = useT();
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode);
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="panel proj-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          navigate(`/p/${(await joinClass(code, nickname)).id}`);
        } catch (err) {
          setError(err instanceof Error ? t(err.message) : t('Something went wrong.'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="label label--foam">{t('For students')}</span>
      <h2 className="proj-form__title">{t('Join a class')}</h2>
      <div className="proj-join">
        <label>
          <span className="label">{t('Class code')}</span>
          <input value={code} maxLength={8} autoCapitalize="characters" spellCheck={false} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" className="mono" />
        </label>
        <label>
          <span className="label">{t('Nickname')}</span>
          <input value={nickname} maxLength={24} onChange={(e) => setNickname(e.target.value)} placeholder={t('e.g. Maya R.')} />
        </label>
        <button className="btn" type="submit" disabled={busy || code.trim().length < 6 || nickname.trim().length < 2}>
          {busy ? t('Joining…') : t('Join')}
        </button>
      </div>
      <p className="reality__note">{t('Use a first name or a nickname. Never your full name, email or phone number.')}</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export default function Projects() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [mine, setMine] = useState<SavedProject[]>([]);
  useEffect(() => {
    document.title = `${t('Projects & classes')} · Ripple`;
    setMine(savedProjects());
  }, [t]);

  return (
    <div className="wrap page">
      <header className="page__head">
        <span className="label label--foam">{t('Projects & classes')}</span>
        <SplitHeading
          as="h1"
          immediate
          className="display"
          lines={lang === 'es' ? [['Tu', 'trabajo,'], [<em key="t">en</em>, <em key="o">un</em>, <em key="l">solo</em>, <em key="u">lugar.</em>]] : [['Keep', 'your', 'work'], [<em key="t">together.</em>]]}
        />
        <p className="lead">
          {t('Save decisions and surveys to a project, or run Ripple with a whole class. No accounts or passwords: a project opens with its private link, and students join with a code.')}
        </p>
      </header>

      {!HAS_SERVER ? (
        <p className="lead">{t('Projects and classes need the Ripple server, and this copy runs only in your browser. Everything else works here.')}</p>
      ) : (
        <>
          {mine.length > 0 && (
            <section className="page__section" aria-labelledby="mine">
              <span className="label" id="mine">
                {t('On this device')}
              </span>
              <div className="proj-list">
                {mine.map((p) => (
                  <Link key={p.id} className="proj-card" to={`/p/${p.id}`}>
                    <span className="basis">{p.kind === 'class' ? t('Class') : t('Project')}</span>
                    <b>{p.name}</b>
                    <small>{p.key ? t('You own this') : t('Joined as {name}', { name: p.nickname ?? '' })}</small>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section className="page__section proj-grid" aria-label={t('Start or join')}>
            <CreateForm kind="project" onDone={(id) => navigate(`/p/${id}`)} />
            <CreateForm kind="class" onDone={(id) => navigate(`/p/${id}`)} />
            <JoinForm />
          </section>
        </>
      )}
    </div>
  );
}
