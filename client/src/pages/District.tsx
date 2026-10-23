import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PERSONAS } from '../../../shared/personas';
import { DistrictCard, DistrictPicker } from '../components/district';
import { LocalDecisions } from '../components/LocalDecisions';
import { Arrow, Reveal, SplitHeading } from '../components/ui';
import { useT } from '../i18n';
import { districtFromCode, recalledDistrict, rememberDistrict, type DistrictPick } from '../lib/district';
import { simulatorPath } from '../lib/share';

const IDEAS = [
  'Ban members of Congress from trading individual stocks',
  'Raise the federal minimum wage to $15 an hour',
  'Make Election Day a national holiday',
  'Raise the local sales tax by 1% to fund a new library',
  'Make city buses free to ride',
  'Build 500 affordable apartments downtown',
];

/** Which Census measure stands behind each community voice. */
const BASIS: Record<string, string> = {
  harold: 'share of residents 65 and older',
  priya: 'residents under 18, plus college students',
  maria: 'share of residents under 18',
  darnell: 'self-employed workers',
  lena: 'jobs in education, health care and social assistance',
  sam: 'young adults with college degrees',
  kevin: 'residents 25 to 34, transit riders and remote workers',
  rosa: 'homeowners (who pay property tax directly)',
};

export default function District() {
  const navigate = useNavigate();
  const [pick, setPick] = useState<DistrictPick | null>(null);
  const [changing, setChanging] = useState(false);
  const [decision, setDecision] = useState('');
  const { t, lang } = useT();

  useEffect(() => {
    document.title = t('Your district · Ripple');
  }, [t]);

  useEffect(() => {
    const saved = recalledDistrict();
    if (saved) districtFromCode(saved).then((p) => p && setPick(p));
  }, []);

  const choose = (p: DistrictPick) => {
    setPick(p);
    setChanging(false);
    rememberDistrict(p.code);
  };

  const simulate = (text: string) => {
    if (!pick || text.trim().length < 3) return;
    navigate(simulatorPath({ decision: text.trim(), scope: 'community', mix: pick.mix, district: pick.district.label }));
  };

  const runLocal = (d: { decision: string; scope: 'community' | 'school' | 'business' | 'personal' }) =>
    navigate(simulatorPath(pick ? { decision: d.decision, scope: d.scope, mix: pick.mix, district: pick.district.label } : { decision: d.decision, scope: d.scope }));

  return (
    <div className="wrap page">
      <header className="page__head">
        <span className="label label--foam">{t('Your district')}</span>
        <SplitHeading
          as="h1"
          immediate
          className="display"
          lines={
            lang === 'es'
              ? [['Tus', 'vecinos,'], [<em key="e">en</em>, <em key="l">la</em>, <em key="s">sala.</em>]]
              : [['Your', 'neighbors,'], [<em key="r">in</em>, <em key="t">the</em>, <em key="m">room.</em>]]
          }
        />
        <p className="lead">
          {t(
            'Every congressional district is a different crowd. Enter your ZIP code and Ripple builds the room from your district’s real population in U.S. Census data, shows who represents you, and lets you simulate any decision with your neighbors.',
          )}
        </p>
      </header>

      <section className="page__section" aria-label={t('Find your district')}>
        <AnimatePresence mode="wait" initial={false}>
          {!pick || changing ? (
            <motion.div key="picker" className="panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <DistrictPicker id="district-page" onPick={choose} />
            </motion.div>
          ) : (
            <motion.div key={pick.code} style={{ display: 'grid', gap: 20 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="actions" style={{ alignItems: 'center' }}>
                <span className="district-pill">
                  {pick.district.label} · {t('remembered on this device')}
                  <button
                    type="button"
                    aria-label={t('Forget my district')}
                    title={t('Forget my district')}
                    onClick={() => {
                      rememberDistrict(null);
                      setPick(null);
                    }}
                  >
                    ×
                  </button>
                </span>
                <button type="button" className="linkish" onClick={() => setChanging(true)}>
                  {t('Change district')}
                </button>
              </div>
              <DistrictCard pick={pick} />

              <Reveal className="panel district-run">
                <span className="label label--foam">{t('Simulate for {district}', { district: pick.district.label })}</span>
                <h2 className="h2" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)' }}>
                  {lang === 'es' ? (
                    <>
                      ¿Qué pensaría <em>tu distrito</em>?
                    </>
                  ) : (
                    <>
                      What would <em>your district</em> think?
                    </>
                  )}
                </h2>
                <form
                  className="district-run__form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    simulate(decision);
                  }}
                >
                  <label htmlFor="district-decision" className="sr-only">
                    {t('A decision to simulate')}
                  </label>
                  <input id="district-decision" value={decision} maxLength={500} onChange={(e) => setDecision(e.target.value)} placeholder={t('Type a decision, like “Add bike lanes on Main Street”')} />
                  <button className="btn" type="submit" disabled={decision.trim().length < 3}>
                    {t('Simulate')} <Arrow />
                  </button>
                </form>
                <div className="examples-row">
                  <span className="label" style={{ marginRight: 4 }}>
                    {t('Or try')}
                  </span>
                  {IDEAS.map((idea) => (
                    <button key={idea} type="button" className="chip" onClick={() => simulate(idea)}>
                      {idea}
                    </button>
                  ))}
                </div>
              </Reveal>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="page__section" aria-labelledby="local">
        <span className="label">{t('Local decisions')}</span>
        <h2 className="h2" id="local">
          {lang === 'es' ? (
            <>
              Lo que se decide <em>en tu ciudad.</em>
            </>
          ) : (
            <>
              What gets decided <em>in your town.</em>
            </>
          )}
        </h2>
        <p className="lead" style={{ maxWidth: '62ch' }}>
          {pick
            ? t('Parks, bond votes, school start times: the questions city councils and school boards settle. Pick one to run it with {district}’s crowd.', { district: pick.district.label })
            : t('Parks, bond votes, school start times: the questions city councils and school boards settle. Pick one to simulate it, or enter your ZIP code above to run it with your district’s crowd.')}
        </p>
        <LocalDecisions onRun={runLocal} place={pick?.district.label} />
        <p className="reality__note">{t('Most of these start from a published national poll. Your town may differ, which is why every report ends with a way to ask real people.')}</p>
      </section>

      <section className="page__section" aria-labelledby="how-room">
        <span className="label">{t('How the room is built')}</span>
        <h2 className="h2" id="how-room">
          {t('From Census tables')} <em>{t('to voices.')}</em>
        </h2>
        <p className="lead">
          {t(
            'Ripple’s eight community voices each stand for a group. For your district, each group’s share of the room grows or shrinks with the Census measure that best describes it, compared with the national figure. A district with twice the national share of retirees gets more retirees in its crowd.',
          )}
        </p>
        <ul className="stack-list">
          {PERSONAS.community.map((p) => (
            <li key={p.id}>
              <b>{p.group}</b>
              <span>{t(BASIS[p.id] ?? 'a typical share')}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="page__section" aria-labelledby="district-sources">
        <span className="label">{t('Sources and limits')}</span>
        <h2 className="h2" id="district-sources" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)' }}>
          {t('Where the numbers')} <em>{t('come from.')}</em>
        </h2>
        <ul className="limits">
          <li>
            {t('Population figures: U.S. Census Bureau,')}{' '}
            <a href="https://www.census.gov/programs-surveys/acs" target="_blank" rel="noreferrer">
              American Community Survey
            </a>{' '}
            {t('2024 1-year estimates for the districts of the 119th Congress. Survey estimates have margins of error.')}
          </li>
          <li>
            {t(
              'ZIP codes: the Census Bureau’s 2020 ZIP Code Tabulation Area to congressional district relationship file. Some ZIP codes cross district lines, so Ripple asks which one is yours. PO boxes and business-only ZIP codes aren’t residential areas and won’t match.',
            )}
          </li>
          <li>
            {t('Members of Congress:')}{' '}
            <a href="https://github.com/unitedstates/congress-legislators" target="_blank" rel="noreferrer">
              unitedstates/congress-legislators
            </a>{' '}
            {t('(public domain). To double-check your representative, use the House’s')}{' '}
            <a href="https://www.house.gov/representatives/find-your-representative" target="_blank" rel="noreferrer">
              Find Your Representative
            </a>
            {t(' tool.')}
          </li>
          <li>{t('Several states have redrawn their maps for the 2026 elections. Ripple uses the districts of the current Congress.')}</li>
          <li>{t('Your ZIP code is looked up on this device. Ripple only remembers the district you choose, and only in this browser.')}</li>
        </ul>
      </section>
    </div>
  );
}
