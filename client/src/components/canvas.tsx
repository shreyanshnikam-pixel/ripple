import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { CrowdAgent, PersonaReaction } from '../../../shared/types';
import { C, hexToRgb, opinionRgb } from '../lib/tokens';
import { prefersReducedMotion } from '../lib/motion';

function useCanvasSize(ref: React.RefObject<HTMLCanvasElement>) {
  const [size, setSize] = useState({ w: 0, h: 0, dpr: 1 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function useVisible(ref: React.RefObject<HTMLElement>) {
  const visible = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

interface Wave {
  x: number;
  y: number;
  t0: number;
  amp: number;
  sign: number;
}

/**
 * Hero background: a field of dots ("people") that ripple outward from the
 * cursor and from random drops. Each wave tints the dots it passes: blue for
 * a wave of support, orange for a wave of opposition.
 */
export function RippleField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { w, h, dpr } = useCanvasSize(ref);
  const visible = useVisible(ref as React.RefObject<HTMLElement>);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !w || !h) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gap = w < 600 ? 20 : 24;
    const cols = Math.ceil(w / gap) + 1;
    const rows = Math.ceil(h / gap) + 1;
    const ox = (w - (cols - 1) * gap) / 2;
    const oy = (h - (rows - 1) * gap) / 2;
    const waves: Wave[] = [];
    const SUP = hexToRgb(C.support);
    const OPP = hexToRgb(C.oppose);
    const FOAM = hexToRgb(C.foam);
    const reduced = prefersReducedMotion();
    let last = 0;
    let raf = 0;
    let nextAuto = 600;
    const speed = 0.32; // px per ms
    const life = 3600;

    const drop = (x: number, y: number, amp = 1, sign = Math.random() < 0.58 ? 1 : -1) => {
      waves.push({ x, y, t0: performance.now(), amp, sign });
      if (waves.length > 9) waves.shift();
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = waves.length - 1; i >= 0; i--) if (now - waves[i].t0 > life) waves.splice(i, 1);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = ox + c * gap;
          const y = oy + r * gap;
          let lift = 0;
          let tint = 0;
          let dx = 0;
          let dy = 0;
          for (const wv of waves) {
            const age = now - wv.t0;
            const ddx = x - wv.x;
            const ddy = y - wv.y;
            const d = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
            const front = age * speed;
            const off = d - front;
            if (off > 60 || off < -220) continue;
            const fade = Math.max(0, 1 - age / life) * wv.amp;
            const env = Math.exp(-(off * off) / 1800);
            const wave = Math.cos(off / 14) * env * fade;
            lift += Math.abs(wave);
            tint += wv.sign * env * fade;
            dx += (ddx / d) * wave * 4;
            dy += (ddy / d) * wave * 4;
          }
          const radius = 1.1 + Math.min(2.2, lift * 2.1);
          const alpha = 0.22 + Math.min(0.75, lift * 0.9);
          let rgb = [120, 130, 165];
          if (Math.abs(tint) > 0.02) {
            const t = Math.min(1, Math.abs(tint) * 1.4);
            const end = tint > 0 ? SUP : OPP;
            rgb = [rgb[0] + (end[0] - rgb[0]) * t, rgb[1] + (end[1] - rgb[1]) * t, rgb[2] + (end[2] - rgb[2]) * t];
          } else if (lift > 0.05) {
            rgb = FOAM;
          }
          ctx.fillStyle = `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${alpha})`;
          ctx.beginPath();
          ctx.arc(x + dx, y + dy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    if (reduced) {
      draw(performance.now());
      return;
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible.current || document.hidden) return;
      if (now > nextAuto) {
        drop(w * (0.15 + Math.random() * 0.7), h * (0.2 + Math.random() * 0.6), 0.8);
        nextAuto = now + 1400 + Math.random() * 1200;
      }
      draw(now);
    };
    raf = requestAnimationFrame(loop);
    drop(w / 2, h / 2, 1.1, 1);

    const host = canvas.parentElement!;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - last < 260) return;
      last = now;
      const r = canvas.getBoundingClientRect();
      drop(e.clientX - r.left, e.clientY - r.top, 0.55);
    };
    const onDown = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      drop(e.clientX - r.left, e.clientY - r.top, 1.2);
    };
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerdown', onDown);
    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
    };
  }, [w, h, dpr, visible]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

/**
 * The simulated crowd. Every dot is one simulated person; its color is their
 * opinion. `stepRef` (0 – 3, may be fractional) picks the moment in time, so a
 * scroll position or a play button can scrub through the year.
 */
export function CrowdCanvas({
  agents,
  personas,
  stepRef,
  highlight,
  label,
  interactive = true,
}: {
  agents: CrowdAgent[];
  personas: PersonaReaction[];
  stepRef: MutableRefObject<number>;
  highlight?: number | null;
  label: string;
  interactive?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const { w, h, dpr } = useCanvasSize(ref);
  const visible = useVisible(wrap as React.RefObject<HTMLElement>);
  const [tip, setTip] = useState<{ x: number; y: number; who: string; o: number } | null>(null);
  const shown = useRef(0);
  const highlightRef = useRef(highlight);
  highlightRef.current = highlight;
  const pulse = useRef({ t0: 0, last: -1 });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !w || !h || !agents.length) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduced = prefersReducedMotion();
    const size = Math.min(w, h);
    const R = size * 0.46;
    const cx = w / 2;
    const cy = h / 2;
    const dot = Math.max(1.6, Math.min(4.2, (R * 1.5) / Math.sqrt(agents.length)));
    const seeds = agents.map((_, i) => (Math.sin(i * 12.9898) * 43758.5453) % 1);
    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const target = stepRef.current;
      shown.current = reduced ? target : shown.current + (target - shown.current) * 0.12;
      const s = Math.max(0, Math.min(3, shown.current));
      const lo = Math.floor(s);
      const hi = Math.min(3, lo + 1);
      const f = s - lo;
      const rounded = Math.round(s);
      if (rounded !== pulse.current.last) {
        pulse.current = { t0: now, last: rounded };
      }
      ctx.clearRect(0, 0, w, h);

      // ripple ring when the timeline moves
      const age = (now - pulse.current.t0) / 1400;
      if (age < 1 && !reduced) {
        ctx.strokeStyle = `rgba(166,240,218,${0.35 * (1 - age)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, R * (0.1 + age * 1.0), 0, Math.PI * 2);
        ctx.stroke();
      }
      // faint guide rings
      ctx.strokeStyle = 'rgba(35,44,74,0.9)';
      ctx.lineWidth = 1;
      for (const k of [0.34, 0.67, 1.02]) {
        ctx.beginPath();
        ctx.arc(cx, cy, R * k, 0, Math.PI * 2);
        ctx.stroke();
      }

      const hl = highlightRef.current;
      const t = (now - start) / 1000;
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        const o = a.o[lo] + (a.o[hi] - a.o[lo]) * f;
        const [r, g, b] = opinionRgb(o);
        const wob = reduced ? 0 : Math.sin(t * 1.4 + seeds[i] * 20) * 0.9;
        const x = cx + a.x * R + wob;
        const y = cy + a.y * R + Math.cos(t * 1.2 + seeds[i] * 17) * (reduced ? 0 : 0.9);
        const dim = hl != null && a.p !== hl;
        ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${dim ? 0.12 : 0.55 + Math.min(0.45, Math.abs(o) * 0.6)})`;
        ctx.beginPath();
        ctx.arc(x, y, dot * (hl != null && !dim ? 1.25 : 1), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible.current || document.hidden) return;
      draw(now);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [w, h, dpr, agents, stepRef, visible]);

  const onMove = (e: React.PointerEvent) => {
    if (!interactive) return;
    const r = ref.current!.getBoundingClientRect();
    const size = Math.min(r.width, r.height);
    const R = size * 0.46;
    const px = (e.clientX - r.left - r.width / 2) / R;
    const py = (e.clientY - r.top - r.height / 2) / R;
    let best = -1;
    let bd = 0.004;
    for (let i = 0; i < agents.length; i++) {
      const dx = agents[i].x - px;
      const dy = agents[i].y - py;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    if (best < 0) return setTip(null);
    const a = agents[best];
    const s = Math.round(Math.max(0, Math.min(3, stepRef.current)));
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, who: personas[a.p]?.group ?? 'Person', o: a.o[s] });
  };

  const lean = (o: number) => (o > 0.5 ? 'Strongly for' : o > 0.15 ? 'Leaning for' : o >= -0.15 ? 'Undecided' : o >= -0.5 ? 'Leaning against' : 'Strongly against');

  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0 }} onPointerMove={onMove} onPointerLeave={() => setTip(null)}>
      <canvas ref={ref} role="img" aria-label={label} style={{ width: '100%', height: '100%', display: 'block' }} />
      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          One of the {tip.who.toLowerCase()}
          <small>{lean(tip.o)}</small>
        </div>
      )}
    </div>
  );
}
