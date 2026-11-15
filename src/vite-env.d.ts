/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Gemini API key, set in .env (never commit that file). */
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
