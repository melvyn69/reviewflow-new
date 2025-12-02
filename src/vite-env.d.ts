
interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STRIPE_LINK_STARTER: string;
  readonly VITE_STRIPE_LINK_PRO: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
