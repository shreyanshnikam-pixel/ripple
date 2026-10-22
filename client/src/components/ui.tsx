import { animate, motion, useInView, type Variants } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Stance } from '../../../shared/types';
import { personaColor } from '../lib/tokens';
import { useReducedMotion } from '../lib/motion';
import { useT } from '../i18n';

const ease = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts children into place when they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = 'div',
  style,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
  style?: CSSProperties;
}) {
  const reduced = useReducedMotion();
  const Comp = motion[as];
  if (reduced) {
    const Plain = as;
    return (
      <Plain className={className} style={style}>
        {children}
      </Plain>
    );
  }
  return (
    <Comp
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.9, ease, delay }}
    >
      {children}
    </Comp>
  );
}

const wordVariants: Variants = {
  hidden: { y: '110%', rotate: 4 },
  show: (i: number) => ({ y: '0%', rotate: 0, transition: { duration: 1, ease, delay: 0.05 + i * 0.06 } }),
};

/** Splits a heading into words that slide up from a mask, line by line. */
export function SplitHeading({
  lines,
  className,
  as = 'h2',
  immediate = false,
}: {
  lines: ReactNode[][];
  className?: string;
  as?: 'h1' | 'h2';
  immediate?: boolean;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const show = immediate || inView;
  const Tag = as;
  let i = 0;
  return (
    <Tag ref={ref} className={className}>
      {lines.map((words, li) => (
        <span className="line" key={li} style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.08em' }}>
          {words.map((w, wi) => {
            const idx = i++;
            return (
              <span key={wi}>
                <motion.span
                  className="word"
                  style={{ display: 'inline-block', transformOrigin: '0 100%' }}
                  custom={idx}
                  variants={wordVariants}
                  initial={reduced ? false : 'hidden'}
                  animate={show || reduced ? 'show' : 'hidden'}
                >
                  {w}
                </motion.span>
                {wi < words.length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}

/** Counts up to `value` once visible. */
export function Counter({ value, prefix = '', suffix = '', duration = 1.6, signed = false }: { value: number; prefix?: string; suffix?: string; duration?: number; signed?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setShown(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease,
      onUpdate: (v) => setShown(v),
    });
    from.current = value;
    return () => controls.stop();
  }, [inView, value, duration, reduced]);
  const n = Math.round(shown);
  const sign = signed && n > 0 ? '+' : n < 0 ? '−' : '';
  return (
    <span ref={ref} className="num">
      {prefix}
      {sign}
      {Math.abs(n).toLocaleString()}
      {suffix}
    </span>
  );
}

/** Tracks the pointer inside a button for the radial highlight, and pulls it slightly toward the cursor. */
export function useMagnetic<T extends HTMLElement>(strength = 0.25) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !window.matchMedia('(pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
      el.style.transform = `translate(${(x - r.width / 2) * strength}px, ${(y - r.height / 2) * strength}px)`;
    };
    const leave = () => {
      el.style.transform = '';
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [strength, reduced]);
  return ref;
}

export function Arrow({ size = 18 }: { size?: number }) {
  return (
    <svg className="arrow" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function RippleMark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="4.5" fill="#A6F0DA" />
      <circle className="brand__ring" cx="20" cy="20" r="10" fill="none" stroke="#A6F0DA" strokeWidth="2" opacity="0.75" />
      <circle className="brand__ring" cx="20" cy="20" r="16.5" fill="none" stroke="#A6F0DA" strokeWidth="2" opacity="0.35" />
    </svg>
  );
}

export const stanceLabel: Record<Stance, string> = {
  'strong-support': 'Strongly for',
  support: 'Leaning for',
  neutral: 'Undecided',
  oppose: 'Leaning against',
  'strong-oppose': 'Strongly against',
};

export const stanceSide = (s: Stance): 'support' | 'neutral' | 'oppose' =>
  s === 'strong-support' || s === 'support' ? 'support' : s === 'neutral' ? 'neutral' : 'oppose';

/** Shape + color, so stance never relies on color alone. */
export function StanceIcon({ side }: { side: 'support' | 'neutral' | 'oppose' }) {
  if (side === 'support')
    return (
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M6 1.5 11 10H1z" fill="currentColor" />
      </svg>
    );
  if (side === 'oppose')
    return (
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M6 10.5 1 2h10z" fill="currentColor" />
      </svg>
    );
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4" fill="currentColor" />
    </svg>
  );
}

export function StancePill({ stance }: { stance: Stance }) {
  const { t } = useT();
  const side = stanceSide(stance);
  return (
    <span className={`pill pill--${side}`}>
      <StanceIcon side={side} />
      {t(stanceLabel[stance])}
    </span>
  );
}

export function Avatar({ initials, hue, stance, size }: { initials: string; hue: number; stance?: Stance; size?: number }) {
  const side = stance ? stanceSide(stance) : null;
  const ring = side === 'support' ? 'var(--support)' : side === 'oppose' ? 'var(--oppose)' : 'var(--neutral)';
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 28%, ${personaColor(hue, 88, 0.06)}, ${personaColor(hue, 70, 0.1)} 70%)`,
      }}
    >
      {initials}
      {side && <span className="avatar__ring" style={{ borderColor: ring }} />}
    </span>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <motion.div className="toast" role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {message}
    </motion.div>
  );
}
