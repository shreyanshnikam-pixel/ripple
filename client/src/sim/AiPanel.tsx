import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { reportMarkdown, type AiReport, type ChatTurn } from '../../../shared/ai';
import type { SimulationResult } from '../../../shared/types';
import { aiMode, requestAnswer, requestReport, storedKey, storeKey, type AiMode } from '../lib/ai';
import { copyText } from '../lib/clipboard';
import { useT } from '../i18n';

const STANCE = { for: 'For', against: 'Against', split: 'Split', undecided: 'Undecided' } as const;
const STANCE_COLOR = { for: 'var(--support)', against: 'var(--oppose)', split: 'var(--mist)', undecided: 'var(--neutral)' } as const;

const WAIT = ['Reading the simulation', 'Weighing every group', 'Checking the starting poll', 'Writing the report'];

function KeyForm({ onKey }: { onKey: (key: string) => void }) {
  const { t } = useT();
  const [value, setValue] = useState('');
  const [remember, setRemember] = useState(false);
  return (
    <form
      className="ai-key"
      onSubmit={(e) => {
        e.preventDefault();
        const k = value.trim();
        if (!k) return;
        storeKey(k, remember);
        onKey(k);
      }}
    >
      <p className="reality__note">
        {t('This copy of Ripple runs without a server, so the AI report uses your own free Gemini API key. The key goes straight from this browser to Google and is never sent to Ripple. Get one free at')}{' '}
        <a className="reality__source" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
          aistudio.google.com/apikey
        </a>
        . {t('Google’s free tier covers it.')}
      </p>
      <div className="ai-key__row">
        <label className="sr-only" htmlFor="ai-key">
          {t('Gemini API key')}
        </label>
        <input id="ai-key" type="password" autoComplete="off" spellCheck={false} placeholder="AIza… or AQ.…" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn btn--sm" type="submit" disabled={!value.trim()}>
          {t('Use this key')}
        </button>
      </div>
      <label className="ai-key__remember">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> {t('Remember it on this device (otherwise it’s forgotten when you close the tab)')}
      </label>
    </form>
  );
}

function Ask({ mode, r, district, apiKey }: { mode: AiMode; r: SimulationResult; district: string | null; apiKey: string | null }) {
  const { t } = useT();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const asked = turns.filter((turn) => turn.role === 'user').length;
  const ask = async (question: string) => {
    const text = question.trim().slice(0, 500);
    if (!text || busy) return;
    const history: ChatTurn[] = [...turns, { role: 'user', content: text }];
    setTurns(history);
    setQ('');
    setBusy(true);
    setError(null);
    try {
      const a = await requestAnswer(mode, r, district, apiKey, history);
      setTurns([...history, { role: 'assistant', content: a }]);
    } catch (err) {
      setTurns(turns);
      setQ(text);
      setError(err instanceof Error ? err.message : t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };
  const starters = ['Who is most likely to change their mind?', 'What would make this fairer?', 'What is the biggest risk?'];
  return (
    <div className="ai-ask">
      <span className="label">{t('Ask a follow-up')}</span>
      {turns.length > 0 && (
        <ol className="ai-ask__log" aria-live="polite">
          {turns.map((turn, i) => (
            <li key={i} className={`ai-ask__turn ai-ask__turn--${turn.role}`}>
              <span className="label">{turn.role === 'user' ? t('You') : 'Gemini'}</span>
              <p>{turn.content}</p>
            </li>
          ))}
          {busy && (
            <li className="ai-ask__turn ai-ask__turn--assistant">
              <span className="label">Gemini</span>
              <p className="ai-dots" aria-label={t('Thinking')}>
                <i />
                <i />
                <i />
              </p>
            </li>
          )}
        </ol>
      )}
      {asked < 6 ? (
        <form
          className="district-run__form"
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <label className="sr-only" htmlFor="ai-q">
            {t('Your question')}
          </label>
          <input id="ai-q" value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} placeholder={t('e.g. Why are retirees against it?')} disabled={busy} />
          <button className="btn btn--sm" type="submit" disabled={busy || !q.trim()}>
            {t('Ask')}
          </button>
        </form>
      ) : (
        <p className="reality__note">{t('That’s six questions. Start a new report to keep going.')}</p>
      )}
      {turns.length === 0 && (
        <div className="examples-row">
          {starters.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => ask(t(s))} disabled={busy}>
              {t(s)}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Report({ rep }: { rep: AiReport }) {
  const { t } = useT();
  return (
    <motion.div className="ai-report" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <div className="panel ai-report__lead">
        <span className="label label--foam">{t('Written by Gemini from this simulation')}</span>
        <h3 className="ai-report__headline">{rep.headline}</h3>
        {rep.summary.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="ai-report__grid">
        <div className="panel">
          <span className="label">{t('Group by group')}</span>
          <ul className="ai-list">
            {rep.groups.map((g) => (
              <li key={g.group}>
                <span className="ai-stance" style={{ borderColor: STANCE_COLOR[g.stance] }}>
                  <i style={{ background: STANCE_COLOR[g.stance] }} />
                  {t(STANCE[g.stance])}
                </span>
                <b>{g.group}</b> {g.why}
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <span className="label">{t('Recommendations')}</span>
          <ul className="ai-list">
            {rep.recommendations.map((f) => (
              <li key={f.title}>
                <b>{f.title}.</b> {f.why}
              </li>
            ))}
          </ul>
          <span className="label" style={{ marginTop: 18 }}>
            {t('Risks')}
          </span>
          <ul className="ai-list">
            {rep.risks.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="panel">
        <span className="label">{t('Questions to ask real people')}</span>
        <ol className="ai-questions">
          {rep.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </div>
      <div>
        <span className="label">{t('Simulated voices, written by Gemini')}</span>
        <div className="ai-voices">
          {rep.voices.map((v) => (
            <figure key={v.group} className="panel ai-voice">
              <blockquote>“{v.quote}”</blockquote>
              <figcaption className="reality__note">{t('{group} (simulated)', { group: v.group })}</figcaption>
            </figure>
          ))}
        </div>
      </div>
      <ul className="limits">
        {rep.caveats.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </motion.div>
  );
}

/** The optional AI layer: a full report, Gemini-written voices, and follow-up questions. */
export function AiPanel({ r, district, onFlash }: { r: SimulationResult; district: string | null; onFlash: (msg: string) => void }) {
  const { t } = useT();
  const [mode, setMode] = useState<AiMode | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(storedKey);
  const [report, setReport] = useState<AiReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    aiMode().then(setMode);
  }, []);
  useEffect(() => {
    setReport(null);
    setError(null);
  }, [r.id]);
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const ready = mode === 'server' || (mode === 'byok' && !!apiKey);
  const write = async () => {
    if (!mode || busy) return;
    setBusy(true);
    setError(null);
    setStep(0);
    timer.current = window.setInterval(() => setStep((s) => Math.min(s + 1, WAIT.length - 1)), 4500);
    try {
      setReport(await requestReport(mode, r, district, apiKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Something went wrong.'));
    } finally {
      if (timer.current) clearInterval(timer.current);
      setBusy(false);
    }
  };

  return (
    <div className="ai">
      {!report && (
        <div className="panel ai__start">
          <p className="lead" style={{ color: 'var(--paper)' }}>
            {t('Gemini reads this simulation’s data, every group, the starting poll and the tested fixes, and writes a full report: who’s affected and why, risks, recommendations, questions to ask real people, and a voice for each group.')}
          </p>
          {mode === null && <p className="reality__note">{t('Checking whether AI is available…')}</p>}
          {mode === 'byok' && !apiKey && <KeyForm onKey={setApiKey} />}
          {ready && (
            <div className="actions" style={{ alignItems: 'center' }}>
              <button type="button" className="btn" onClick={write} disabled={busy}>
                {busy ? t('Writing…') : t('Write the full report')}
              </button>
              {mode === 'byok' && (
                <button
                  type="button"
                  className="linkish"
                  onClick={() => {
                    storeKey(null);
                    setApiKey(null);
                  }}
                >
                  {t('Forget my key')}
                </button>
              )}
            </div>
          )}
          <AnimatePresence>
            {busy && (
              <motion.p className="ai-wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status">
                <span className="ai-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                {t('{step}… this can take a minute or two when Gemini is busy.', { step: t(WAIT[step]) })}
              </motion.p>
            )}
          </AnimatePresence>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      {report && (
        <>
          <Report rep={report} />
          <div className="actions">
            <button type="button" className="btn btn--sm" onClick={async () => onFlash((await copyText(reportMarkdown(r, report))) ? t('Report copied as Markdown') : t('Couldn’t copy the report'))}>
              {t('Copy report')}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReport(null)}>
              {t('Write a new one')}
            </button>
          </div>
        </>
      )}
      {ready && mode && <Ask key={r.id} mode={mode} r={r} district={district} apiKey={apiKey} />}
      <p className="reality__note">
        {t('AI writing can contain mistakes. Gemini only sees this simulation’s data, and its report describes simulated people, not real survey results.')}
      </p>
    </div>
  );
}
