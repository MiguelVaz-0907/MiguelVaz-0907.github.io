/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PIX_KEY: string
  readonly VITE_PIX_MERCHANT_NAME: string
  readonly VITE_PIX_MERCHANT_CITY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
