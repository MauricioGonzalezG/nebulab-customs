/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURSO_DATABASE_URL?: string;
  readonly VITE_TURSO_AUTH_TOKEN?: string;
  readonly VITE_ADMIN_DEFAULT_EMAIL?: string;
  readonly VITE_ADMIN_DEFAULT_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
