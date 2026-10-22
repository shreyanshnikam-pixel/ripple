import { useEffect, useMemo } from 'react';
import { simulate } from '../../../shared/engine';
import { EXAMPLES } from '../../../shared/examples';
import { Hero } from '../sections/Hero';
import { Marquee, Statement } from '../sections/Story';
import { HowItWorks } from '../sections/HowItWorks';
import { Spread, Voices } from '../sections/Voices';
import { FinalCTA, Principles, UseCases } from '../sections/Closing';
import { WordsMatter } from '../sections/WordsMatter';
import { Toolkit } from '../sections/Toolkit';
import { ScrollTrigger } from '../lib/smooth';
import { useT } from '../i18n';

export default function Landing() {
  // One real simulation powers every demo on the page, so what visitors see is what the engine produces.
  const demo = useMemo(() => simulate({ decision: EXAMPLES[0].text, scope: EXAMPLES[0].scope, crowdSize: 900 }), []);
  const { t, lang } = useT();

  useEffect(() => {
    document.title = t('Ripple Decision Simulator');
  }, [t]);

  // Spanish text runs longer, so pinned sections need their scroll distances measured again.
  useEffect(() => {
    const id = setTimeout(() => ScrollTrigger.refresh(), 150);
    return () => clearTimeout(id);
  }, [lang]);

  useEffect(() => {
    // Fonts and pinned sections change layout after first paint.
    const timer = setTimeout(() => ScrollTrigger.refresh(), 600);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Hero demo={demo} />
      <Marquee />
      <Statement />
      <HowItWorks demo={demo} />
      <Spread demo={demo} />
      <Voices />
      <WordsMatter />
      <Toolkit />
      <UseCases />
      <Principles />
      <FinalCTA />
    </>
  );
}
