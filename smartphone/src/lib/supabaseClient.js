import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://dphrvdhqhgycmllietuk.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2wYXnIDj4-c8daQZW8D5hA_2Py6k7z6";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
const supabaseAnonKey = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY
).trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase non configure: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants");
}

const sessionStorageAdapter =
  typeof window !== "undefined" && window.sessionStorage
    ? window.sessionStorage
    : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: sessionStorageAdapter,
  },
});

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session || null);
  });
  return () => {
    data?.subscription?.unsubscribe();
  };
}
