import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart `npm run dev`."
  );
}

// Catches the easy mix-up: pasting a key (sb_publishable_… / eyJ…) into the URL slot.
if (!supabaseUrl.startsWith("http")) {
  throw new Error(
    `NEXT_PUBLIC_SUPABASE_URL must be a URL like https://<project-ref>.supabase.co — got "${supabaseUrl.slice(0, 12)}…"`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Temporary connectivity smoke test.
 *
 * Logs the configured URL (to confirm .env.local loaded) and runs a real query
 * against the `assets` table. Visit /supabase-check to run it, then delete this
 * function and src/app/supabase-check/ once the connection is confirmed.
 */
export async function checkSupabaseConnection() {
  // 1. Log the configured URL (to ensure .env loaded correctly)
  console.log("Connected Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

  // 2. Simple query to test the connection
  const { data, error } = await supabase.from("assets").select("*");

  if (error) {
    console.error("Supabase Error:", error.message);
    return { ok: false as const, message: error.message };
  }

  console.log("Supabase Success! Assets fetched:", data);
  return { ok: true as const, rows: data };
}
