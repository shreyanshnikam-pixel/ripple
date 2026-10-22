import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Recommendation, ScopeChoice, SimulationResult } from '../../../shared/types';
import { decodeMix, parseCrowd, parseScope, simulatorPath } from '../lib/share';
import { SplitHeading, Toast } from '../components/ui';
import { useT, type Lang, translate } from '../i18n';
import { runSimulation, type Source } from '../lib/api';
import { copyText } from '../lib/clipboard';
import { districtFromCode, districtFromLabel, recalledDistrict, rememberDistrict, type DistrictPick } from '../lib/district';
import { clearHistory, loadHistory, saveToHistory, type HistoryItem } from '../lib/history';
import { prefersReducedMotion } from '../lib/motion';
import { scrollToTarget, ScrollTrigger } from '../lib/smooth';
import { Composer, Loading } from '../sim/Composer';
import { Block, Compare, CrowdPanel, Crosstabs, Fixes, Method, RealityPanel, Themes, TimelineChart, TownHall, Verdict, VoicesBlock } from '../sim/Results';
import { AiPanel } from '../sim/AiPanel';
import { ListenPanel } from '../sim/Listen';
import { SaveToProject } from '../sim/SaveToProject';
import { ShareSheet } from '../sim/ShareSheet';
import { TakeAction } from '../sim/TakeAction';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SECTIONS = [
  ['verdict', 'Verdict'],
  ['report', 'AI report'],
  ['crowd', 'Crowd'],
  ['voices', 'Voices'],
  ['groups', 'Groups'],
  ['time', 'Over time'],
  ['hall', 'Town hall'],
  ['fixes', 'Fixes'],
  ['act', 'Act'],
  ['method', 'Method'],
] as const;

/** Sticky section menu. Mounted with the results, so the sections exist when it starts watching. */
function SubNav({ onShare }: { onShare: () => void }) {
  const { t } = useT();
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
    <nav className="subnav" aria-label={t('Report sections')}>
      {SECTIONS.map(([id, label]) => (
        <button key={id} className={active === id ? 'is-on' : ''} aria-current={active === id ? 'true' : undefined} onClick={() => scrollToTarget(`#${id}`, -150)}>
          {active === id && <motion.span layoutId="subnav" className="seg-bg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
          <span>{t(label)}</span>
        </button>
      ))}
      <button className="subnav__share" onClick={onShare}>
        <span>{t('Share')}</span>
      </button>
    </nav>
  );
}

function summaryText(r: SimulationResult, lang: Lang) {
  const s = r.summary;
  const fix = r.recommendations[0];
  const tr = (text: string, vars?: Record<string, string | number>) => translate(lang, text, vars);
  return [
    tr('Ripple simulation: “{decision}”', { decision: r.decision }),
    tr('{verdict}: {support}% for, {neutral}% undecided, {oppose}% against (net {net}, ±{moe}).', {
      verdict: tr(s.verdict),
      support: s.support,
      neutral: s.neutral,
      oppose: s.oppose,
      net: `${s.net > 0 ? '+' : ''}${s.net}`,
      moe: s.marginOfError,
    }),
    s.headline,
    s.trajectory,
    fix ? tr('Best fix to try: {fix} (+{lift} points projected).', { fix: fix.title, lift: fix.projectedLift }) : '',
    tr('These are simulated reactions, not survey results.'),
  ]
    .filter(Boolean)
    .join('\n');
}

export default function Simulator() {
  const { t, lang } = useT();
  const [params, setParams] = useSearchParams();
  const [decision, setDecision] = useState(() => (params.get('d') ?? '').slice(0, 500));
  const [scope, setScope] = useState<ScopeChoice>(() => parseScope(params.get('s')));
  const [crowdSize, setCrowdSize] = useState(() => parseCrowd(params.get('n')));
  const [mix, setMix] = useState<Record<string, number>>(() => decodeMix(params.get('m')));
  // The district whose Census population fills the room (from the link or the room panel).
  const [district, setDistrict] = useState<string | null>(() => params.get('cd'));
  // The district to write from: the one this person chose on this device, else the room's.
  const [home, setHome] = useState<{ pick: DistrictPick; yours: boolean } | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [before, setBefore] = useState<SimulationResult | null>(null);
  const [source, setSource] = useState<Source>('browser');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [toast, setToast] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const autoRan = useRef(false);

  useEffect(() => {
    document.title = t('Simulator · Ripple');
  }, [t]);

  useEffect(() => {
    let live = true;
    const saved = recalledDistrict();
    const load = saved ? districtFromCode(saved).then((p) => (p ? { pick: p, yours: true } : null)) : Promise.resolve(null);
    load
      .then((h) => h ?? (district ? districtFromLabel(district).then((p) => (p ? { pick: p, yours: false } : null)) : null))
      .then((h) => live && setHome(h))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [district]);

  const chooseDistrict = (p: DistrictPick | null) => {
    setDistrict(p ? p.district.label : null);
    if (p) {
      rememberDistrict(p.code);
      setHome({ pick: p, yours: true });
    }
  };

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
        const path = simulatorPath({ decision: r.decision, scope: useScope, crowdSize: r.crowdSize, mix: useMix, district: r.scope === 'community' && district ? district : undefined }, false);
        setParams(new URLSearchParams(path.split('?')[1]), { replace: true });
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          scrollToTarget('#lab-output', -110);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : translate(lang, 'Something went wrong. Try again.'));
      } finally {
        setBusy(false);
      }
    },
    [busy, scope, crowdSize, mix, district, setParams, lang],
  );

  useEffect(() => {
    if (autoRan.current) return;
    const d = params.get('d');
    if (d && params.get('run') === '1') {
      autoRan.current = true;
      const cd = params.get('cd');
      if (cd && !params.get('m')) {
        // A link with a district but no room: build the room from the district's Census data.
        districtFromLabel(cd)
          .catch(() => null)
          .then((p) => {
            if (p) setMix(p.mix);
            else setDistrict(null);
            run(d, p ? { mix: p.mix } : {});
          });
      } else setTimeout(() => run(d), 350);
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
    flash((await copyText(summaryText(result, lang))) ? t('Summary copied') : t('Couldn’t copy. Select the text instead.'));
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
        <span className="label label--foam">{t('Decision lab')}</span>
        <SplitHeading
          as="h1"
          immediate
          className="display"
          lines={lang === 'es' ? [['¿Qué', 'estás'], [<em key="d">decidiendo?</em>]] : [['What', 'are', 'you'], [<em key="d">deciding?</em>]]}
        />
        <p className="lead">{t('Describe it in a sentence. Add who it affects, what it costs, and when it starts for a sharper simulation.')}</p>
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
        district={district}
        onDistrict={chooseDistrict}
      />

      {history.length > 0 && !result && !busy && (
        <div style={{ marginTop: 28, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">{t('Your recent decisions')}</span>
            <button
              className="linkish"
              onClick={() => {
                clearHistory();
                setHistory([]);
              }}
            >
              {t('Clear')}
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
                  {t(h.verdict)} · {h.net > 0 ? '+' : ''}
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
              <SubNav onShare={() => setSharing(true)} />

              <section className="block" id="verdict" aria-label={t('Verdict')}>
                {lang === 'es' && <p className="reality__note">Los resultados detallados de la simulación (voces, citas y sugerencias) están en inglés por ahora.</p>}
                {before && <Compare before={before} after={result} />}
                <Verdict r={result} source={source} district={result.scope === 'community' ? district : null} />
                <RealityPanel r={result} />
              </section>

              <Block
                id="report"
                eyebrow={t('AI report')}
                title={lang === 'es' ? <>La historia completa, <em>escrita por Claude.</em></> : <>The full story, <em>written by Claude.</em></>}
                intro={t('Optional. Claude turns this simulation into a report you can share, and answers follow-up questions about it.')}
              >
                <AiPanel r={result} district={result.scope === 'community' ? district : null} onFlash={flash} />
              </Block>

              <Block
                id="crowd"
                eyebrow={t('The crowd')}
                title={
                  lang === 'es' ? (
                    <>
                      Mira a <em>{result.crowdSize.toLocaleString()} personas</em> formarse una opinión.
                    </>
                  ) : (
                    <>
                      Watch <em>{result.crowdSize.toLocaleString()} people</em> make up their minds.
                    </>
                  )
                }
                intro={t('Every dot is one simulated person. Press play to move from the announcement to a year later, or hover a group to see where its people live in the crowd.')}
              >
                <CrowdPanel r={result} />
              </Block>

              <Block
                id="voices"
                eyebrow={t('The voices')}
                title={lang === 'es' ? <>Lo que <em>de verdad dirían.</em></> : <>What they’d <em>actually say.</em></>}
                intro={t('One representative from each group, in their own words, with what moved them and what could change their mind.')}
              >
                <VoicesBlock r={result} />
              </Block>

              <Block
                id="groups"
                eyebrow={t('Crosstabs')}
                title={lang === 'es' ? <>Quién está a favor, <em>grupo por grupo.</em></> : <>Who’s for it, <em>group by group.</em></>}
                intro={t('Day-one reactions by group, sorted from most supportive to most opposed.')}
              >
                <Crosstabs r={result} />
              </Block>

              <Block id="time" eyebrow={t('Over time')} title={lang === 'es' ? <>Cómo se <em>expande la onda.</em></> : <>How the ripple <em>moves.</em></>} intro={result.summary.trajectory}>
                <div className="two-col">
                  <TimelineChart r={result} />
                  <Themes r={result} />
                </div>
              </Block>

              <Block
                id="hall"
                eyebrow={t('Simulated forum')}
                title={
                  lang === 'es' ? (
                    <>
                      {result.scope === 'personal' ? 'La sobremesa' : result.scope === 'business' ? 'La reunión de equipo' : result.scope === 'school' ? 'El foro estudiantil' : 'La asamblea vecinal'}, <em>por adelantado.</em>
                    </>
                  ) : (
                    <>
                      The {result.scope === 'personal' ? 'dinner table' : result.scope === 'business' ? 'all-hands' : result.scope === 'school' ? 'student forum' : 'town hall'}, <em>in advance.</em>
                    </>
                  )
                }
                intro={t('Hear the argument play out before it happens for real.')}
              >
                <TownHall r={result} />
              </Block>

              <Block
                id="fixes"
                eyebrow={t('Fixes')}
                title={lang === 'es' ? <>Que sea una decisión que <em>más gente</em> pueda aceptar.</> : <>Make it a decision <em>more people</em> can live with.</>}
                intro={t('Each fix is tested by re-running the simulation with that change added. Apply one to see the full result.')}
              >
                <Fixes r={result} onApply={apply} busy={busy} />
              </Block>

              <Block
                id="act"
                eyebrow={t('Take it further')}
                title={lang === 'es' ? <>Ahora ve a escuchar a <em>personas reales.</em></> : <>Now go hear from <em>real people.</em></>}
                intro={t('Ripple is a rehearsal. Here’s who makes this decision for real, and a way to start the conversation.')}
              >
                <TakeAction
                  r={result}
                  home={home?.pick ?? null}
                  yours={home?.yours ?? false}
                  onPick={(p) => {
                    rememberDistrict(p.code);
                    setHome({ pick: p, yours: true });
                  }}
                  onCopied={(ok) => flash(ok ? t('Copied') : t('Couldn’t copy. Select the text instead.'))}
                />
                <ListenPanel r={result} district={result.scope === 'community' ? district : null} onFlash={flash} onCopied={(ok) => flash(ok ? t('Link copied') : t('Couldn’t copy the link'))} />
              </Block>

              <Block id="method" eyebrow={t('Method')} title={lang === 'es' ? <>Cómo llegó Ripple <em>a esto.</em></> : <>How Ripple <em>got here.</em></>}>
                <Method r={result} />
                <div className="actions">
                  <button className="btn" onClick={() => setSharing(true)}>
                    {t('Share this result')}
                  </button>
                  <button className="btn btn--ghost" onClick={copy}>
                    {t('Copy summary')}
                  </button>
                  <SaveToProject r={result} district={result.scope === 'community' ? district : null} onDone={flash} />
                  <button className="btn btn--ghost" onClick={restart}>
                    {t('Try another decision')}
                  </button>
                </div>
              </Block>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {sharing && result && (
          <ShareSheet
            r={result}
            district={result.scope === 'community' ? district : null}
            onClose={() => setSharing(false)}
            onDone={(msg) => flash(msg)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
    </div>
  );
}
