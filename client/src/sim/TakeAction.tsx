import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BILL_STAGES, billsForTopic } from '../../../shared/bills';
import { isConversation, letterFor, whoDecides } from '../../../shared/civics';
import type { SimulationResult } from '../../../shared/types';
import { DistrictPicker } from '../components/district';
import { Reveal } from '../components/ui';
import { copyText } from '../lib/clipboard';
import { useT } from '../i18n';
import type { DistrictPick } from '../lib/district';

/**
 * "Take it further": who decides this for real, and a starter letter to them.
 * `home` is the district to write from; `yours` says whether the person chose it (or it came with a shared link).
 */
export function TakeAction({ r, home, yours, onPick, onCopied }: { r: SimulationResult; home: DistrictPick | null; yours: boolean; onPick: (p: DistrictPick) => void; onCopied: (ok: boolean) => void }) {
  const { t, lang } = useT();
  const who = whoDecides(r);
  const rep = home?.district.rep ?? null;
  const target = home ? { label: home.district.label, rep } : null;
  const [text, setText] = useState(() => letterFor(r, target));
  const [edited, setEdited] = useState(false);

  // A new result or a newly chosen district refreshes the draft, unless the person has started writing.
  useEffect(() => {
    if (!edited) setText(letterFor(r, home ? { label: home.district.label, rep: home.district.rep } : null));
  }, [r, home, edited]);

  const conversation = isConversation(who.level);
  const bills = r.reality ? billsForTopic(r.reality.anchor.id) : [];
  return (
    <div className="act">
      <Reveal className="panel act__who">
        <span className="label">{t('Who decides')}</span>
        <h3>{who.title}</h3>
        <p className="reality__note">{who.detail}</p>

        {who.level === 'federal' &&
          (home ? (
            <div className="rep">
              <span className="label">{yours ? t('Your representative') : t('Representative for {district}', { district: home.district.label })}</span>
              {rep ? (
                <>
                  <b>{rep.name}</b>
                  <span className="reality__note">
                    {rep.party} · {home.district.label}
                  </span>
                  <div className="actions">
                    {rep.url && (
                      <a className="btn btn--ghost btn--sm" href={rep.url} target="_blank" rel="noreferrer">
                        {t('Official website')} ↗
                      </a>
                    )}
                    {rep.phone && (
                      <a className="mono reality__note" href={`tel:${rep.phone.replace(/[^\d+]/g, '')}`}>
                        {rep.phone}
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="reality__note">{t('The seat for {district} is vacant right now. You can still write to your senators.', { district: home.district.label })}</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <span className="label">{t('Find your representative')}</span>
              <DistrictPicker id="act-district" compact onPick={onPick} />
            </div>
          ))}

        {bills.length > 0 && (
          <div className="act__bills">
            <span className="label">{t('In Congress')}</span>
            {bills.map((b) => (
              <a key={b.id} className="act__bill" href={b.url} target="_blank" rel="noreferrer">
                <span className="bill__number mono">{b.number}</span>
                <span>
                  <b>{b.title}</b>
                  <small>
                    {t(BILL_STAGES.find((s) => s.id === b.stage)?.label ?? '')} · {t('{n}th Congress', { n: b.congress })} ↗
                  </small>
                </span>
              </a>
            ))}
            <Link className="linkish" to="/bills">
              {t('See all real bills')}
            </Link>
          </div>
        )}

        {who.level === 'local' && (
          <p className="reality__note">
            {t('Look for “agendas” or “public comment” on your city or county website. Written comments usually count the same as speaking at the meeting.')}
            {home?.district.rep ? ` ${t('In Congress, {district} is represented by {name}.', { district: home.district.label, name: home.district.rep.name })}` : ''}
          </p>
        )}
      </Reveal>

      <Reveal className="panel act__letter" delay={0.08}>
        <span className="label label--foam">{conversation ? t('A conversation starter') : t('A starter letter')}</span>
        <p className="reality__note">
          {conversation
            ? t('Ripple’s voices are a rehearsal. Ask the real people, and listen for what the simulation missed.')
            : t('Fill in the brackets in your own words. It cites real polls only, never Ripple’s simulated numbers.')}
        </p>
        {lang === 'es' && (
          <p className="reality__note">
            {conversation
              ? 'Este mensaje de ejemplo está en inglés por ahora. Puedes reescribirlo en español con tus propias palabras.'
              : 'Esta carta de ejemplo está en inglés por ahora. Si prefieres, escribe la tuya en español con tus propias palabras.'}
          </p>
        )}
        <label className="sr-only" htmlFor="act-letter">
          {conversation ? t('Your message') : t('Your letter')}
        </label>
        <textarea
          id="act-letter"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setEdited(true);
          }}
        />
        <div className="actions">
          <button type="button" className="btn btn--sm" onClick={async () => onCopied(await copyText(text))}>
            {conversation ? t('Copy message') : t('Copy letter')}
          </button>
          {edited && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setEdited(false);
                setText(letterFor(r, target));
              }}
            >
              {t('Start over')}
            </button>
          )}
        </div>
      </Reveal>
    </div>
  );
}
