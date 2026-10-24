/**
 * Records Ripple's demo video: a scripted walkthrough of the real app at 1920×1080,
 * with captions, title cards and a visible cursor, saved as an MP4 (under 3 minutes).
 * It also writes captions (.srt) and a timed narration script (.md) to read over it.
 *
 * Needs: the app running (npm run build && npm start), ffmpeg, and Playwright with Chromium
 *   npm i -D playwright && npx playwright install chromium
 *
 * Run:
 *   NAME="Your Name" SCHOOL="Your School" node scripts/video/record-demo.mjs
 *
 * Options (environment variables):
 *   BASE_URL  where the app runs        (default http://localhost:8787)
 *   NAME      your name for the cards   (optional)
 *   SCHOOL    your school               (optional)
 *   GRADE     your grade, e.g. Freshman (optional)
 *   ZIP       a ZIP code in your district (default 48104)
 *   OUT       output file               (default ripple-demo.mp4)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = (process.env.BASE_URL ?? 'http://localhost:8787').replace(/\/$/, '');
const NAME = process.env.NAME ?? '';
const SCHOOL = process.env.SCHOOL ?? '';
const GRADE = process.env.GRADE ?? '';
const ZIP = process.env.ZIP ?? '48104';
const OUT = path.resolve(process.env.OUT ?? 'ripple-demo.mp4');
const W = 1920;
const H = 1080;

// ───────────────────────── in-page overlay: cursor, captions, cards ─────────────────────────
const OVERLAY = () => {
  const css = `
  #demo-cursor{position:fixed;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;
    border:2px solid rgba(238,240,247,.95);background:rgba(166,240,218,.18);box-shadow:0 2px 14px rgba(0,0,0,.5);
    pointer-events:none;z-index:2147483646;transition:transform .12s ease}
  #demo-cursor.down{transform:scale(.72);background:rgba(166,240,218,.55)}
  #demo-card.on ~ #demo-cursor{opacity:0}
  #demo-cap{position:fixed;left:50%;bottom:54px;transform:translate(-50%,16px);max-width:1520px;width:max-content;
    padding:18px 30px 20px;border-radius:20px;background:rgba(9,13,28,.86);backdrop-filter:blur(14px);
    border:1px solid rgba(166,240,218,.28);box-shadow:0 30px 80px -20px rgba(0,0,0,.8);opacity:0;
    transition:opacity .45s ease,transform .45s cubic-bezier(.22,1,.36,1);pointer-events:none;z-index:2147483645;text-align:center}
  #demo-cap.on{opacity:1;transform:translate(-50%,0)}
  #demo-cap small{display:block;margin-bottom:6px;font:500 15px/1.2 "IBM Plex Mono",monospace;letter-spacing:.14em;
    text-transform:uppercase;color:#a6f0da}
  #demo-cap span{font:500 31px/1.35 "Schibsted Grotesk",system-ui,sans-serif;color:#eef0f7}
  #demo-card{position:fixed;inset:0;z-index:2147483644;display:grid;place-items:center;background:#0b1020;
    opacity:0;transition:opacity .7s ease;pointer-events:none}
  #demo-card.on{opacity:1}
  #demo-card .in{display:grid;justify-items:center;gap:22px;text-align:center}
  #demo-card .mark{width:96px;height:96px}
  #demo-card h1{margin:0;font:340 150px/0.95 Fraunces,Georgia,serif;letter-spacing:-.03em;color:#eef0f7;
    font-variation-settings:'opsz' 144,'SOFT' 50}
  #demo-card h2{margin:0;font:italic 400 54px/1.1 Fraunces,Georgia,serif;color:#a6f0da;font-variation-settings:'opsz' 144,'SOFT' 100}
  #demo-card p{margin:0;font:400 28px/1.4 "Schibsted Grotesk",sans-serif;color:#a3abc4;max-width:1100px}
  #demo-card .by{font:500 30px/1.3 "Schibsted Grotesk",sans-serif;color:#eef0f7}
  #demo-card .foot{margin-top:18px;font:500 17px/1 "IBM Plex Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:#6b7390}
  #demo-card .rings{position:absolute;inset:0;overflow:hidden;z-index:-1}
  #demo-card .rings i{position:absolute;left:50%;top:50%;border:2px solid #a6f0da;border-radius:50%;transform:translate(-50%,-50%);
    animation:demoRing 5s cubic-bezier(.22,1,.36,1) infinite;opacity:0}
  @keyframes demoRing{0%{width:40px;height:40px;opacity:.5}100%{width:1900px;height:1900px;opacity:0}}`;
  const ready = () => {
    if (document.getElementById('demo-cursor')) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    const cap = document.createElement('div');
    cap.id = 'demo-cap';
    const card = document.createElement('div');
    card.id = 'demo-card';
    document.body.append(card, cap, cursor);
    addEventListener('mousemove', (e) => (cursor.style.translate = `${e.clientX}px ${e.clientY}px`), true);
    addEventListener('mousedown', () => cursor.classList.add('down'), true);
    addEventListener('mouseup', () => cursor.classList.remove('down'), true);
  };
  window.__demo = {
    caption(text, label) {
      ready();
      const cap = document.getElementById('demo-cap');
      if (!text) return cap.classList.remove('on');
      cap.innerHTML = `${label ? `<small>${label}</small>` : ''}<span>${text}</span>`;
      cap.classList.add('on');
    },
    card(html) {
      ready();
      const card = document.getElementById('demo-card');
      if (!html) return card.classList.remove('on');
      card.innerHTML = `<div class="rings"><i></i><i style="animation-delay:1.6s"></i><i style="animation-delay:3.2s"></i></div><div class="in">${html}</div>`;
      card.classList.add('on');
    },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
};

const MARK = `<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="7" fill="#a6f0da"/><circle cx="32" cy="32" r="16" fill="none" stroke="#a6f0da" stroke-width="3" opacity=".75"/><circle cx="32" cy="32" r="26" fill="none" stroke="#a6f0da" stroke-width="3" opacity=".35"/></svg>`;
const byline = [NAME, [GRADE, SCHOOL].filter(Boolean).join(', ')].filter(Boolean).join(' · ');

// ───────────────────────── recording ─────────────────────────
const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ripple-frames-'));
const frames = [];
const captions = [];
let t0 = 0;
let page;
let cdp;
let mouse = { x: W / 2, y: H / 2 };

const sleep = (ms) => page.waitForTimeout(ms);
const now = () => (Date.now() - t0) / 1000;

async function caption(text, label = '') {
  const last = captions[captions.length - 1];
  if (last && last.end == null) last.end = now();
  if (text) captions.push({ start: now(), end: null, text, label });
  await page.evaluate(([t, l]) => window.__demo.caption(t, l), [text, label]);
}
async function card(html) {
  await page.evaluate((h) => window.__demo.card(h), html);
}
const ease = (f) => (f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2);
/** Moves the cursor along an eased path, timed by the clock (not by step count). */
async function moveTo(x, y, ms = 650) {
  const from = { ...mouse };
  const start = Date.now();
  for (;;) {
    const f = Math.min(1, (Date.now() - start) / ms);
    await page.mouse.move(from.x + (x - from.x) * ease(f), from.y + (y - from.y) * ease(f));
    if (f >= 1) break;
    await sleep(10);
  }
  mouse = { x, y };
}
/** The target's center, once it has stopped moving (cards slide in as they appear). */
async function point(locator) {
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  let prev = null;
  for (let i = 0; i < 12; i++) {
    const b = await locator.boundingBox();
    const p = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    if (prev && Math.abs(p.x - prev.x) < 0.5 && Math.abs(p.y - prev.y) < 0.5) return p;
    prev = p;
    await sleep(90);
  }
  return prev;
}
async function click(locator, ms = 520) {
  await settle(); // aim only once the page has stopped moving
  let p = await point(locator);
  if (p.y < 0 || p.y > H - 150) {
    // Off screen: bring it to the middle first, the way a person would.
    await scrollTo(locator, H / 2 - 40, 900);
    p = await point(locator);
  }
  await moveTo(p.x, p.y, ms);
  await sleep(110);
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
}
async function typeInto(locator, text, delay = 28) {
  await click(locator);
  await page.keyboard.type(text, { delay });
}
/** Wheel scrolling timed by the clock (the site smooths it with Lenis, like a person scrolling). */
async function scrollBy(px, ms) {
  const start = Date.now();
  let done = 0;
  for (;;) {
    const f = Math.min(1, (Date.now() - start) / ms);
    const d = px * ease(f) - done;
    if (Math.abs(d) >= 1 || f >= 1) {
      await page.mouse.wheel(0, d);
      done += d;
    }
    if (f >= 1) break;
    await sleep(14);
  }
}
/** Waits until smooth scrolling has come to rest (checked inside the page, frame by frame). */
async function settle() {
  await page.evaluate(
    () =>
      new Promise((done) => {
        let last = scrollY;
        let still = 0;
        let frames = 0;
        const tick = () => {
          still = Math.abs(scrollY - last) < 0.5 ? still + 1 : 0;
          last = scrollY;
          if (still >= 4 || ++frames > 90) done();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}
/**
 * Glides the page until the target (a CSS selector or a locator) sits `offset` pixels below the top.
 * One eased motion inside the page that re-aims every frame, so sections still animating in
 * can't make it overshoot and bounce.
 */
async function scrollTo(target, offset = 110, ms = 1400) {
  const loc = typeof target === 'string' ? page.locator(target).first() : target;
  await loc.waitFor({ state: 'attached', timeout: 15000 });
  await settle();
  await loc.evaluate(
    (el, [offset, ms]) =>
      new Promise((done) => {
        const y0 = scrollY;
        const start = performance.now();
        const ease = (f) => (f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2);
        const max = () => document.documentElement.scrollHeight - innerHeight;
        const goal = () => Math.max(0, Math.min(max(), el.getBoundingClientRect().top + scrollY - offset));
        const tick = (now) => {
          const f = Math.min(1, (now - start) / ms);
          window.scrollTo(0, y0 + (goal() - y0) * ease(f));
          if (f < 1) requestAnimationFrame(tick);
          else setTimeout(done, 60);
        };
        requestAnimationFrame(tick);
      }),
    [offset, ms],
  );
}
async function startRecording() {
  cdp = await page.context().newCDPSession(page);
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = path.join(frameDir, `${String(frames.length).padStart(6, '0')}.jpg`);
    frames.push({ file, t: metadata.timestamp });
    fs.writeFile(file, Buffer.from(data, 'base64'), () => {});
    try {
      await cdp.send('Page.screencastFrameAck', { sessionId });
    } catch {
      /* page navigating */
    }
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  t0 = Date.now();
}

// ───────────────────────── the walkthrough ─────────────────────────
const nav = (label) => page.locator('.nav__links a', { hasText: label });

async function scenes() {
  // 0 · Title
  await card(`${MARK}<h1>Ripple</h1><h2>See the ripple before you decide.</h2><p>A decision simulator for civic life</p>${byline ? `<div class="by">${byline}</div>` : ''}<div class="foot">Congressional App Challenge 2026</div>`);
  await sleep(3800);
  await card(null);
  await sleep(400);

  // 1 · Hero
  await caption('Every decision makes waves. Ripple lets you see them before you decide.', 'Ripple');
  for (const [x, y] of [[700, 430], [1250, 560], [1450, 380]]) await moveTo(x, y, 950);
  await sleep(300);

  // 2 · The story
  await caption('Ripple simulates 1,000 people. As you scroll, a year passes and opinions spread.', 'How it works');
  await scrollBy(1100, 1800);
  await settle();
  const spreadEnd = await page.evaluate(() => {
    const el = document.querySelector('.spread');
    const box = el.closest('.pin-spacer') ?? el;
    return box.getBoundingClientRect().top + box.getBoundingClientRect().height - innerHeight + 40;
  });
  await scrollBy(spreadEnd * 0.55, 2700);
  await scrollBy(spreadEnd * 0.45, 2200);
  await settle();
  await sleep(400);

  // 3 · The simulator: an unrealistic ban
  await click(page.locator('.nav__cta'));
  await page.waitForSelector('#decision');
  await caption('Type any decision. Ripple reads it as you type.', 'The simulator');
  await sleep(300);
  await typeInto(page.locator('#decision'), 'Ban all devices at school');
  await sleep(500);
  await click(page.locator('button[type=submit]', { hasText: 'Simulate reactions' }));
  await caption('It simulates 1,000 students, teachers and families, starting from real polls.', 'Reality check');
  await page.waitForSelector('#verdict .reality', { timeout: 20000 });
  await sleep(900);
  await scrollTo('#verdict .reality', 140, 1100);
  await sleep(2400);

  // 4 · A better version
  await caption('Ripple suggests a narrower version and tests it by re-running the simulation.', 'Fixes');
  await scrollTo('#fixes', 120, 1300);
  const fix = page.locator('.fix', { hasText: /class/i }).first();
  await click((await fix.count()) ? fix.locator('button') : page.locator('.fix button').first());
  await page.waitForSelector('#verdict .compare', { timeout: 20000 });
  await sleep(300);
  await scrollTo('#verdict .compare', 150, 1000);
  await caption('Phones only during class: 68% of adults support that in a Pew Research poll.', 'Before → after');
  await sleep(3400);
  await caption('Share a link that reproduces the exact result, or an image card.', 'Share');
  await click(page.locator('.subnav__share'));
  await page.waitForSelector('.sheet__preview img', { timeout: 10000 });
  await sleep(2800);
  await page.keyboard.press('Escape');
  await sleep(300);

  // 5 · Crowd, voices, town hall
  await caption('Watch the crowd make up its mind over a year.', 'The crowd');
  await scrollTo('#crowd', 110, 1300);
  await click(page.locator('#crowd button', { hasText: 'Play the year' }));
  await sleep(3200);
  await caption('Hear what each group would say, in its own words.', 'The voices');
  await scrollTo('#voices', 110, 1200);
  await sleep(2600);
  await caption('…and a town hall where the voices answer each other.', 'Town hall');
  await scrollTo('#hall', 110, 1200);
  await sleep(2300);

  // 6 · Your district + local decisions
  await click(nav('Your district'));
  await page.waitForSelector('#district-page-zip');
  await caption('Enter a ZIP code. Ripple builds the crowd from your district’s real Census data.', 'Your district');
  await sleep(300);
  await typeInto(page.locator('#district-page-zip'), ZIP, 70);
  await click(page.locator('button', { hasText: 'Find my district' }).first());
  const choice = page.locator('.district-choices .chip').first();
  await Promise.race([page.waitForSelector('.district-card', { timeout: 10000 }), choice.waitFor({ timeout: 10000 })]).catch(() => {});
  if (await choice.count()) await click(choice);
  await page.waitForSelector('.district-card');
  await sleep(300);
  await scrollTo('.district-card', 120, 1100);
  await sleep(2000);
  await caption('Then run the questions your town actually decides: parks, bond votes, school start times.', 'Local decisions');
  await scrollTo('section[aria-labelledby="local"]', 100, 1400);
  await sleep(1800);
  await click(page.locator('.local__item', { hasText: 'Cap rent increases' }));
  await page.waitForSelector('#verdict .reality', { timeout: 20000 });
  await caption('Housing, school safety and climate start from real polls, with your neighbors in the room.', 'Local decisions');
  await sleep(700);
  await scrollTo('#verdict .reality', 140, 1100);
  await sleep(2500);

  // 7 · Real bills → Take it further
  await click(nav('Real bills'));
  await page.waitForSelector('.bill');
  await caption('27 real bills from Congress, updated every week from Congress.gov.', 'Real bills');
  await sleep(500);
  await typeInto(page.locator('.search input'), 'housing', 45);
  await sleep(300);
  const law = page.locator('.bill', { hasText: 'ROAD to Housing' }).first();
  await scrollTo(law, 150, 1100);
  await caption('Read what a bill does, see how far it got, and simulate it in your own district.', 'Real bills');
  await sleep(2000);
  const inDistrict = law.locator('button', { hasText: /^In / });
  await click((await inDistrict.count()) ? inDistrict : law.locator('button', { hasText: 'Simulate reactions' }));
  await page.waitForSelector('#act', { timeout: 20000 });
  await sleep(700);
  await caption('Take it further: who decides, from Congress to your city council, and a letter that cites real polls.', 'Take it further');
  await scrollTo('#act', 100, 1400);
  await sleep(1300);
  const state = page.locator('.act__letter .segmented button', { hasText: 'State legislature' });
  if (await state.count()) await click(state);
  await sleep(1900);

  // 8 · Listen for real
  await caption('Ripple is a rehearsal. Send a 30-second survey to real people.', 'Listen for real');
  await scrollTo('.listen', 160, 1200);
  await click(page.locator('.listen button', { hasText: 'Create a survey' }));
  await page.waitForSelector('.listen .qr', { timeout: 10000 });
  await sleep(900);
  const link = await page.locator('.listen input').inputValue();
  const surveyId = link.split('/survey/')[1];
  await seedSurvey(surveyId);
  await click(page.locator('.listen a', { hasText: 'Watch the results' }));
  await page.waitForSelector('.rvp', { timeout: 10000 });
  await sleep(500);
  // The answers on screen were submitted by this script, so the caption says so.
  await caption('Real answers appear live next to Ripple’s prediction, group by group.', 'Listen for real · demo answers');
  await sleep(1600);
  await scrollTo('#by-group', 160, 1100);
  await sleep(1500);

  // 9 · Classes
  await click(nav('Projects'));
  await page.waitForSelector('#new-class');
  await caption('Teachers can start a class. Students join with a code and a nickname, with no accounts.', 'Classes');
  await sleep(400);
  await typeInto(page.locator('#new-class'), 'Civics, period 3', 40);
  await click(page.locator('form', { has: page.locator('#new-class') }).locator('button[type=submit]'));
  await page.waitForSelector('.proj-code__code', { timeout: 15000 });
  await sleep(1900);
  const code = (await page.locator('.proj-code__code').textContent()).trim();
  await seedClass(code, surveyId);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.proj-item', { timeout: 15000 });
  await caption('Everything students simulate and survey rolls up here, with how close the predictions were.', 'Classes · demo students');
  await sleep(500);
  await scrollTo('#items', 110, 1200);
  await sleep(2000);
  await scrollTo('#students', 140, 1000);
  await sleep(1600);

  // 10 · Spanish
  await click(page.locator('.nav__lang'));
  await caption('Ripple also works in Spanish, including decisions typed in Spanish.', 'En español');
  await sleep(700);
  await click(page.locator('.nav__cta'));
  await page.waitForSelector('#decision');
  await sleep(300);
  await typeInto(page.locator('#decision'), 'Limitar los aumentos anuales del alquiler al 5%', 30);
  await page.waitForSelector('.composer__readas', { timeout: 5000 }).catch(() => {});
  await sleep(1400);
  await click(page.locator('button[type=submit]', { hasText: 'Simular reacciones' }));
  await page.waitForSelector('#verdict .reality', { timeout: 20000 });
  await caption('It starts from the same real poll as the English version.', 'En español');
  await sleep(600);
  await scrollTo('#verdict .reality', 140, 1100);
  await sleep(2400);
  await click(page.locator('.nav__lang'));
  await sleep(300);

  // 11 · Methodology
  await click(nav('Methodology'));
  const run = page.locator('button', { hasText: 'Run the realism checks' });
  await run.waitFor({ timeout: 15000 });
  await caption('Every number shows its source, and Ripple checks itself against 40 real polls.', 'Methodology');
  await scrollTo(run, 330, 1100);
  await click(run);
  await page.waitForSelector('.checks__row:not(.checks__row--head)', { timeout: 20000 });
  await sleep(900);
  await scrollBy(650, 1800);
  await sleep(900);
  await caption('');

  // 12 · End card
  await card(`${MARK}<h2 style="font-size:64px">Use it to prepare.<br>Then go listen.</h2><p>Real polls · Census districts · Real bills · Classes · English &amp; español</p>${byline ? `<div class="by">${byline}</div>` : ''}<div class="foot">Ripple · Congressional App Challenge 2026</div>`);
  await sleep(4300);
}

/** A handful of sample answers so the results page has something to show (labeled as demo answers on screen). */
async function seedSurvey(id) {
  const def = await (await fetch(`${BASE}/api/surveys/${id}`)).json();
  const g = def.groups;
  const plan = [
    ['support', 0], ['support', 0], ['support', 0], ['oppose', 0], ['support', 1], ['support', 1], ['neutral', 1],
    ['support', 2], ['support', 2], ['support', 2], ['support', 3], ['oppose', 3], ['support', 3], ['support', 4], ['neutral', 5], ['support', 6],
  ];
  for (let i = 0; i < plan.length; i++) {
    await fetch(`${BASE}/api/surveys/${id}/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stance: plan[i][0], group: g[plan[i][1] % g.length], voter: `demo-voter-${id}-${i}`.replace(/[^A-Za-z0-9_-]/g, '') }),
    });
  }
}

/** Two sample students join the class and save work (labeled as demo students on screen). */
async function seedClass(code, surveyId) {
  const post = (url, body, key) =>
    fetch(`${BASE}${url}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { 'x-ripple-key': key } : {}) }, body: JSON.stringify(body) }).then((r) => r.json());
  const maya = await post('/api/projects/join', { code, nickname: 'Maya R.' });
  const jordan = await post('/api/projects/join', { code, nickname: 'Jordan' });
  await post(`/api/projects/${maya.id}/items`, { kind: 'simulation', decision: 'Start high school at 8:30 a.m. instead of 7:30', scope: 'school' }, maya.token);
  await post(`/api/projects/${jordan.id}/items`, { kind: 'simulation', decision: 'Put a school resource officer in every school', scope: 'community' }, jordan.token);
  if (surveyId) await post(`/api/projects/${maya.id}/items`, { kind: 'survey', surveyId }, maya.token);
}

// ───────────────────────── encode ─────────────────────────
function srtTime(s) {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await context.addInitScript(OVERLAY);
  page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__demo.card('<div></div>'));
  await sleep(1200);
  await page.mouse.move(mouse.x, mouse.y);
  await startRecording();
  await scenes();
  const end = now();
  if (captions.length && captions[captions.length - 1].end == null) captions[captions.length - 1].end = end;
  await cdp.send('Page.stopScreencast');
  await sleep(400);
  await browser.close();

  // Each frame lasts until the next one arrives, so the video keeps real time.
  const list = [];
  for (let i = 0; i < frames.length; i++) {
    const d = i + 1 < frames.length ? Math.max(0.001, frames[i + 1].t - frames[i].t) : 0.5;
    list.push(`file '${frames[i].file}'\nduration ${d.toFixed(4)}`);
  }
  list.push(`file '${frames[frames.length - 1].file}'`);
  const listFile = path.join(frameDir, 'frames.txt');
  fs.writeFileSync(listFile, list.join('\n'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-vf', `fps=30,scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  fs.rmSync(frameDir, { recursive: true, force: true });

  // Captions for YouTube, and a narration script timed to the video.
  const srt = captions.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
  fs.writeFileSync(OUT.replace(/\.mp4$/, '.srt'), srt);
  const md = [
    '# Ripple demo: narration script',
    '',
    'Read this over the video (or record your voice while it plays). Start by saying your name, your school, the app’s name and its purpose.',
    '',
    `| Time | On screen | Say |`,
    `| --- | --- | --- |`,
    `| 0:00 | Title card | "Hi, I'm ${NAME || '___'}, ${GRADE ? `a ${GRADE.toLowerCase()} ` : ''}${SCHOOL ? `at ${SCHOOL}` : 'from ___'}, and this is Ripple, a decision simulator for civic life." |`,
    ...captions.map((c) => `| ${mmss(c.start)} | ${c.label || ''} | "${c.text.replace(/…/g, '...')}" |`),
    `| ${mmss(end - 5)} | End card | "Use Ripple to prepare, then go listen to the real people. Thank you!" |`,
    '',
    `Length: ${mmss(end)}.`,
  ].join('\n');
  fs.writeFileSync(OUT.replace(/\.mp4$/, '-narration.md'), md);
  console.log(`Wrote ${OUT} (${mmss(end)}, ${frames.length} frames) plus captions and a narration script.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
