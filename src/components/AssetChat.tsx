"use client";

/**
 * AssetChat
 *
 * The per-asset conversation between the writer and the designer. Both sides
 * render the SAME thread (persisted in assets.ts, keyed by assetId), so the
 * designer can reference exactly what the writer asked for while reworking a
 * design, and either party can keep replying.
 *
 * `me` decides which bubbles are right-aligned ("you") and who a new message is
 * attributed to. `accent` themes it to the surrounding page (gold on the
 * writer side, violet on the designer side).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Send, ThumbsUp, XCircle } from "lucide-react";
import {
  markAssetChatSeen,
  postAssetChatMessage,
  subscribeAssetChat,
  type DesignChatFrom,
  type DesignChatKind,
  type DesignFeedbackMsg,
} from "@/lib/assets";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

const KIND_BADGE: Partial<Record<DesignChatKind, { label: string; className: string; icon: typeof RotateCcw }>> = {
  revision: { label: "Requested changes", className: "bg-amber-500/15 text-amber-300", icon: RotateCcw },
  reject:   { label: "Rejected",          className: "bg-red-500/15 text-red-300",    icon: XCircle },
  approve:  { label: "Approved",          className: "bg-emerald-500/15 text-emerald-300", icon: ThumbsUp },
};

export function AssetChat({
  assetId,
  assetName,
  characterId,
  me,
  accent = "violet",
  emptyHint,
}: {
  assetId: string;
  assetName: string;
  characterId?: string | null;
  me: DesignChatFrom;
  accent?: "violet" | "gold";
  emptyHint?: string;
}) {
  const [messages, setMessages] = useState<DesignFeedbackMsg[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => subscribeAssetChat((rows) => setMessages(rows), assetId),
    [assetId],
  );

  // Opening the thread clears this side's unread badge for it — and marks any
  // messages that arrive while it's open as read too.
  useEffect(() => {
    markAssetChatSeen(assetId, me);
  }, [assetId, me, messages.length]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const accentSend = accent === "gold"
    ? "bg-gold-2 text-bg-0 hover:bg-gold-1"
    : "bg-violet-2 text-bg-0 hover:bg-violet-1";
  const mineBubble = accent === "gold"
    ? "bg-gold-2/20 text-ink"
    : "bg-violet-2/20 text-ink";
  const theirBubble = "bg-bg-0 text-ink/85 border border-violet-3/15";

  const roleLabel = useMemo(
    () => ({ writer: "Writer", designer: "Designer" }) as Record<DesignChatFrom, string>,
    [],
  );

  function send() {
    const text = draft.trim();
    if (!text) return;
    postAssetChatMessage({ id: assetId, name: assetName, characterId }, me, text).catch(console.error);
    setDraft("");
  }

  return (
    <div className="flex flex-col rounded-xl border border-violet-3/20 bg-bg-1">
      {/* Thread */}
      <div ref={scrollRef} className="flex max-h-72 flex-col gap-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink/40">
            {emptyHint ?? "No messages yet. Start the conversation about this design."}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.from === me;
            const badge = KIND_BADGE[m.kind];
            const Icon = badge?.icon;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div className="mb-0.5 flex items-center gap-1.5 px-1 text-[10px] text-ink/40">
                  <span className="font-medium text-ink/55">{mine ? "You" : roleLabel[m.from]}</span>
                  <span>·</span>
                  <span>{timeAgo(m.createdAt)}</span>
                </div>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? mineBubble : theirBubble}`}>
                  {badge && Icon && (
                    <span className={`mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                      <Icon className="h-3 w-3" />
                      {badge.label}
                    </span>
                  )}
                  {m.message ? (
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  ) : (
                    <p className="italic text-ink/40">No note added.</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 border-t border-violet-3/15 p-2.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={me === "designer" ? "Reply to the writer…" : "Message the designer…"}
          className="max-h-24 min-h-[38px] w-full resize-none rounded-lg border border-violet-3/25 bg-bg-0 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-violet-2/50 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          aria-label="Send message"
          className={`flex h-[38px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-40 ${accentSend}`}
        >
          <Send className="h-3.5 w-3.5" />
          Send
        </button>
      </div>
    </div>
  );
}
