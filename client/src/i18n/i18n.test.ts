import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ES } from './es';
import { translate } from './index';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Every literal t('...') call in the client. */
function calls(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) { if (f.name !== 'i18n') walk(p); }
      else if (/\.tsx?$/.test(f.name) && !f.name.endsWith('.test.ts')) {
        const src = fs.readFileSync(p, 'utf8');
        for (const m of src.matchAll(/\bt\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) out.push({ file: path.relative(SRC, p), text: m[2].replace(/\\(['"`\\])/g, '$1') });
      }
    }
  };
  walk(SRC);
  return out;
}

test('every translated string has a Spanish version', () => {
  const missing = calls().filter((c) => !(c.text in ES));
  assert.deepEqual(missing.map((m) => `${m.file}: ${m.text}`), []);
});

test('placeholders survive translation', () => {
  for (const [en, es] of Object.entries(ES)) {
    const want = (en.match(/\{\w+\}/g) ?? []).sort().join(',');
    const got = (es.match(/\{\w+\}/g) ?? []).sort().join(',');
    assert.equal(got, want, `"${en}" → "${es}"`);
  }
});

test('translate falls back to English and fills placeholders', () => {
  assert.equal(translate('es', 'Open the simulator'), 'Abrir el simulador');
  assert.equal(translate('es', 'A sentence nobody translated'), 'A sentence nobody translated');
  assert.equal(translate('en', 'Hi {name}', { name: 'Ana' }), 'Hi Ana');
});
