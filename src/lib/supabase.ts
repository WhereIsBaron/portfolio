import { createClient, SupabaseClient } from '@supabase/supabase-js';

// URL + client key come from the environment (Vite `VITE_` vars). The client
// key is safe in the browser: Row Level Security decides what it can actually do.
// Prefer the new publishable key (sb_publishable_…); fall back to the legacy
// anon JWT so nothing breaks during the migration. Once the legacy keys are
// disabled in Supabase, only the publishable key remains — and this still works.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const clientKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

// IMPORTANT: never call createClient with undefined values (it throws at load
// and blanks the whole site). When the env is not set, `supabase` is null and
// features that need it degrade gracefully.
export const supabase: SupabaseClient | null =
  url && clientKey ? createClient(url, clientKey) : null;

export const supabaseConfigured = Boolean(url && clientKey);
