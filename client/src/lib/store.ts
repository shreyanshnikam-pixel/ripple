/**
 * JSON in localStorage, with an in-memory fallback for browsers or previews that block storage
 * (then things last until the page is closed instead of failing).
 */
const memory = new Map<string, string>();

export function readStore<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    /* blocked: use memory */
  }
  raw ??= memory.get(key) ?? null;
  try {
    return (JSON.parse(raw ?? 'null') as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStore(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    localStorage.setItem(key, raw);
  } catch {
    /* blocked or full: memory keeps it for this visit */
  }
}
