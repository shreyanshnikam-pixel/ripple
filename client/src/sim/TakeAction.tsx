import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BILL_STAGES, billsForTopic } from '../../../shared/bills';
import { isConversation, letterFor, whoDecides } from '../../../shared/civics';
import type { SimulationResult } from '../../../shared/types';
import { DistrictPicker } from '../components/district';
import { Reveal } from '../components/ui';
import { copyText } from '../lib/clipboard';
import type { DistrictPick } from '../lib/district';

/**
 * "Take it further": who decides this for real, and a starter letter to them.
 * `home` is the district to write from; `yours` says whether the person chose it (or it came with a shared link).
 */
export function TakeAction({ r, home, yours, onPick, onCopied }: { r: SimulationResult; home: DistrictPick | null; yours: boolean; onPick: (p: DistrictPick) => void; onCopied: (ok: boolean) => void }) {
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
        <span className="label">Who decides</span>
        <h3>{who.title}</h3>
        <p className="reality__note">{who.detail}</p>

        {who.level === 'federal' &&
          (home ? (
            <div className="rep">
              <span className="label">{yours ? 'Your representative' : `Representative for ${home.district.label}`}</span>
              {rep ? (
                <>
                  <b>{rep.name}</b>
                  <span className="reality__note">
                    {rep.party} · {home.district.label}
                  </span>
                  <div className="actions">
                    {rep.url && (
                      <a className="btn btn--ghost btn--sm" href={rep.url} target="_blank" rel="noreferrer">
                        Official website ↗
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
                <p className="reality__note">The seat for {home.district.label} is vacant right now. You can still write to your senators.</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <span className="label">Find your representative</span>
              <DistrictPicker id="act-district" compact onPick={onPick} />
            </div>
          ))}

        {bills.length > 0 && (
          <div className="act__bills">
            <span className="label">In Congress</span>
            {bills.map((b) => (
              <a key={b.id} className="act__bill" href={b.url} target="_blank" rel="noreferrer">
                <span className="bill__number mono">{b.number}</span>
                <span>
                  <b>{b.title}</b>
                  <small>{BILL_STAGES.find((s) => s.id === b.stage)?.label} · {b.congress}th Congress ↗</small>
                </span>
              </a>
            ))}
            <Link className="linkish" to="/bills">
              See all real bills
            </Link>
          </div>
        )}

        {who.level === 'local' && (
          <p className="reality__note">
            Look for “agendas” or “public comment” on your city or county website. Written comments usually count the same as speaking at the meeting.
            {home?.district.rep ? ` In Congress, ${home.district.label} is represented by ${home.district.rep.name}.` : ''}
          </p>
        )}
      </Reveal>

      <Reveal className="panel act__letter" delay={0.08}>
        <span className="label label--foam">{conversation ? 'A conversation starter' : 'A starter letter'}</span>
        <p className="reality__note">
          {conversation
            ? 'Ripple’s voices are a rehearsal. Ask the real people, and listen for what the simulation missed.'
            : 'Fill in the brackets in your own words. It cites real polls only, never Ripple’s simulated numbers.'}
        </p>
        <label className="sr-only" htmlFor="act-letter">
          {conversation ? 'Your message' : 'Your letter'}
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
            {conversation ? 'Copy message' : 'Copy letter'}
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
              Start over
            </button>
          )}
        </div>
      </Reveal>
    </div>
  );
}
