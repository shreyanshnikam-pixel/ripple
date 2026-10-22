import chrome from './es/chrome';
import extra from './es/extra';
import landing from './es/landing';
import pages from './es/pages';
import sim from './es/sim';

/** Every Spanish translation, keyed by the English text. Each area of the site keeps its own file in ./es/. */
export const ES: Record<string, string> = { ...chrome, ...landing, ...sim, ...pages, ...extra };
