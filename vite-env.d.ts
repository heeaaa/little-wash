/// <reference types="vite/client" />

declare module "*.svg" {
  const src: string;
  export default src;
}

/*
  Build-time values the browser bundle reads. All public by nature - anything
  prefixed VITE_ is written into the JavaScript - which is why these are a
  project address, a publishable key and a support address, and why the build
  refuses to run if a secret key is put in one (vite.config.ts).
*/
interface ImportMetaEnv {
  /** The Supabase project's API origin. Absent: no sign-in in this build. */
  readonly VITE_SUPABASE_URL?: string;
  /** The project's publishable key (sb_publishable_...). Never the secret key. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Optional: an address for privacy questions, shown on the privacy page. */
  readonly VITE_SUPPORT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
