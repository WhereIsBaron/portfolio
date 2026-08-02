import { createClient, SupabaseClient } from '@supabase/supabase-js';

// URL + anon key come from the environment (Vite `VITE_` vars). The anon key is
// safe in the client: Row Level Security decides what it can actually do.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// IMPORTANT: never call createClient with undefined values (it throws at load
// and blanks the whole site). When the env is not set, `supabase` is null and
// features that need it degrade gracefully.
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const supabaseConfigured = Boolean(url && anonKey);
