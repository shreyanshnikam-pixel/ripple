import { SCOPE_META } from '../../../shared/personas';
import type { SimulationResult } from '../../../shared/types';

export const CARD_W = 1200;
export const CARD_H = 630;

const C = {
  ink: '#0b1020',
  line: '#232c4a',
  paper: '#eef0f7',
  mist: '#a3abc4',
  fog: '#6b7390',
  foam: '#a6f0da',
  support: '#5b8def',
  oppose: '#d0703a',
  neutral: '#6b7390',
};

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing is newer than the rest of the canvas API; skip it where unsupported.
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

/** Wraps text into at most `maxLines` lines, ending with an ellipsis when it runs over. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = words[i];
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  const used = lines.join(' ').split(/\s+/).length;
  if (used < words.length) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.replace(/\s*\S+$/, '');
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

/** Draws a 1200×630 share card for a result. Fonts are loaded first so the card matches the site. */
export async function drawShareCard(r: SimulationResult, opts: { district?: string | null } = {}): Promise<HTMLCanvasElement> {
  try {
    await Promise.all([
      document.fonts.load('360 96px Fraunces'),
      document.fonts.load('italic 400 40px Fraunces'),
      document.fonts.load('500 16px "IBM Plex Mono"'),
      document.fonts.load('400 22px "Schibsted Grotesk"'),
    ]);
  } catch {
    /* fall back to system fonts */
  }
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  const s = r.summary;
  const meta = SCOPE_META[r.scope];

  // Night water, with rings spreading from the right.
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const glow = ctx.createRadialGradient(990, 300, 0, 990, 300, 520);
  glow.addColorStop(0, 'rgba(166, 240, 218, 0.10)');
  glow.addColorStop(1, 'rgba(166, 240, 218, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  for (let i = 1; i <= 7; i++) {
    ctx.beginPath();
    ctx.arc(990, 300, i * 62, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(166, 240, 218, ${0.32 - i * 0.04})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Wordmark.
  ctx.fillStyle = C.foam;
  ctx.beginPath();
  ctx.arc(80, 72, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.foam;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(80, 72, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = C.paper;
  ctx.font = '400 32px Fraunces, Georgia, serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ripple', 106, 73);

  // Label.
  ctx.textBaseline = 'alphabetic';
  ctx.font = '500 15px "IBM Plex Mono", ui-monospace, monospace';
  setSpacing(ctx, 2);
  ctx.fillStyle = C.mist;
  const label = ['Simulated reaction', meta.label, `${r.crowdSize.toLocaleString()} ${r.scope === 'personal' ? 'reactions' : meta.crowdNoun}`, opts.district ? `${opts.district} population` : '']
    .filter(Boolean)
    .join(' · ')
    .toUpperCase();
  ctx.fillText(label, 64, 146);
  setSpacing(ctx, 0);

  // The decision.
  ctx.font = 'italic 400 38px Fraunces, Georgia, serif';
  ctx.fillStyle = C.mist;
  const lines = wrap(ctx, `“${r.decision}”`, 700, 3);
  lines.forEach((l, i) => ctx.fillText(l, 64, 206 + i * 48));

  // Verdict.
  const vy = 206 + lines.length * 48 + 78;
  ctx.font = '360 84px Fraunces, Georgia, serif';
  ctx.fillStyle = C.paper;
  ctx.fillText(`${s.verdict}.`, 60, vy);

  // For / undecided / against, with 2px gaps between the parts.
  const bx = 64;
  const by = vy + 40;
  const bw = 700;
  const parts: [number, string][] = [
    [s.support, C.support],
    [s.neutral, C.neutral],
    [s.oppose, C.oppose],
  ];
  const total = parts.reduce((t, [v]) => t + v, 0) || 1;
  let x = bx;
  parts.forEach(([v, color], i) => {
    const w = Math.max(2, (v / total) * (bw - 4));
    ctx.fillStyle = color;
    ctx.beginPath();
    const radii = i === 0 ? [5, 0, 0, 5] : i === parts.length - 1 ? [0, 5, 5, 0] : [0, 0, 0, 0];
    if ('roundRect' in ctx) ctx.roundRect(x, by, w, 22, radii);
    else (ctx as CanvasRenderingContext2D).rect(x, by, w, 22);
    ctx.fill();
    x += w + 2;
  });
  ctx.font = '400 22px "Schibsted Grotesk", system-ui, sans-serif';
  let kx = bx;
  for (const [name, v, color] of [
    ['For', s.support, C.support],
    ['Undecided', s.neutral, C.neutral],
    ['Against', s.oppose, C.oppose],
  ] as const) {
    ctx.fillStyle = color;
    ctx.fillRect(kx, by + 46, 12, 12);
    ctx.fillStyle = C.paper;
    const t = `${name} ${v}%`;
    ctx.fillText(t, kx + 20, by + 58);
    kx += 20 + ctx.measureText(t).width + 34;
  }

  // Net support, inside the rings.
  ctx.textAlign = 'center';
  ctx.fillStyle = C.paper;
  ctx.font = '330 128px Fraunces, Georgia, serif';
  ctx.fillText(signed(s.net), 990, 318);
  ctx.font = '500 15px "IBM Plex Mono", ui-monospace, monospace';
  setSpacing(ctx, 2);
  ctx.fillStyle = C.mist;
  ctx.fillText('NET SUPPORT', 990, 360);
  setSpacing(ctx, 0);
  ctx.textAlign = 'left';

  // Footer: what this is, and where the starting point came from.
  const a = r.reality?.anchor;
  const who = a?.population === 'adults' ? ' of adults' : a?.population === 'parents' ? ' of parents' : '';
  const basis =
    a && a.basis === 'poll' && a.source ? `Starts from a ${a.source.year} ${a.source.org} poll: ${a.support}%${who} in favor.` : 'Starts from a labeled Ripple estimate.';
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, 560);
  ctx.lineTo(CARD_W - 64, 560);
  ctx.stroke();
  ctx.font = '400 19px "Schibsted Grotesk", system-ui, sans-serif';
  ctx.fillStyle = C.fog;
  const foot = wrap(ctx, `Simulated reactions, not a survey. ${basis}`, CARD_W - 128, 1)[0];
  ctx.fillText(foot, 64, 596);
  return canvas;
}

export const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));

export const fileNameFor = (r: SimulationResult) =>
  `ripple-${r.decision
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)}.png`;
