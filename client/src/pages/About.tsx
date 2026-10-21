import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TEAM } from '../content/team';
import { Reveal, SplitHeading } from '../components/ui';

const STACK = [
  ['React + TypeScript', 'the interface'],
  ['GSAP, Lenis & Framer Motion', 'scroll and motion design'],
  ['Canvas 2D', 'the ripple field and the 1,000-person crowd'],
  ['Node.js + Express', 'the API, surveys and AI proxy'],
  ['A custom simulation engine', 'anchors, personas and opinion dynamics, shared by server and browser'],
  ['U.S. Census Bureau data', 'district demographics'],
  ['Claude by Anthropic (optional)', 'AI-written reports and voices'],
] as const;

export default function About() {
  useEffect(() => {
    document.title = 'About · Ripple';
  }, []);
  const names = TEAM.members.map((m) => m.name).filter(Boolean);
  return (
    <div className="wrap page">
      <header className="page__head">
        <span className="label label--foam">About</span>
        <SplitHeading as="h1" immediate className="display" lines={[['Built', 'to'], [<em key="w">widen</em>, 'the', 'circle.']]} />
        <p className="lead">
          Ripple helps people make decisions that land on other people: student councils, city councils, families and small businesses. It
          shows how a crowd of simulated people would react, why, and what would change their minds, then sends you to talk to the real
          ones.
        </p>
      </header>

      <section className="page__section about-grid">
        <Reveal className="panel about-card">
          <span className="label">Who built it</span>
          <h2 className="h2" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>
            {names.length ? names.join(', ') : 'A high school student'}
          </h2>
          <p>
            {[TEAM.school, TEAM.district && `Congressional district ${TEAM.district}`].filter(Boolean).join(' · ') ||
              'Built for the 2026 Congressional App Challenge.'}
          </p>
          {TEAM.story && <p className="about-story">“{TEAM.story}”</p>}
          {TEAM.links.length > 0 && (
            <div className="actions">
              {TEAM.links.map((l) => (
                <a key={l.url} className="btn btn--ghost btn--sm" href={l.url} target="_blank" rel="noreferrer">
                  {l.label} ↗
                </a>
              ))}
            </div>
          )}
        </Reveal>
        <Reveal className="panel about-card" delay={0.08}>
          <span className="label">The Congressional App Challenge</span>
          <p>
            The Congressional App Challenge is a competition for middle and high school students, hosted by members of the U.S. House of
            Representatives in their districts. Ripple was built for it, with a focus on civic life: how decisions in schools, towns and
            Congress affect real people.
          </p>
          <a className="reality__source" href="https://www.congressionalappchallenge.us/" target="_blank" rel="noreferrer">
            congressionalappchallenge.us ↗
          </a>
        </Reveal>
      </section>

      <section className="page__section" aria-labelledby="why">
        <h2 className="h2" id="why">
          Why <em>Ripple?</em>
        </h2>
        <div className="principles">
          <Reveal className="principle">
            <h3>Decisions skip people</h3>
            <p>Most decisions are made by a few people for many. The ones affected most, like students, renters and shift workers, are often the last to be asked.</p>
          </Reveal>
          <Reveal className="principle" delay={0.06}>
            <h3>Empathy is a skill</h3>
            <p>Hearing a retiree, a working parent and a freshman react to the same idea is a fast way to see a decision from every side.</p>
          </Reveal>
          <Reveal className="principle" delay={0.12}>
            <h3>Rehearse, then listen</h3>
            <p>Ripple prepares you for the real conversation. Its survey tool lets you check the simulation against what real people say.</p>
          </Reveal>
        </div>
      </section>

      <section className="page__section" aria-labelledby="stack">
        <h2 className="h2" id="stack">
          How it’s <em>built.</em>
        </h2>
        <ul className="stack-list">
          {STACK.map(([what, why]) => (
            <li key={what}>
              <b>{what}</b>
              <span>{why}</span>
            </li>
          ))}
        </ul>
        <p className="reality__note" style={{ marginTop: 18 }}>
          Every number’s source is listed on the <Link to="/methodology">Methodology</Link> page.
        </p>
      </section>

      <section className="page__section" aria-labelledby="privacy">
        <h2 className="h2" id="privacy">
          Privacy, <em>plainly.</em>
        </h2>
        <ul className="limits">
          <li>No accounts, no ads, no tracking.</li>
          <li>Your recent decisions are saved only in your own browser.</li>
          <li>Survey answers are anonymous: Ripple never asks for names, emails or locations.</li>
          <li>AI features are optional. When you use them, your decision and its simulated results are sent to Anthropic to write the report.</li>
          <li>ZIP codes are looked up on your device and never sent anywhere.</li>
        </ul>
      </section>
    </div>
  );
}
