import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { compareWithPrediction, type SurveyDef, type SurveyStance } from '../../../shared/surveys';
import { SCOPE_META } from '../../../shared/personas';
import { StanceIcon } from '../components/ui';
import { answerSurvey, getSurvey, isLocal, mySurveys, surveyResults, type SurveyResults } from '../lib/surveys';

const CHOICES: { id: SurveyStance; label: string; side: 'support' | 'neutral' | 'oppose' }[] = [
  { id: 'support', label: 'For it', side: 'support' },
  { id: 'neutral', label: 'Not sure', side: 'neutral' },
  { id: 'oppose', label: 'Against it', side: 'oppose' },
];

/** Real answers next to Ripple's prediction, as two stacked bars on one scale. */
export function RealVsPredicted({ res }: { res: SurveyResults }) {
  const p = res.def.predicted;
  const t = res.tally;
  const rows = [
    { label: `Real answers (${t.n})`, v: [t.support, t.neutral, t.oppose] },
    { label: 'Ripple’s prediction', v: [p.support, p.neutral, p.oppose] },
  ];
  const cmp = compareWithPrediction(res.def, t);
  return (
    <div className="rvp">
      {rows.map((row) => (
        <div className="rvp__row" key={row.label}>
          <span className="rvp__label">{row.label}</span>
          {row.v[0] + row.v[1] + row.v[2] > 0 ? (
            <div className="stack" role="img" aria-label={`${row.label}: ${row.v[0]}% for, ${row.v[1]}% not sure, ${row.v[2]}% against`}>
              <div style={{ width: `${row.v[0]}%`, background: 'var(--support)' }} />
              <div style={{ width: `${row.v[1]}%`, background: 'var(--neutral)' }} />
              <div style={{ width: `${row.v[2]}%`, background: 'var(--oppose)' }} />
            </div>
          ) : (
            <div className="stack stack--empty" />
          )}
          <span className="rvp__nums num">
            {row.v[0]}% · {row.v[1]}% · {row.v[2]}%
          </span>
        </div>
      ))}
      <div className="legend">
        <span className="key">
          <i style={{ background: 'var(--support)' }} /> For
        </span>
        <span className="key">
          <i style={{ background: 'var(--neutral)' }} /> Not sure
        </span>
        <span className="key">
          <i style={{ background: 'var(--oppose)' }} /> Against
        </span>
      </div>
      <p className="lead" style={{ color: 'var(--paper)', fontSize: '1.05rem' }}>
        {cmp.note}
      </p>
    </div>
  );
}

export default function Survey() {
  const { id = '' } = useParams();
  const [def, setDef] = useState<SurveyDef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stance, setStance] = useState<SurveyStance | null>(null);
  const [group, setGroup] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<SurveyResults | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const local = isLocal(id);

  useEffect(() => {
    document.title = 'A 30-second question · Ripple';
    getSurvey(id)
      .then(setDef)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const submit = async () => {
    if (!def || !stance || busy) return;
    setBusy(true);
    setNote(null);
    try {
      await answerSurvey(def, { stance, group: group || null, reason: reason.trim() || null });
      setDone(await surveyResults(id, null));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      if (/already answered/.test(msg)) {
        setNote(msg);
        setDone(await surveyResults(id, null).catch(() => null));
      } else setNote(msg);
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    setDone(null);
    setStance(null);
    setGroup('');
    setReason('');
  };

  if (error)
    return (
      <div className="wrap page survey">
        <header className="page__head">
          <span className="label label--foam">Survey</span>
          <h1 className="display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
            We couldn’t open this survey.
          </h1>
          <p className="lead">{error}</p>
          <Link className="btn btn--ghost" to="/" style={{ justifySelf: 'start' }}>
            Go to Ripple
          </Link>
        </header>
      </div>
    );

  return (
    <div className="wrap page survey">
      {!def ? (
        <p className="reality__note">Loading the question…</p>
      ) : (
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.section key="ask" className="survey__card panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <span className="label label--foam">A 30-second question{def.district ? ` · ${def.district}` : ''}</span>
              <h1 className="survey__q">“{def.decision}”</h1>
              <p className="reality__note">
                Someone is using Ripple to hear from the {SCOPE_META[def.scope].crowdNoun} a decision would affect. Your answer is anonymous.
              </p>
              <div className="survey__choices" role="radiogroup" aria-label="Your view">
                {CHOICES.map((c) => (
                  <button key={c.id} type="button" role="radio" aria-checked={stance === c.id} className={`survey__choice survey__choice--${c.side}`} onClick={() => setStance(c.id)}>
                    <StanceIcon side={c.side} />
                    {c.label}
                  </button>
                ))}
              </div>
              <label className="survey__field">
                <span className="label">Which describes you best? (optional)</span>
                <select value={group} onChange={(e) => setGroup(e.target.value)}>
                  <option value="">Prefer not to say</option>
                  {def.groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="survey__field">
                <span className="label">Why? (optional)</span>
                <textarea value={reason} maxLength={280} rows={3} onChange={(e) => setReason(e.target.value)} placeholder="One or two sentences. Please don’t include names or personal details." />
              </label>
              <div className="actions" style={{ alignItems: 'center' }}>
                <button type="button" className="btn" disabled={!stance || busy} onClick={submit}>
                  {busy ? 'Sending…' : 'Send my answer'}
                </button>
                {note && (
                  <span className="error" role="alert">
                    {note}
                  </span>
                )}
              </div>
            </motion.section>
          ) : (
            <motion.section key="done" className="survey__card panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="label label--foam">{note ?? 'Thanks for answering'}</span>
              <h1 className="survey__q">Here’s how everyone has answered so far.</h1>
              <RealVsPredicted res={done} />
              <div className="actions">
                {local ? (
                  <button type="button" className="btn" onClick={next}>
                    Next person
                  </button>
                ) : (
                  <Link className="btn" to="/simulate">
                    Try Ripple yourself
                  </Link>
                )}
                {mySurveys()[id] && (
                  <Link className="btn btn--ghost" to={`/survey/${id}/results?k=${encodeURIComponent(mySurveys()[id])}`}>
                    See full results
                  </Link>
                )}
              </div>
              {local && <p className="reality__note">This survey lives on this device. Hand it to the next person, then press “Next person.”</p>}
            </motion.section>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
