import { Link } from 'react-router-dom';
import { BILLS } from '../../../shared/bills';
import { Reveal } from '../components/ui';

const TOOLS = [
  {
    to: '/district',
    stat: '437',
    unit: 'districts',
    title: 'Your district',
    body: 'Enter a ZIP code. Ripple fills the room with your congressional district’s real population from Census data, and shows who represents you.',
  },
  {
    to: '/bills',
    stat: String(BILLS.length),
    unit: 'bills & laws',
    title: 'Real bills in Congress',
    body: 'Read what real bills do in plain words, see how far they got, and simulate the reaction across the country or in your district.',
  },
  {
    to: '/compare',
    stat: '2',
    unit: 'versions, 1 crowd',
    title: 'Compare wordings',
    body: '“During class” or “all day”? Run two versions past the same crowd and see which groups move, and how far.',
  },
  {
    to: '/simulate?d=Ban+phones+during+class&s=school&run=1',
    stat: '30',
    unit: 'second surveys',
    title: 'Listen for real',
    body: 'Turn any simulation into an anonymous survey with a QR code, then watch real answers arrive next to Ripple’s prediction.',
  },
  {
    to: '/simulate?d=Make+Election+Day+a+national+holiday&s=community&run=1',
    stat: 'AI',
    unit: 'report by Claude',
    title: 'The full report',
    body: 'Optional: Claude writes a report from the simulation’s data, with a voice for every group and answers to your follow-up questions.',
  },
  {
    to: '/simulate?d=Ban+members+of+Congress+from+trading+individual+stocks&s=community&run=1',
    stat: '1',
    unit: 'letter away',
    title: 'Take it further',
    body: 'Every report says who decides for real, and drafts a letter to your representative that cites real polls, never simulated numbers.',
  },
];

/** The civic tools around the simulator, from your town to the Capitol. */
export function Toolkit() {
  return (
    <section className="section" aria-labelledby="toolkit-title">
      <div className="wrap">
        <Reveal className="section-head">
          <span className="label label--foam">Civic toolkit</span>
          <h2 className="h2" id="toolkit-title">
            From your town <em>to the Capitol.</em>
          </h2>
          <p className="lead">Ripple connects a simulation to the real world: real people, real places and real bills.</p>
        </Reveal>
        <div className="toolkit">
          {TOOLS.map((t, i) => (
            <Reveal key={t.title} delay={(i % 3) * 0.08}>
              <Link className="tool" to={t.to}>
                <span className="tool__stat">
                  <b>{t.stat}</b> {t.unit}
                </span>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
                <span className="tool__go" aria-hidden="true">
                  →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
