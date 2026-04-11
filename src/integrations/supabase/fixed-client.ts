import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Emergency Fix: Full keys extracted from production to bypass local cache issues
const SUPABASE_URL = "https://fszltwvhbdasqoznnors.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Gzhlfby5j4fNoyTJnhw0ew_pE41f8_S";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
