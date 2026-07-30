/*
 * src/hooks/useUnreadCount.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns the live unread notification count for a persona.
 * Subscribes to Supabase Realtime so the count updates without a page reload.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

async function fetchCount(persona: "writer" | "designer"): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient", persona)
    .eq("status", "unread");
  if (error) {
    console.error("useUnreadCount:", error.message);
    return 0;
  }
  return count ?? 0;
}

export function useUnreadCount(persona: "writer" | "designer"): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Initial load.
    void fetchCount(persona).then(setCount);

    // Realtime subscription — recount on any change to this persona's rows.
    const channel: RealtimeChannel = supabase
      .channel(`unread-count:${persona}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "notifications",
          filter: `recipient=eq.${persona}`,
        },
        () => { void fetchCount(persona).then(setCount); },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [persona]);

  return count;
}
