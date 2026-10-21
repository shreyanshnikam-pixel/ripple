// Turns the single-file demo build (dist-artifact/index.html) into a page body
// suitable for hosting as a Claude artifact: the host adds <html>/<head>/<body>.
import fs from 'node:fs';

const src = fs.readFileSync('dist-artifact/index.html', 'utf8');
const title = src.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '<title>Ripple Decision Simulator</title>';
const styles = [...src.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]);
const scripts = [...src.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
const links = [...src.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]).filter((l) => /fonts\.g|rel="icon"/.test(l));
const meta = [...src.matchAll(/<meta\b[^>]*>/g)].map((m) => m[0]).filter((m) => /name="(description|theme-color)"/.test(m));

const out = [
  title,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  ...meta,
  ...links,
  ...styles,
  '<div id="root"></div>',
  ...scripts,
].join('\n');

fs.writeFileSync('dist-artifact/ripple.html', out);
console.log(`dist-artifact/ripple.html written (${(out.length / 1024).toFixed(0)} KB, ${scripts.length} script, ${styles.length} style)`);
