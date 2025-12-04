/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly VITE_CSP_REPORT_ENDPOINT?: string;
  readonly VITE_CSP_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}