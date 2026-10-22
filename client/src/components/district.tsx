import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { DistrictData } from '../../../shared/districts';
import { describeDistrict } from '../../../shared/districts';
import { PERSONAS } from '../../../shared/personas';
import { useT } from '../i18n';
import { allDistrictOptions, districtFromCode, districtsForZip, loadDistricts, type DistrictPick } from '../lib/district';

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
const money = (x: number) => `$${Math.round(x).toLocaleString()}`;

/** ZIP code → district, with a full list as a fallback. Lookups run on this device. */
export function DistrictPicker({ id, onPick, compact = false }: { id: string; onPick: (p: DistrictPick) => void; compact?: boolean }) {
  const [zip, setZip] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<DistrictPick[]>([]);
  const [options, setOptions] = useState<Awaited<ReturnType<typeof allDistrictOptions>>>([]);
  const [showList, setShowList] = useState(false);
  const { t } = useT();

  useEffect(() => {
    if (showList && !options.length) allDistrictOptions().then(setOptions);
  }, [showList, options.length]);

  const find = async () => {
    setError(null);
    setChoices([]);
    if (!/^\d{5}$/.test(zip.trim())) {
      setError(t('Enter a five-digit ZIP code.'));
      return;
    }
    setBusy(true);
    try {
      const picks = await districtsForZip(zip);
      if (!picks.length) {
        setError(t('That ZIP isn’t a residential area in the Census files (it may be a PO box or business ZIP). Try your home ZIP, or choose your district from the list.'));
        setShowList(true);
      } else if (picks.length === 1) onPick(picks[0]);
      else setChoices(picks);
    } catch {
      setError(t('Couldn’t load the district data. Check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const states = [...new Set(options.map((o) => o.state))];
  return (
    <div className={`district-picker ${compact ? 'district-picker--compact' : ''}`}>
      {/* Not a <form>: this picker also lives inside the simulator's form, and forms can't nest. */}
      <div className="zip-form" role="search" aria-label={t('Find a congressional district by ZIP code')}>
        <label htmlFor={`${id}-zip`} className={compact ? 'sr-only' : 'label'}>
          {t('Your ZIP code')}
        </label>
        <div className="zip-form__row">
          <input
            id={`${id}-zip`}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            placeholder={t('ZIP code')}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                find();
              }
            }}
          />
          <button className="btn btn--sm" type="button" onClick={find} disabled={busy}>
            {busy ? t('Looking up…') : t('Find my district')}
          </button>
          <button type="button" className="linkish" onClick={() => setShowList((s) => !s)} aria-expanded={showList}>
            {showList ? t('Hide the list') : t('Choose from a list')}
          </button>
        </div>
      </div>
      {error && (
        <p className="tips" role="alert">
          {error}
        </p>
      )}
      {choices.length > 0 && (
        <div className="district-choices" role="group" aria-label={t('Districts that include this ZIP code')}>
          <span className="reality__note">{t('This ZIP crosses district lines. Which one is yours?')}</span>
          {choices.map((c) => (
            <button key={c.code} type="button" className="chip" onClick={() => onPick(c)}>
              <b>{c.district.label}</b> {c.district.rep ? `· ${t('Rep. {name}', { name: c.district.rep.name })}` : ''}
            </button>
          ))}
        </div>
      )}
      {showList && (
        <label className="district-select">
          <span className="sr-only">{t('Choose a district')}</span>
          <select
            id={`${id}-select`}
            defaultValue=""
            onChange={async (e) => {
              const p = await districtFromCode(e.target.value);
              if (p) onPick(p);
            }}
          >
            <option value="" disabled>
              {options.length ? t('Choose a district…') : t('Loading districts…')}
            </option>
            {states.map((st) => (
              <optgroup key={st} label={st}>
                {options
                  .filter((o) => o.state === st)
                  .map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label} · {o.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}
      {!compact && <p className="reality__note">{t('Your ZIP code is looked up on this device and never sent anywhere.')}</p>}
    </div>
  );
}

/** A district's profile: who lives there compared with the country, and who represents it. */
export function DistrictCard({ pick }: { pick: DistrictPick }) {
  const [data, setData] = useState<DistrictData | null>(null);
  const { t, lang } = useT();
  useEffect(() => {
    loadDistricts().then(setData);
  }, []);
  if (!data) return null;
  const d = pick.district;
  const lines = describeDistrict(d, data.national);
  const groups = PERSONAS.community.map((p) => ({ id: p.id, group: p.group, x: pick.mix[p.id] ?? 1 })).sort((a, b) => b.x - a.x);
  const and = lang === 'es' ? 'y' : 'and';
  const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} ${and} ${xs[xs.length - 1]}` : xs[0]);
  const more = groups.filter((g) => g.x >= 1.15).slice(0, 2).map((g) => g.group.toLowerCase());
  const fewer = groups.filter((g) => g.x <= 0.85).slice(-2).reverse().map((g) => g.group.toLowerCase());
  const headline =
    more.length && fewer.length
      ? t('Compared with a typical U.S. community: more {more}, and fewer {fewer}.', { more: list(more), fewer: list(fewer) })
      : more.length
        ? t('Compared with a typical U.S. community: more {more}.', { more: list(more) })
        : fewer.length
          ? t('Compared with a typical U.S. community: fewer {fewer}.', { fewer: list(fewer) })
          : t('A close match for a typical U.S. community.');
  return (
    <motion.div className="district-card panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="district-card__head">
        <div>
          <span className="label label--foam">{d.label}</span>
          <h2 className="h2" style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.6rem)' }}>
            {d.name}
          </h2>
          <p className="reality__note">{t('{n} residents', { n: d.pop.toLocaleString() })}</p>
          <p className="district-card__headline">{headline}</p>
        </div>
        <div className="rep">
          <span className="label">{t('Represented by')}</span>
          {d.rep ? (
            <>
              <b>{d.rep.name}</b>
              <span className="reality__note">{d.rep.party}</span>
              <div className="actions">
                {d.rep.url && (
                  <a className="btn btn--ghost btn--sm" href={d.rep.url} target="_blank" rel="noreferrer">
                    {t('Official website ↗')}
                  </a>
                )}
                {d.rep.phone && <span className="mono reality__note">{d.rep.phone}</span>}
              </div>
            </>
          ) : (
            <p className="reality__note">{t('This seat is vacant right now, or the member list hasn’t caught up yet.')}</p>
          )}
          {(data.senators[d.st] ?? []).length > 0 && (
            <div className="rep__senators">
              <span className="label">{t('Senators for {state}', { state: d.state })}</span>
              {data.senators[d.st].map((s) => (
                <span key={s.name}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.name}
                    </a>
                  ) : (
                    s.name
                  )}{' '}
                  · {s.party}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="district-card__grid">
        <div>
          <span className="label">{t('Compared with the whole country')}</span>
          <div className="facts" role="list">
            {lines.map((l) => {
              // Every row shares one scale: the national figure sits at the middle tick, so a bar past it means "more than the country".
              const width = Math.min(1, l.national > 0 ? l.value / l.national / 2 : 0.5);
              return (
                <div className="fact" role="listitem" key={l.label} aria-label={t('{label}: {here} here, {national} nationally', { label: t(l.label), here: l.kind === 'dollars' ? money(l.value) : pct(l.value), national: l.kind === 'dollars' ? money(l.national) : pct(l.national) })}>
                  <div className="fact__top">
                    <span>{t(l.label)}</span>
                    <b className="num">{l.kind === 'dollars' ? money(l.value) : pct(l.value)}</b>
                  </div>
                  <div className="fact__track">
                    <span className="fact__bar" style={{ width: `${width * 100}%` }} />
                    <i className="fact__nat" style={{ left: '50%' }} title={t('National: {value}', { value: l.kind === 'dollars' ? money(l.national) : pct(l.national) })} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="reality__note" style={{ marginTop: 10 }}>
            <span className="key">
              <i style={{ background: 'var(--paper)', width: 3, borderRadius: 1 }} /> {t('National figure.')}
            </span>{' '}
            {t('Past the tick means higher than the country as a whole; twice as high or more fills the bar.')}
            {d.estimated?.length ? ` · ${t('The Census didn’t publish {list} figures for this district, so the national figure is used.', { list: d.estimated.join(` ${and} `) })}` : ''}
          </p>
        </div>
        <div>
          <span className="label">{t('Who’s in the room for community decisions')}</span>
          <ul className="mix-list">
            {groups.map((g) => (
              <li key={g.id}>
                <span>{g.group}</span>
                <b className="num mono" style={{ color: g.x >= 1.15 ? 'var(--foam)' : g.x <= 0.85 ? 'var(--mist)' : 'var(--paper)' }}>
                  ×{g.x.toFixed(2)}
                </b>
              </li>
            ))}
          </ul>
          <p className="reality__note">{t('Relative to a typical U.S. community. Built from the Census figures on the left.')}</p>
        </div>
      </div>
      <p className="reality__note">{t('Sources: {demographics}; {members}.', { demographics: data.sources.demographics, members: data.sources.members })}</p>
    </motion.div>
  );
}
