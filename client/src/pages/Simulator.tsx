import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Recommendation, ScopeChoice, SimulationResult } from '../../../shared/types';
import { decodeMix, parseCrowd, parseScope, simulatorPath } from '../lib/share';
import { SplitHeading, Toast } from '../components/ui';
import { runSimulation, type Source } from '../lib/api';
import { clearHistory, loadHistory, saveToHistory, type HistoryItem } from '../lib/history';
import { prefersReducedMotion } from '../lib/motion';
import { scrollToTarget, ScrollTrigger } from '../lib/smooth';
import { Composer, Loading } from '../sim/Composer';
import { Block, Compare, CrowdPanel, Crosstabs, Fixes, Method, RealityPanel, Themes, TimelineChart, TownHall, Verdict, VoicesBlock } from '../sim/Results';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SECTIONS = [
  ['verdict', 'Verdict'],
  ['crowd', 'Crowd'],
  ['voices', 'Voices'],
  ['groups', 'Groups'],
  ['time', 'Over time'],
  ['hall', 'Town hall'],
  ['fixes', 'Fixes'],
  ['method', 'Method'],
] as const;

/** Sticky section menu. Mounted with the results, so the sections exist when it starts watching. */
function SubNav() {
  const [active, setActive] = useState('verdict');
  useEffect(() => {
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <nav className="subnav" aria-label="Report sections">
      {SECTIONS.map(([id, label]) => (
        <button key={id} className={active === id ? 'is-on' : ''} aria-current={active === id ? 'true' : undefined} onClick={() => scrollToTarget(`#${id}`, -150)}>
          {active === id && <motion.span layoutId="subnav" className="seg-bg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function summaryText(r: SimulationResult) {
  const s = r.summary;
  const fix = r.recommendations[0];
  return [
    `Ripple simulation: "${r.decision}"`,
    `${s.verdict}: ${s.support}% for, ${s.neutral}% undecided, ${s.oppose}% against (net ${s.net > 0 ? '+' : ''}${s.net}, ±${s.marginOfError}).`,
    s.headline,
    s.trajectory,
    fix ? `Best fix to try: ${fix.title} (+${fix.projectedLift} points projected).` : '',
    'These are simulated reactions, not survey results.',
  ]
    .filter(Boolean)
    .join('\n');
}

export default function Simulator() {
  const [params, setParams] = useSearchParams();
  const [decision, setDecision] = useState(() => (params.get('d') ?? '').slice(0, 500));
  const [scope, setScope] = useState<ScopeChoice>(() => parseScope(params.get('s')));
  const [crowdSize, setCrowdSize] = useState(() => parseCrowd(params.get('n')));
  const [mix, setMix] = useState<Record<string, number>>(() => decodeMix(params.get('m')));
  const [district] = useState<string | null>(() => params.get('cd'));
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [before, setBefore] = useState<SimulationResult | null>(null);
  const [source, setSource] = useState<Source>('browser');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [toast, setToast] = useState<string | null>(null);
  const autoRan = useRef(false);

  useEffect(() => {
    document.title = 'Simulator · Ripple';
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const run = useCallback(
    async (text: string, opts: { compare?: SimulationResult; scope?: ScopeChoice; mix?: Record<string, number>; crowdSize?: number } = {}) => {
      const useScope = opts.scope ?? scope;
      const useMix = opts.mix ?? mix;
      const useCrowd = opts.crowdSize ?? crowdSize;
      const d = text.trim();
      if (d.length < 3 || busy) return;
      setBusy(true);
      setError(null);
      setStage(0);
      setBefore(opts.compare ?? null);
      requestAnimationFrame(() => scrollToTarget('#lab-output', -110));
      const reduced = prefersReducedMotion();
      const stages = (async () => {
        for (let i = 1; i <= 5; i++) {
          await sleep(reduced ? 80 : 430);
          setStage(i);
        }
      })();
      try {
        const [{ result: r, source: src }] = await Promise.all([runSimulation({ decision: d, scope: useScope, crowdSize: useCrowd, mix: useMix }), stages]);
        setResult(r);
        setSource(src);
        saveToHistory({ id: r.id, decision: r.decision, scope: r.scope, net: r.summary.net, verdict: r.summary.verdict, at: r.createdAt, crowdSize: r.crowdSize, mix: r.mix });
        setHistory(loadHistory());
        // Keep the address bar shareable: it always reproduces the result on screen.
        const path = simulatorPath({ decision: r.decision, scope: useScope, crowdSize: r.crowdSize, mix: useMix, district: district ?? undefined }, false);
        setParams(new URLSearchParams(path.split('?')[1]), { replace: true });
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          scrollToTarget('#lab-output', -110);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [busy, scope, crowdSize, mix, district, setParams],
  );

  useEffect(() => {
    if (autoRan.current) return;
    const d = params.get('d');
    if (d && params.get('run') === '1') {
      autoRan.current = true;
      setTimeout(() => run(d), 350);
    }
  }, [params, run]);

  const apply = (rec: Recommendation) => {
    if (!result) return;
    const next = rec.replace ?? result.decision.replace(/[.?!]+$/, '') + rec.modifier;
    setDecision(next);
    run(next, { compare: result });
  };


  const copy = async () => {
    if (!result) return;
    const text = summaryText(result);
    try {
      await navigator.clipboard.writeText(text);
      flash('Summary copied');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        flash('Summary copied');
      } catch {
        flash('Select the summary text to copy it');
      }
      ta.remove();
    }
  };

  const restart = () => {
    setResult(null);
    setBefore(null);
    setDecision('');
    scrollToTarget(0);
    setTimeout(() => document.getElementById('decision')?.focus(), 500);
  };

  return (
    <div className="wrap lab">
      <div className="lab__head">
        <span className="label label--foam">Decision lab</span>
        <SplitHeading as="h1" immediate className="display" lines={[['What', 'are', 'you'], [<em key="d">deciding?</em>]]} />
        <p className="lead">Describe it in a sentence. Add who it affects, what it costs, and when it starts for a sharper simulation.</p>
      </div>

      <Composer
        decision={decision}
        setDecision={setDecision}
        scope={scope}
        setScope={setScope}
        crowdSize={crowdSize}
        setCrowdSize={setCrowdSize}
        mix={mix}
        setMix={setMix}
        onRun={() => run(decision)}
        busy={busy}
      />

      {history.length > 0 && !result && !busy && (
        <div style={{ marginTop: 28, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">Your recent decisions</span>
            <button
              className="linkish"
              onClick={() => {
                clearHistory();
                setHistory([]);
              }}
            >
              Clear
            </button>
          </div>
          <div className="history">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setDecision(h.decision);
                  setScope(h.scope);
                  if (h.mix) setMix(h.mix);
                  if (h.crowdSize) setCrowdSize(h.crowdSize);
                  run(h.decision, { scope: h.scope, mix: h.mix ?? mix, crowdSize: h.crowdSize ?? crowdSize });
                }}
              >
                <span>{h.decision}</span>
                <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--mist)' }}>
                  {h.verdict} · {h.net > 0 ? '+' : ''}
                  {h.net}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div id="lab-output" style={{ scrollMarginTop: 110 }}>
        {error && (
          <p className="error" role="alert" style={{ marginTop: 24 }}>
            {error}
          </p>
        )}
        <AnimatePresence mode="wait">
          {busy && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loading stage={stage} crowdSize={crowdSize} />
            </motion.div>
          )}
          {!busy && result && (
            <motion.div key={result.id} className="results" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <SubNav />

              <section className="block" id="verdict" aria-label="Verdict">
                {before && <Compare before={before} after={result} />}
                <Verdict r={result} source={source} />
                <RealityPanel r={result} />
              </section>

              <Block id="crowd" eyebrow="The crowd" title={<>Watch <em>{result.crowdSize.toLocaleString()} people</em> make up their minds.</>} intro="Every dot is one simulated person. Press play to move from the announcement to a year later, or hover a group to see where its people live in the crowd.">
                <CrowdPanel r={result} />
              </Block>

              <Block id="voices" eyebrow="The voices" title={<>What they’d <em>actually say.</em></>} intro="One representative from each group, in their own words, with what moved them and what could change their mind.">
                <VoicesBlock r={result} />
              </Block>

              <Block id="groups" eyebrow="Crosstabs" title={<>Who’s for it, <em>group by group.</em></>} intro="Day-one reactions by group, sorted from most supportive to most opposed.">
                <Crosstabs r={result} />
              </Block>

              <Block id="time" eyebrow="Over time" title={<>How the ripple <em>moves.</em></>} intro={result.summary.trajectory}>
                <div className="two-col">
                  <TimelineChart r={result} />
                  <Themes r={result} />
                </div>
              </Block>

              <Block id="hall" eyebrow="Simulated forum" title={<>The {result.scope === 'personal' ? 'dinner table' : result.scope === 'business' ? 'all-hands' : result.scope === 'school' ? 'student forum' : 'town hall'}, <em>in advance.</em></>} intro="Hear the argument play out before it happens for real.">
                <TownHall r={result} />
              </Block>

              <Block id="fixes" eyebrow="Fixes" title={<>Make it a decision <em>more people</em> can live with.</>} intro="Each fix is tested by re-running the simulation with that change added. Apply one to see the full result.">
                <Fixes r={result} onApply={apply} busy={busy} />
              </Block>

              <Block id="method" eyebrow="Method" title={<>How Ripple <em>got here.</em></>}>
                <Method r={result} />
                <div className="actions">
                  <button className="btn" onClick={copy}>
                    Copy summary
                  </button>
                  <button className="btn btn--ghost" onClick={restart}>
                    Try another decision
                  </button>
                </div>
              </Block>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
    </div>
  );
}
