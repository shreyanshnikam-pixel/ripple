// Prints one line per decision: a quick realism check across many kinds of decisions.
import { simulate } from '../shared/engine';
const list = process.argv.slice(2).length ? process.argv.slice(2) : [
  'ban all devices', 'Ban all devices at school', 'Ban phones during class', 'Ban phones for the entire school day', 'Lift the ban on phones at school',
  'Start high school at 9:00 a.m. instead of 7:30 so students get more sleep', 'Switch our district to a four-day school week', 'Replace final exams with group projects',
  'Turn the downtown parking lot into a public park', 'Ban gas-powered leaf blowers in our town starting next spring', 'Raise the local sales tax by 1% to fund a new library',
  'Make city buses free for everyone', "I'm thinking about quitting my job to start a bakery", 'Should I take a gap year before college?', 'Move across the country for a new job',
  'Raise our café prices by 15% to pay staff a living wage', 'Let our employees work remote on Fridays', 'Switch our shop to 100% compostable packaging',
  'Ban TikTok', 'Raise the minimum wage to $20', 'Require school uniforms', 'Get rid of homework', 'Cancel summer break', 'Cut the school music program',
  'Ban cars downtown', 'Plant 500 trees downtown', 'Cancel prom', 'Give every student a free laptop', 'Close the old library', 'Build a new skate park',
  'Require everyone to wear a mask indoors', 'Make school end at noon', 'Paint the hallways blue', 'Drop out of high school', 'Adopt a dog', 'Ban junk food in the cafeteria',
  'Replace our cashiers with self-checkout kiosks', 'Require employees to return to the office five days a week', 'Allow students to use ChatGPT for homework',
  'Ban social media for kids under 16', 'Install speed cameras near every school', 'Build 300 new apartments downtown', 'Set a 10 p.m. curfew for teens',
];
for (const d of list) {
  const r = simulate({ decision: d, crowdSize: 600 });
  const s = r.summary;
  const g = [...r.groups].sort((a, b) => b.net - a.net);
  const a = r.reality!.anchor;
  console.log(`${String(s.support).padStart(3)}% for ${String(s.oppose).padStart(3)}% vs | ${r.scope.padEnd(9)} | ${(a.basis + ':' + a.label).slice(0, 44).padEnd(44)} | ${d.slice(0, 58).padEnd(58)} | top ${g[0].group} ${g[0].net}, low ${g[g.length - 1].group} ${g[g.length - 1].net}`);
}
