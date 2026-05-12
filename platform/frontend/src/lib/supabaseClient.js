// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const createDisabledClient = () => {
  const disabledError = new Error(
    "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable authentication."
  );

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
      signInWithOtp: async () => ({ data: null, error: disabledError }),
      verifyOtp: async () => ({ data: null, error: disabledError }),
      signInWithOAuth: async () => ({ data: null, error: disabledError }),
      signOut: async () => ({ error: null }),
    },
  };
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      global: {
        headers: {
          "X-Client-Info": "platform-frontend",
        },
      },
    })
  : createDisabledClient();

if (typeof window !== "undefined") {
  if (isSupabaseConfigured) {
    console.log("🔧 Supabase URL:", supabaseUrl);
    console.log("🔗 Auth Redirect URL:", `${window.location.origin}/auth/callback`);
  } else {
    console.warn("⚠️ Supabase env vars not configured. Auth features are disabled.");
  }
}
