import type { Scope } from '../../../shared/types';

export interface HistoryItem {
  id: string;
  decision: string;
  scope: Scope;
  net: number;
  verdict: string;
  at: string;
  crowdSize?: number;
  mix?: Record<string, number>;
}

const KEY = 'ripple.history.v1';

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as HistoryItem[]) : [];
    return Array.isArray(list) ? list.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(item: HistoryItem) {
  try {
    const list = loadHistory().filter((h) => h.decision.toLowerCase() !== item.decision.toLowerCase());
    localStorage.setItem(KEY, JSON.stringify([item, ...list].slice(0, 8)));
  } catch {
    /* storage unavailable: history is a convenience only */
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
