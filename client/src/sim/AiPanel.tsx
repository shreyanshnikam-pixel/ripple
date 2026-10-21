import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { reportMarkdown, type AiReport, type ChatTurn } from '../../../shared/ai';
import type { SimulationResult } from '../../../shared/types';
import { aiMode, requestAnswer, requestReport, storedKey, storeKey, type AiMode } from '../lib/ai';
import { copyText } from '../lib/clipboard';

const STANCE = { for: 'For', against: 'Against', split: 'Split', undecided: 'Undecided' } as const;
const STANCE_COLOR = { for: 'var(--support)', against: 'var(--oppose)', split: 'var(--mist)', undecided: 'var(--neutral)' } as const;

const WAIT = ['Reading the simulation', 'Weighing every group', 'Checking the starting poll', 'Writing the report'];

function KeyForm({ onKey }: { onKey: (key: string) => void }) {
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
        This copy of Ripple runs without a server, so the AI report uses your own Anthropic API key. The key goes straight from this browser to
        Anthropic and is never sent to Ripple. Create one at{' '}
        <a className="reality__source" href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
          console.anthropic.com
        </a>
        . A report costs a few cents.
      </p>
      <div className="ai-key__row">
        <label className="sr-only" htmlFor="ai-key">
          Anthropic API key
        </label>
        <input id="ai-key" type="password" autoComplete="off" spellCheck={false} placeholder="sk-ant-…" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn btn--sm" type="submit" disabled={!value.trim()}>
          Use this key
        </button>
      </div>
      <label className="ai-key__remember">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember it on this device (otherwise it’s forgotten when you close the tab)
      </label>
    </form>
  );
}

function Ask({ mode, r, district, apiKey }: { mode: AiMode; r: SimulationResult; district: string | null; apiKey: string | null }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const asked = turns.filter((t) => t.role === 'user').length;
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
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };
  const starters = ['Who is most likely to change their mind?', 'What would make this fairer?', 'What is the biggest risk?'];
  return (
    <div className="ai-ask">
      <span className="label">Ask a follow-up</span>
      {turns.length > 0 && (
        <ol className="ai-ask__log" aria-live="polite">
          {turns.map((t, i) => (
            <li key={i} className={`ai-ask__turn ai-ask__turn--${t.role}`}>
              <span className="label">{t.role === 'user' ? 'You' : 'Claude'}</span>
              <p>{t.content}</p>
            </li>
          ))}
          {busy && (
            <li className="ai-ask__turn ai-ask__turn--assistant">
              <span className="label">Claude</span>
              <p className="ai-dots" aria-label="Thinking">
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
            Your question
          </label>
          <input id="ai-q" value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Why are retirees against it?" disabled={busy} />
          <button className="btn btn--sm" type="submit" disabled={busy || !q.trim()}>
            Ask
          </button>
        </form>
      ) : (
        <p className="reality__note">That’s six questions. Start a new report to keep going.</p>
      )}
      {turns.length === 0 && (
        <div className="examples-row">
          {starters.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => ask(s)} disabled={busy}>
              {s}
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
  return (
    <motion.div className="ai-report" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <div className="panel ai-report__lead">
        <span className="label label--foam">Written by Claude from this simulation</span>
        <h3 className="ai-report__headline">{rep.headline}</h3>
        {rep.summary.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="ai-report__grid">
        <div className="panel">
          <span className="label">Group by group</span>
          <ul className="ai-list">
            {rep.groups.map((g) => (
              <li key={g.group}>
                <span className="ai-stance" style={{ borderColor: STANCE_COLOR[g.stance] }}>
                  <i style={{ background: STANCE_COLOR[g.stance] }} />
                  {STANCE[g.stance]}
                </span>
                <b>{g.group}</b> {g.why}
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <span className="label">Recommendations</span>
          <ul className="ai-list">
            {rep.recommendations.map((f) => (
              <li key={f.title}>
                <b>{f.title}.</b> {f.why}
              </li>
            ))}
          </ul>
          <span className="label" style={{ marginTop: 18 }}>
            Risks
          </span>
          <ul className="ai-list">
            {rep.risks.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="panel">
        <span className="label">Questions to ask real people</span>
        <ol className="ai-questions">
          {rep.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </div>
      <div>
        <span className="label">Simulated voices, written by Claude</span>
        <div className="ai-voices">
          {rep.voices.map((v) => (
            <figure key={v.group} className="panel ai-voice">
              <blockquote>“{v.quote}”</blockquote>
              <figcaption className="reality__note">{v.group} (simulated)</figcaption>
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

/** The optional AI layer: a full report, Claude-written voices, and follow-up questions. */
export function AiPanel({ r, district, onFlash }: { r: SimulationResult; district: string | null; onFlash: (msg: string) => void }) {
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
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
            Claude reads this simulation’s data, every group, the starting poll and the tested fixes, and writes a full report: who’s affected and
            why, risks, recommendations, questions to ask real people, and a voice for each group.
          </p>
          {mode === null && <p className="reality__note">Checking whether AI is available…</p>}
          {mode === 'byok' && !apiKey && <KeyForm onKey={setApiKey} />}
          {ready && (
            <div className="actions" style={{ alignItems: 'center' }}>
              <button type="button" className="btn" onClick={write} disabled={busy}>
                {busy ? 'Writing…' : 'Write the full report'}
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
                  Forget my key
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
                {WAIT[step]}… this takes about half a minute.
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
            <button type="button" className="btn btn--sm" onClick={async () => onFlash((await copyText(reportMarkdown(r, report))) ? 'Report copied as Markdown' : 'Couldn’t copy the report')}>
              Copy report
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReport(null)}>
              Write a new one
            </button>
          </div>
        </>
      )}
      {ready && mode && <Ask key={r.id} mode={mode} r={r} district={district} apiKey={apiKey} />}
      <p className="reality__note">
        AI writing can contain mistakes. Claude only sees this simulation’s data, and its report describes simulated people, not real survey results.
      </p>
    </div>
  );
}
