/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYPAL_CLIENT_ID: string;
  readonly VITE_API_URL: string;
  readonly VITE_CHANNEL3_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
