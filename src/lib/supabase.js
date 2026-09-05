import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== "undefined" && process.env?.SUPABASE_URL) || "https://mock.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== "undefined" && process.env?.SUPABASE_ANON_KEY) || "mock_key";

const customFetch = (url, options) => {
  if (url.includes("mock.supabase.co")) {
    return Promise.resolve(new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }));
  }
  return fetch(url, options);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  }
});
