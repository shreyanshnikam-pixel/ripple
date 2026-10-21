/// <reference types="vite/client" />
declare const __BUILD_MODE__: 'full' | 'artifact' | 'pages';

interface ImportMetaEnv {
  /** Optional: where a deployed Ripple server lives, for static builds (e.g. https://ripple-api.onrender.com). */
  readonly VITE_API_URL?: string;
}
