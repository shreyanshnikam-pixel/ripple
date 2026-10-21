import { useAnimationFrame, useMotionValue, useScroll, useVelocity, motion } from 'framer-motion';
import { useLayoutEffect, useRef } from 'react';
import { EXAMPLES } from '../../../shared/examples';
import { ANCHORS } from '../../../shared/anchors';

const POLL_COUNT = new Set(ANCHORS.flatMap((a) => [a.source?.url, ...(a.variants ?? []).map((v) => v.source?.url)]).filter(Boolean)).size;
import { Counter, Reveal } from '../components/ui';
import { gsap, ScrollTrigger } from '../lib/smooth';
import { prefersReducedMotion } from '../lib/motion';
import { C } from '../lib/tokens';

function MarqueeRow({ items, dir, speed = 40 }: { items: string[]; dir: 1 | -1; speed?: number }) {
  const x = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const reduced = prefersReducedMotion();
  useAnimationFrame((_, delta) => {
    if (reduced || !ref.current) return;
    const half = ref.current.scrollWidth / 2;
    const boost = 1 + Math.min(6, Math.abs(velocity.get()) / 400);
    let next = x.get() + (dir * speed * boost * delta) / 1000;
    if (next <= -half) next += half;
    if (next > 0) next -= half;
    x.set(next);
  });
  const dots = [C.support, C.oppose, C.neutral];
  return (
    <motion.div className="marquee__row" ref={ref} style={{ x }}>
      {[...items, ...items].map((t, i) => (
        <span className="marquee__item" key={i}>
          <i style={{ background: dots[i % 3] }} />
          {t}
        </span>
      ))}
    </motion.div>
  );
}

export function Marquee() {
  const a = EXAMPLES.slice(0, 7).map((e) => e.text);
  const b = EXAMPLES.slice(7).map((e) => e.text);
  return (
    <div className="marquee" aria-hidden="true">
      <MarqueeRow items={a} dir={-1} />
      <MarqueeRow items={b} dir={1} speed={30} />
    </div>
  );
}

const STATEMENT =
  'Every big decision lands on real people: a parent juggling school pickups, a shop owner watching thin margins, a student who never got a vote. Most decisions get made without hearing from them. Ripple lets you hear them first.';
const KEY = new Set(['real', 'people:', 'hear', 'first.']);

export function Statement() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !ref.current) return;
    const ctx = gsap.context(() => {
      gsap.to('.w', {
        opacity: 1,
        stagger: 0.08,
        ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top 78%', end: 'bottom 55%', scrub: 0.6 },
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <section className="section statement" aria-label="Why Ripple exists">
      <div className="wrap" ref={ref}>
        <span className="label label--foam" style={{ display: 'block', marginBottom: 28 }}>
          The problem
        </span>
        <p>
          {STATEMENT.split(' ').map((w, i) => (
            <span key={i}>
              <span className={`w ${KEY.has(w) ? 'w--key' : ''}`}>{w}</span>{' '}
            </span>
          ))}
        </p>
        <div className="stats">
          {[
            { n: 1000, s: '', t: 'simulated people in every crowd, each with their own lean' },
            { n: 32, s: '', t: 'distinct voices across personal, school, community and business decisions' },
            { n: POLL_COUNT, s: '', t: 'published polls Ripple starts from when your decision matches one' },
            { n: 0, s: '', t: 'accounts, ads or trackers. Decisions stay in your browser' },
          ].map((x, i) => (
            <Reveal className="stat" key={i} delay={i * 0.08}>
              <span className="stat__n">
                <Counter value={x.n} suffix={x.s} />
              </span>
              <p>{x.t}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export { ScrollTrigger };
