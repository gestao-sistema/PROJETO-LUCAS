import { createClient } from "@supabase/supabase-js";

// Vite replaces static import.meta.env.VITE_* at build time (client bundle)
// process.env fallback for Node.js SSR / Railway runtime
let supabaseUrl: string | undefined;
let supabaseKey: string | undefined;

try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
} catch {}
try {
  supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
} catch {}

if (!supabaseUrl && typeof process !== "undefined") {
  supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
}
if (!supabaseKey && typeof process !== "undefined") {
  supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
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
