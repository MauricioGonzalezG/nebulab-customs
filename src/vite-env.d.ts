/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WOMPI_PUBLIC_KEY?: string;
  readonly VITE_WOMPI_CURRENCY?: string;
  readonly VITE_COP_EXCHANGE_RATE?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
