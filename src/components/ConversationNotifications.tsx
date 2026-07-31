"use client";

/**
 * ConversationNotifications
 *
 * Surfaces asset-conversation replies in the notification centre for BOTH
 * personas.
 *
 * Before this, a reply only produced a transient toast and a sidebar badge —
 * if you missed the toast there was nowhere to find out who said what. The
 * designer had it worse: their notifications page showed consistency
 * discrepancies only, so nothing the writer said or decided appeared there at
 * all. They had to already be looking at the Assets page to notice.
 *
 * One unread group per asset, newest first, each showing who replied and the
 * latest message. Opening it marks the thread seen and hands off to the caller
 * so it can scroll to or open that asset's chat.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquare, XCircle } from "lucide-react";
import {
  markAssetChatSeen,
  subscribeAssetChat,
  subscribeUnreadChat,
  type DesignChatFrom,
  type DesignFeedbackMsg,
} from "@/lib/assets";

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleDateString();
}

/** One entry per asset with unread inbound messages. */
type Group = {
  assetId:   string;
  assetName: string;
  latest:    DesignFeedbackMsg;
  count:     number;
};

export function ConversationNotifications({
  role,
  accentClass = "gold",
  onOpenAsset,
}: {
  /** The persona viewing — inbound means "not from this role". */
  role: DesignChatFrom;
  accentClass?: "gold" | "violet";
  /** Called after the thread is marked seen, so the page can reveal the chat. */
  onOpenAsset?: (assetId: string) => void;
}) {
  const [unreadIds, setUnreadIds] = useState<string[]>([]);
  const [allMsgs,   setAllMsgs]   = useState<DesignFeedbackMsg[]>([]);

  useEffect(
    () => subscribeUnreadChat(role, ({ assetIds }) => setUnreadIds(assetIds)),
    [role],
  );
  useEffect(() => subscribeAssetChat(setAllMsgs), []);

  // Build one group per asset that still has unread inbound messages.
  const groups: Group[] = unreadIds
    .map((assetId) => {
      const inbound = allMsgs
        .filter((m) => m.assetId === assetId && m.from !== role)
        .sort((a, b) => b.createdAt - a.createdAt);
      if (!inbound.length) return null;
      return {
        assetId,
        assetName: inbound[0].assetName,
        latest:    inbound[0],
        count:     inbound.length,
      };
    })
    .filter((g): g is Group => g !== null)
    .sort((a, b) => b.latest.createdAt - a.latest.createdAt);

  if (groups.length === 0) return null;

  const other      = role === "writer" ? "Designer" : "Writer";
  const accentFg   = accentClass === "gold" ? "text-gold-1" : "text-violet-1";
  const accentRing = accentClass === "gold" ? "border-gold-2/50" : "border-violet-2/50";
  const accentBtn  = accentClass === "gold"
    ? "bg-gold-2/20 text-gold-1 hover:bg-gold-2/30"
    : "bg-violet-2/20 text-violet-1 hover:bg-violet-2/30";

  return (
    <div className="mb-8 flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/40">
        Conversations
      </h2>

      {groups.map((g) => {
        // A decision (approve/revision/reject) reads differently from chatter.
        const kind = g.latest.kind;
        const isDecision = kind === "approve" || kind === "revision" || kind === "reject";

        const headline =
          kind === "approve" ? `${other} approved ${g.assetName}`
          : kind === "reject" ? `${other} rejected ${g.assetName}`
          : kind === "revision" ? `${other} requested changes on ${g.assetName}`
          : `${other} replied about ${g.assetName}`;

        const Icon =
          kind === "approve" ? CheckCircle2
          : kind === "reject" ? XCircle
          : MessageSquare;

        const tone =
          kind === "approve" ? "text-emerald-400"
          : kind === "reject" ? "text-red-400"
          : kind === "revision" ? "text-amber-400"
          : "text-ink/40";

        return (
          <div
            key={g.assetId}
            className={`rounded-2xl border bg-bg-1 p-5 ${accentRing}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
                <div className="min-w-0">
                  <p className={`font-display text-lg ${accentFg}`}>{headline}</p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-ink/80">
                    {g.latest.message}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-xs text-ink/40">{timeAgo(g.latest.createdAt)}</span>
                {g.count > 1 && (
                  <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] text-ink/60">
                    {g.count} unread
                  </span>
                )}
                {isDecision && (
                  <span className={`text-[10px] uppercase tracking-wide ${tone}`}>
                    {kind}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => {
                  markAssetChatSeen(g.assetId, role);
                  onOpenAsset?.(g.assetId);
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium ${accentBtn}`}
              >
                Open conversation
              </button>
              <button
                onClick={() => markAssetChatSeen(g.assetId, role)}
                className="text-xs text-ink/50 hover:text-ink"
              >
                Mark read
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
