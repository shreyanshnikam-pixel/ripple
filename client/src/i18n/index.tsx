/**
 * English / Spanish. Text is written in English and wrapped in t(): the English sentence is the key,
 * so anything not yet translated falls back to English instead of breaking.
 *
 *   const { t } = useT();
 *   t('Open the simulator')                       → "Abrir el simulador"
 *   t('Showing {n} of {total}', { n: 3, total: 9 }) → "Mostrando 3 de 9"
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ES } from './es';

export type Lang = 'en' | 'es';
const KEY = 'ripple:lang';

export function translate(lang: Lang, text: string, vars?: Record<string, string | number>): string {
  let out = lang === 'es' ? (ES[text] ?? text) : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

function initialLang(): Lang {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'es' || q === 'en') return q;
    const saved = localStorage.getItem(KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* storage blocked */
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (text: string, vars?: Record<string, string | number>) => string };
const LangContext = createContext<Ctx>({ lang: 'en', setLang: () => undefined, t: (s, v) => translate('en', s, v) });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* the choice lasts until the page closes */
    }
  }, []);
  const value = useMemo<Ctx>(() => ({ lang, setLang, t: (s, v) => translate(lang, s, v) }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useT = () => useContext(LangContext);
