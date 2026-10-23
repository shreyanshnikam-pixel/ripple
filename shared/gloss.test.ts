/**
 * Ripple reads Spanish: a decision typed in Spanish must be read as the same policy as its
 * English twin, starting from the same poll and landing close to the same result.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, simulate } from './engine';
import { glossSpanish, looksSpanish } from './gloss';

const PAIRS: [es: string, en: string][] = [
  ['Prohibir los celulares durante la clase', 'Ban phones during class'],
  ['Prohibir los teléfonos celulares todo el día escolar', 'Ban phones for the entire school day'],
  ['Subir el salario mínimo a $15 la hora', 'Raise the minimum wage to $15 an hour'],
  ['Convertir el estacionamiento del centro en un parque público', 'Turn the downtown parking lot into a public park'],
  ['Empezar la escuela secundaria a las 8:30 a.m. en vez de las 7:30', 'Start high school at 8:30 a.m. instead of 7:30'],
  ['Hacer gratis los autobuses de la ciudad', 'Make city buses free to ride'],
  ['Limitar los aumentos anuales del alquiler al 5%', 'Cap yearly rent increases at 5%'],
  ['Poner policías armados en todas las escuelas', 'Put armed police officers in every school'],
  ['Permitir que los maestros porten armas en la escuela', 'Allow teachers to carry guns at school'],
  ['Prohibir TikTok', 'Ban TikTok'],
  ['Abrir un albergue para personas sin hogar cerca del centro', 'Open a homeless shelter near downtown'],
  ['Construir una granja solar en las afueras', 'Build a solar farm outside town'],
  ['Prohibir las estufas de gas', 'Ban gas stoves'],
  ['Hacer del día de las elecciones un feriado nacional', 'Make Election Day a national holiday'],
  ['Dar almuerzo escolar gratis a todos los estudiantes', 'Make school lunch free for all students'],
  ['Permitir dúplex y casas adosadas en barrios de casas unifamiliares', 'Allow duplexes and townhomes in single-family neighborhoods'],
  ['Subir los impuestos a las grandes corporaciones', 'Raise taxes on large corporations'],
  ['Prohibir que los miembros del Congreso compren y vendan acciones', 'Ban members of Congress from trading individual stocks'],
  ['Aprobar un bono escolar de $40 millones para arreglar edificios viejos', 'Pass a $40 million school bond to fix old school buildings'],
];

for (const [es, en] of PAIRS) {
  test(`“${es}” reads like “${en}”`, () => {
    const a = simulate({ decision: es });
    const b = simulate({ decision: en });
    assert.equal(a.scope, b.scope, `scope ${a.scope} vs ${b.scope} (read as “${glossSpanish(es)}”)`);
    assert.equal(a.reality?.anchor.id, b.reality?.anchor.id, `anchor ${a.reality?.anchor.id} vs ${b.reality?.anchor.id} (read as “${glossSpanish(es)}”)`);
    assert.equal(a.reality?.anchor.support, b.reality?.anchor.support, `starting point (read as “${glossSpanish(es)}”)`);
    assert.ok(Math.abs(a.summary.support - b.summary.support) <= 8, `support ${a.summary.support} vs ${b.summary.support} (read as “${glossSpanish(es)}”)`);
  });
}

test('the decision keeps the words the person typed', () => {
  const r = simulate({ decision: 'Prohibir TikTok' });
  assert.equal(r.decision, 'Prohibir TikTok');
});

test('English is left alone', () => {
  for (const en of ['Ban phones during class', 'Plan a fiesta for the senior class', 'Open a taco truck on Main Street', 'Hire a new Spanish teacher']) {
    assert.equal(looksSpanish(en), false, en);
    assert.deepEqual(analyze(en), analyze(en));
  }
});

test('Spanish is recognized, accents or not', () => {
  for (const es of ['Prohibir los celulares en la escuela', 'Subir el salario minimo', 'Construir mas viviendas para la ciudad']) assert.equal(looksSpanish(es), true, es);
});

test('every example decision has a Spanish version that reads the same', async () => {
  const { EXAMPLES } = await import('./examples');
  const off: string[] = [];
  for (const e of EXAMPLES) {
    const a = simulate({ decision: e.es });
    const b = simulate({ decision: e.text });
    if (a.scope !== b.scope || a.reality?.anchor.id !== b.reality?.anchor.id || Math.abs(a.summary.support - b.summary.support) > 10)
      off.push(`${e.es} → “${glossSpanish(e.es)}”: ${a.scope}/${a.reality?.anchor.id}/${a.summary.support} vs ${b.scope}/${b.reality?.anchor.id}/${b.summary.support}`);
  }
  assert.deepEqual(off, []);
});
