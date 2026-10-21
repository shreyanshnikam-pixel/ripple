import { simulate } from '../shared/engine';
import { EXAMPLES } from '../shared/examples';
const extra = ['Should our school ban phones?', 'We should replace the cafeteria menu with healthier options', 'Should the city council approve a new homeless shelter downtown?', 'asdf', 'Lincoln High should start school later'];
for (const t of [...EXAMPLES.map(e=>e.text), ...extra]) {
  const t0 = performance.now();
  const r = simulate({ decision: t });
  const ms = (performance.now()-t0).toFixed(0);
  console.log(`\n[${r.scope}] ${t}  (${ms}ms)\n  phrase="${r.analysis.phrase}" self="${r.analysis.selfPhrase}" signals=${r.analysis.signals.map(s=>s.id).join(',')}`);
  console.log(`  ${r.summary.verdict}: S${r.summary.support} N${r.summary.neutral} O${r.summary.oppose} net${r.summary.net} -> Y1 ${r.summary.longTermNet} pol=${r.summary.polarization} risk=${r.summary.backlashRisk}`);
  console.log(`  ${r.summary.headline}`);
  console.log('  groups: ' + r.groups.map(g=>`${g.group}:${g.net}`).join(' | '));
  console.log('  quote: ' + r.personas[0].name + ': ' + r.personas[0].quote);
  console.log('  recs: ' + r.recommendations.map(x=>`${x.title}(+${x.projectedLift})`).join(', '));
}
