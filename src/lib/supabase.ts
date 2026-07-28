import { createClient } from "@supabase/supabase-js";

// Server (Node.js/SSR) — read from process.env (Railway runtime)
// Client (Vite bundle) — import.meta.env.VITE_* replaced at build time
let supabaseUrl: string | undefined;
let supabaseKey: string | undefined;

if (typeof process !== "undefined") {
  supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
} else {
  try { supabaseUrl = import.meta.env.VITE_SUPABASE_URL; } catch {}
  try { supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; } catch {}
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
