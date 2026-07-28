import { createClient } from "@supabase/supabase-js";

// Try Vite's import.meta.env first (for browser and dev)
// Fallback to process.env (for Node.js SSR runtime on Railway)
const getEnv = (key: string) => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
};

const url = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
const key = getEnv("VITE_SUPABASE_ANON_KEY") || getEnv("SUPABASE_ANON_KEY");

if (!url || !key) {
  throw new Error("Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

