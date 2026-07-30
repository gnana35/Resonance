/**
 * Supabase connection check.
 *
 * Visit /supabase-check to confirm the env vars loaded and that the client can
 * reach the project. Read-only — it never writes.
 *
 * Temporary: delete this route once the connection is confirmed.
 */

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function SupabaseCheckPage() {
  const { data, error } = await supabase.from("assets").select("*").limit(5);

  return (
    <main style={{ fontFamily: "ui-monospace, monospace", padding: 32, lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Supabase connection check</h1>

      <p>
        <strong>URL:</strong>{" "}
        {process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(undefined — env not loaded)"}
      </p>
      <p>
        <strong>Anon key:</strong>{" "}
        {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "loaded" : "(undefined — env not loaded)"}
      </p>

      {error ? (
        <p style={{ color: "crimson" }}>
          <strong>Error</strong> — {error.message}
        </p>
      ) : (
        <>
          <p style={{ color: "#16a34a" }}>
            <strong>Success</strong> — fetched {data.length} row(s) from `assets`.
          </p>
          <pre style={{ background: "#f4f4f4", padding: 16, overflowX: "auto" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </>
      )}
    </main>
  );
}
