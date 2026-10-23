import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { analyze } from '../../../shared/engine';
import { EXAMPLES } from '../../../shared/examples';
import { PERSONAS, SCOPE_META } from '../../../shared/personas';
import type { Scope, ScopeChoice } from '../../../shared/types';
import { DistrictPicker } from '../components/district';
import { Arrow, useMagnetic } from '../components/ui';
import { useT } from '../i18n';
import type { DistrictPick } from '../lib/district';

const SCOPES: { id: ScopeChoice; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'personal', label: 'Personal' },
  { id: 'school', label: 'School' },
  { id: 'community', label: 'Community' },
  { id: 'business', label: 'Business' },
];

export function Composer({
  decision,
  setDecision,
  scope,
  setScope,
  crowdSize,
  setCrowdSize,
  mix,
  setMix,
  onRun,
  busy,
  district,
  onDistrict,
}: {
  decision: string;
  setDecision: (v: string) => void;
  scope: ScopeChoice;
  setScope: (s: ScopeChoice) => void;
  crowdSize: number;
  setCrowdSize: (n: number) => void;
  mix: Record<string, number>;
  setMix: (m: Record<string, number>) => void;
  onRun: () => void;
  busy: boolean;
  /** The district whose Census population fills the room, if any (e.g. "CA-12"). */
  district: string | null;
  onDistrict: (p: DistrictPick | null) => void;
}) {
  const { t, lang } = useT();
  const live = useMemo(() => (decision.trim().length >= 3 ? analyze(decision, scope) : null), [decision, scope]);
  const btn = useMagnetic<HTMLButtonElement>(0.12);
  const detail = live?.detail ?? 0;
  const detailWord = detail >= 0.75 ? 'Rich' : detail >= 0.45 ? 'Good' : detail > 0 ? 'Thin' : 'Empty';
  const topics = live?.signals.filter((s) => s.kind === 'topic' && !['school', 'civic', 'business'].includes(s.id)) ?? [];
  const effectiveScope: Scope = scope !== 'auto' ? scope : (live?.scope ?? 'community');
  const [roomOpen, setRoomOpen] = useState(false);
  // The mix holds multipliers for every setting's groups (persona ids are unique), so switching
  // settings while typing never throws away a room someone set up.
  const scopeIds = PERSONAS[effectiveScope].map((p) => p.id);
  const customized = scopeIds.some((id) => (mix[id] ?? 1) !== 1);
  const setScopeMix = (m: Record<string, number>, fromDistrict = false) => {
    // Any manual change means the room is no longer exactly the district's population.
    if (!fromDistrict && district) onDistrict(null);
    const next: Record<string, number> = {};
    for (const [k, v] of Object.entries(mix)) if (!scopeIds.includes(k)) next[k] = v;
    for (const [k, v] of Object.entries(m)) if (scopeIds.includes(k) && v !== 1) next[k] = v;
    setMix(next);
  };
  const mitigations = live?.signals.filter((s) => s.kind === 'mitigation') ?? [];

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        onRun();
      }}
    >
      <div style={{ display: 'grid', gap: 10 }}>
        <label className="label" htmlFor="decision">
          {t('The decision')}
        </label>
        <textarea
          id="decision"
          value={decision}
          maxLength={500}
          onChange={(e) => setDecision(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onRun();
            }
          }}
          placeholder={t('e.g. Start high school at 9:00 a.m. instead of 7:30 so students get more sleep')}
        />
      </div>

      <div className="composer__row">
        <div className="signals" aria-live="polite" aria-label={t('What Ripple picked up')}>
          {topics.length === 0 && mitigations.length === 0 && <span style={{ color: 'var(--fog)', fontSize: '0.86rem' }}>{t('Ripple will show what it picks up as you type.')}</span>}
          {live?.anchor && (
            <motion.span
              key={live.anchor.id}
              className={`tag ${live.anchor.basis === 'poll' ? 'tag--poll' : 'tag--foam'}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              title={live.anchor.basis === 'poll' ? t('Ripple will start from a published poll') : t('Ripple will start from its own labeled estimate')}
            >
              {live.anchor.basis === 'poll' ? t('Real poll') : t('Known debate')}
              {' · '}
              {live.anchor.label}
            </motion.span>
          )}
          {topics.map((s) => (
            <motion.span key={s.id} className="tag tag--foam" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} title={t('Matched: {words}', { words: s.matches.join(', ') })}>
              {s.label}
            </motion.span>
          ))}
          {mitigations.map((s) => (
            <motion.span key={s.id} className="tag" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} title={t('Matched: {words}', { words: s.matches.join(', ') })}>
              ✓ {s.label}
            </motion.span>
          ))}
        </div>
        <div className="detail-meter" title={t('How much Ripple could read from your description')}>
          {t('Detail')}
          <div className="detail-meter__bar">
            <span style={{ width: `${Math.round(detail * 100)}%` }} />
          </div>
          <b style={{ color: 'var(--paper)', fontWeight: 600, minWidth: 44 }}>{t(detailWord)}</b>
        </div>
      </div>

      {live?.readAs && (
        <p className="reality__note composer__readas" title={t('Ripple’s keywords are in English, so it reads Spanish word by word. Results use what you typed.')}>
          {t('Ripple read it as: “{text}”', { text: live.readAs })}
        </p>
      )}

      {live?.tips[0] && (
        <p className="tips">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          {live.tips[0]}
        </p>
      )}

      <div className="composer__row">
        <div style={{ display: 'grid', gap: 8 }}>
          <span className="label" id="scope-label">
            {t('Who it affects')}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby="scope-label">
            {SCOPES.map((s) => (
              <button type="button" key={s.id} role="radio" aria-checked={scope === s.id} onClick={() => setScope(s.id)}>
                {scope === s.id && <motion.span layoutId="seg" className="seg-bg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                <span>
                  {t(s.label)}
                  {s.id === 'auto' && live && scope === 'auto' ? ` · ${t(SCOPE_META[live.scope].label)}` : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <label className="label" htmlFor="crowd-size">
            {t('Crowd size')}
          </label>
          <div className="range">
            <input id="crowd-size" type="range" min={250} max={2000} step={250} value={crowdSize} onChange={(e) => setCrowdSize(Number(e.target.value))} />
            <span className="num" style={{ color: 'var(--paper)', minWidth: 90 }}>
              {t('{n} people', { n: crowdSize.toLocaleString() })}
            </span>
          </div>
        </div>
        <button className="btn" type="submit" disabled={busy || decision.trim().length < 3} ref={btn} style={{ alignSelf: 'end' }}>
          {busy ? t('Simulating…') : t('Simulate reactions')} <Arrow />
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <button type="button" className="linkish room-toggle" aria-expanded={roomOpen} aria-controls="room-panel" onClick={() => setRoomOpen((o) => !o)}>
          {roomOpen ? '−' : '+'} {t('Who’s in the room')}
          {effectiveScope === 'community' && district ? ` (${t('{district} population', { district })})` : customized ? ` (${t('customized')})` : ''}: {t(SCOPE_META[effectiveScope].crowdNoun)}
        </button>
        {roomOpen && (
          <RoomPanel
            scope={effectiveScope}
            mix={mix}
            setMix={setScopeMix}
            district={district}
            onDistrict={(p) => {
              if (p) setScopeMix(p.mix, true);
              onDistrict(p);
            }}
          />
        )}
      </div>

      <div className="examples-row">
        <span className="label" style={{ marginRight: 4 }}>
          {t('Try')}
        </span>
        {[EXAMPLES[0], EXAMPLES[5], EXAMPLES[8], EXAMPLES[13]].map((e) => ({ ...e, text: lang === 'es' ? e.es : e.text })).map((e) => (
          <button
            type="button"
            key={e.text}
            className="chip"
            aria-pressed={decision === e.text}
            onClick={() => {
              setDecision(e.text);
              setScope('auto');
            }}
          >
            {e.text}
          </button>
        ))}
      </div>
    </form>
  );
}

const PRESETS: Record<Scope, { label: string; mix: Record<string, number> }[]> = {
  community: [
    { label: 'Typical town', mix: {} },
    { label: 'College town', mix: { priya: 2.5, kevin: 1.8, sam: 1.6, harold: 0.5, rosa: 0.7 } },
    { label: 'Retirement community', mix: { harold: 3, rosa: 2, priya: 0.4, maria: 0.6, kevin: 0.5 } },
    { label: 'Big city', mix: { kevin: 2.2, sam: 1.8, darnell: 1.3, harold: 0.6 } },
    { label: 'Small town', mix: { harold: 1.8, darnell: 1.6, rosa: 1.4, sam: 0.4, kevin: 0.6 } },
  ],
  school: [
    { label: 'Whole school community', mix: {} },
    { label: 'Student vote', mix: { alvarez: 0.25, carter: 0.25, price: 0.15, dawson: 0.25, park: 0.25, jordan: 2, maya: 2, ortega: 2 } },
    { label: 'Staff meeting', mix: { alvarez: 3, dawson: 2, price: 2, park: 2, jordan: 0.1, maya: 0.1, ortega: 0.1, carter: 0.3 } },
    { label: 'Parent night', mix: { carter: 4, alvarez: 0.8, jordan: 0.3, maya: 0.3, ortega: 0.3 } },
  ],
  business: [
    { label: 'Everyone', mix: {} },
    { label: 'Customers', mix: { diane: 2, jaylen: 2, zoe: 1.5, marcus: 0.2, elena: 0.2, hale: 0.1, ben: 0.2 } },
    { label: 'Team meeting', mix: { marcus: 3, elena: 2, hale: 1, diane: 0.1, jaylen: 0.1, zoe: 0.1, gloria: 0.1, ben: 0.3 } },
  ],
  personal: [
    { label: 'Everyone close to you', mix: {} },
    { label: 'Family', mix: { mom: 2, joe: 2, jamie: 2, priyanka: 1.5, alex: 0.3, rivera: 0.3 } },
    { label: 'Friends', mix: { alex: 3, taylor: 1.5, mom: 0.5, joe: 0.3, priyanka: 0.5 } },
  ],
};

function RoomPanel({
  scope,
  mix,
  setMix,
  district,
  onDistrict,
}: {
  scope: Scope;
  mix: Record<string, number>;
  setMix: (m: Record<string, number>) => void;
  district: string | null;
  onDistrict: (p: DistrictPick | null) => void;
}) {
  const { t } = useT();
  const people = PERSONAS[scope];
  const same = (a: Record<string, number>, b: Record<string, number>) => people.every((p) => (a[p.id] ?? 1) === (b[p.id] ?? 1));
  return (
    <motion.div id="room-panel" className="room" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
      <p style={{ color: 'var(--mist)', fontSize: '0.88rem' }}>
        {t('The same decision lands differently in a retirement community and a college town. Pick a room, or set how much of the crowd each group makes up.')}
      </p>
      {scope === 'community' && (
        <div className="room__district">
          {district ? (
            <span className="district-pill">
              {t('Using the Census population of {district}', { district })}
              <button type="button" aria-label={t('Stop using {district}', { district })} title={t('Back to a typical town')} onClick={() => setMix({})}>
                ×
              </button>
            </span>
          ) : (
            <>
              <span className="label">{t('Use your congressional district’s real population')}</span>
              <DistrictPicker id="room-district" compact onPick={(p) => onDistrict(p)} />
            </>
          )}
        </div>
      )}
      <div className="room__presets" role="group" aria-label={t('Room presets')}>
        {PRESETS[scope].map((pr) => (
          <button type="button" key={pr.label} className="chip" aria-pressed={same(mix, pr.mix)} onClick={() => setMix(pr.mix)}>
            {t(pr.label)}
          </button>
        ))}
      </div>
      <div className="room__grid">
        {people.map((p) => {
          const v = mix[p.id] ?? 1;
          return (
            <label className="room__row" key={p.id}>
              <span>{p.group}</span>
              <input type="range" min={0} max={4} step={0.25} value={v} aria-label={t('How many {group} are in the room', { group: p.group.toLowerCase() })} onChange={(e) => setMix({ ...mix, [p.id]: Number(e.target.value) })} />
              <span className="mono num" style={{ textAlign: 'right' }}>
                ×{v.toFixed(v % 1 ? 2 : 0)}
              </span>
            </label>
          );
        })}
      </div>
    </motion.div>
  );
}

const STAGES = ['Reading your decision', 'Choosing the voices in the room', 'Simulating {n} people', 'Letting opinions spread for a year', 'Writing your report'];

export function Loading({ stage, crowdSize }: { stage: number; crowdSize: number }) {
  const { t } = useT();
  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="loading__rings" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <b />
      </div>
      <ul className="stages">
        {STAGES.map((s, i) => (
          <li key={s} className={i < stage ? 'is-done' : i === stage ? 'is-now' : ''}>
            <span className="dot">{i < stage ? '✓' : ''}</span>
            {t(s, { n: crowdSize.toLocaleString() })}
          </li>
        ))}
      </ul>
    </div>
  );
}
