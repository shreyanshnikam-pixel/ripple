import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { compareWithPrediction, type SurveyDef, type SurveyStance } from '../../../shared/surveys';
import { SCOPE_META } from '../../../shared/personas';
import { StanceIcon } from '../components/ui';
import { useT } from '../i18n';
import { answerSurvey, getSurvey, isLocal, mySurveys, surveyResults, type SurveyResults } from '../lib/surveys';

const CHOICES: { id: SurveyStance; label: string; side: 'support' | 'neutral' | 'oppose' }[] = [
  { id: 'support', label: 'For it', side: 'support' },
  { id: 'neutral', label: 'Not sure', side: 'neutral' },
  { id: 'oppose', label: 'Against it', side: 'oppose' },
];

/** Real answers next to Ripple's prediction, as two stacked bars on one scale. */
export function RealVsPredicted({ res }: { res: SurveyResults }) {
  const { t, lang } = useT();
  const p = res.def.predicted;
  const tl = res.tally;
  const rows = [
    { key: 'real', label: t('Real answers ({n})', { n: tl.n }), v: [tl.support, tl.neutral, tl.oppose] },
    { key: 'predicted', label: t('Ripple’s prediction'), v: [p.support, p.neutral, p.oppose] },
  ];
  const cmp = compareWithPrediction(res.def, tl);
  // The engine writes its note in English; in Spanish, rebuild the same sentence from the same numbers.
  const note =
    lang === 'en'
      ? cmp.note
      : !tl.n
        ? t('No answers yet. Share the link and check back.')
        : !cmp.enough
          ? tl.n === 1
            ? t('With {n} answer, treat this as a conversation starter, not a poll.', { n: tl.n })
            : t('With {n} answers, treat this as a conversation starter, not a poll.', { n: tl.n })
          : Math.abs(cmp.gap) <= cmp.margin
            ? t('Real answers land within {margin} points of Ripple’s prediction.', { margin: cmp.margin })
            : cmp.gap > 0
              ? t('Real support is {n} points higher than Ripple predicted. That’s worth understanding: who did the simulation miss?', { n: Math.abs(cmp.gap) })
              : t('Real support is {n} points lower than Ripple predicted. That’s worth understanding: who did the simulation miss?', { n: Math.abs(cmp.gap) });
  return (
    <div className="rvp">
      {rows.map((row) => (
        <div className="rvp__row" key={row.key}>
          <span className="rvp__label">{row.label}</span>
          {row.v[0] + row.v[1] + row.v[2] > 0 ? (
            <div className="stack" role="img" aria-label={t('{label}: {a}% for, {b}% not sure, {c}% against', { label: row.label, a: row.v[0], b: row.v[1], c: row.v[2] })}>
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
          <i style={{ background: 'var(--support)' }} /> {t('For')}
        </span>
        <span className="key">
          <i style={{ background: 'var(--neutral)' }} /> {t('Not sure')}
        </span>
        <span className="key">
          <i style={{ background: 'var(--oppose)' }} /> {t('Against')}
        </span>
      </div>
      <p className="lead" style={{ color: 'var(--paper)', fontSize: '1.05rem' }}>
        {note}
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
  const { t } = useT();

  useEffect(() => {
    document.title = t('A 30-second question · Ripple');
  }, [t]);

  useEffect(() => {
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
          <span className="label label--foam">{t('Survey')}</span>
          <h1 className="display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
            {t('We couldn’t open this survey.')}
          </h1>
          <p className="lead">{t(error)}</p>
          <Link className="btn btn--ghost" to="/" style={{ justifySelf: 'start' }}>
            {t('Go to Ripple')}
          </Link>
        </header>
      </div>
    );

  return (
    <div className="wrap page survey">
      {!def ? (
        <p className="reality__note">{t('Loading the question…')}</p>
      ) : (
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.section key="ask" className="survey__card panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <span className="label label--foam">
                {t('A 30-second question')}
                {def.district ? ` · ${def.district}` : ''}
              </span>
              <h1 className="survey__q">“{def.decision}”</h1>
              <p className="reality__note">
                {
                  {
                    personal: t('Someone is using Ripple to hear from the people in your life a decision would affect. Your answer is anonymous.'),
                    school: t('Someone is using Ripple to hear from the students, staff & families a decision would affect. Your answer is anonymous.'),
                    community: t('Someone is using Ripple to hear from the residents a decision would affect. Your answer is anonymous.'),
                    business: t('Someone is using Ripple to hear from the customers, staff & partners a decision would affect. Your answer is anonymous.'),
                  }[def.scope] ?? t('Someone is using Ripple to hear from the {crowd} a decision would affect. Your answer is anonymous.', { crowd: SCOPE_META[def.scope].crowdNoun })
                }
              </p>
              <div className="survey__choices" role="radiogroup" aria-label={t('Your view')}>
                {CHOICES.map((c) => (
                  <button key={c.id} type="button" role="radio" aria-checked={stance === c.id} className={`survey__choice survey__choice--${c.side}`} onClick={() => setStance(c.id)}>
                    <StanceIcon side={c.side} />
                    {t(c.label)}
                  </button>
                ))}
              </div>
              <label className="survey__field">
                <span className="label">{t('Which describes you best? (optional)')}</span>
                <select value={group} onChange={(e) => setGroup(e.target.value)}>
                  <option value="">{t('Prefer not to say')}</option>
                  {def.groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="survey__field">
                <span className="label">{t('Why? (optional)')}</span>
                <textarea value={reason} maxLength={280} rows={3} onChange={(e) => setReason(e.target.value)} placeholder={t('One or two sentences. Please don’t include names or personal details.')} />
              </label>
              <div className="actions" style={{ alignItems: 'center' }}>
                <button type="button" className="btn" disabled={!stance || busy} onClick={submit}>
                  {busy ? t('Sending…') : t('Send my answer')}
                </button>
                {note && (
                  <span className="error" role="alert">
                    {t(note)}
                  </span>
                )}
              </div>
            </motion.section>
          ) : (
            <motion.section key="done" className="survey__card panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="label label--foam">{note ? t(note) : t('Thanks for answering')}</span>
              <h1 className="survey__q">{t('Here’s how everyone has answered so far.')}</h1>
              <RealVsPredicted res={done} />
              <div className="actions">
                {local ? (
                  <button type="button" className="btn" onClick={next}>
                    {t('Next person')}
                  </button>
                ) : (
                  <Link className="btn" to="/simulate">
                    {t('Try Ripple yourself')}
                  </Link>
                )}
                {mySurveys()[id] && (
                  <Link className="btn btn--ghost" to={`/survey/${id}/results?k=${encodeURIComponent(mySurveys()[id])}`}>
                    {t('See full results')}
                  </Link>
                )}
              </div>
              {local && <p className="reality__note">{t('This survey lives on this device. Hand it to the next person, then press “Next person.”')}</p>}
            </motion.section>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
