"use client";

/**
 * DesignShareNotifications
 *
 * Shows design-share notifications sent from the designer to the writer.
 * Each card shows the asset thumbnail, name, character/scene context,
 * description, and a timestamp.
 *
 * Instead of bouncing the writer over to the designer's Assets library, every
 * card carries its own review controls:
 *
 *   • Accept design    → approves the asset AND connects it to the character it
 *                        was originally made for (character.designerSharedAssetIds).
 *   • Request changes  → opens a message thread to the designer; the asset moves
 *                        to Needs Revision.
 *   • Reject design    → opens a message thread to the designer; the asset moves
 *                        to Rejected.
 *
 * The resolved decision is read back from the asset's own validationStatus, so a
 * card reflects the writer's last call even after a reload.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ImageIcon,
  MessageSquareText,
  MessagesSquare,
  PenTool,
  Send,
  ThumbsUp,
  X,
  XCircle,
} from "lucide-react";
import {
  markNotifRead,
  postAssetChatMessage,
  subscribeUnreadChat,
  markAssetChatSeen,
  sendDesignFeedback,
  setValidationStatus,
  subscribeAssets,
  subscribeDesignShareNotifs,
  type AssetRecord,
  type AssetValidationStatus,
  type DesignFeedbackKind,
  type DesignShareNotif,
} from "@/lib/assets";
import { AssetChat } from "@/components/AssetChat";
import { useCharacters } from "@/context/CharactersContext";
import { useToast } from "@/components/Toast";
import type { Character } from "@/data/characters";

function timeAgo(d: Date | number): string {
  const diff = Date.now() - (d instanceof Date ? d.getTime() : d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Resolve a notif's characterId (an id or a plain name) to a real Character. */
function resolveCharacter(all: Character[], key: string | null): Character | null {
  if (!key) return null;
  return (
    all.find((c) => c.id === key) ??
    all.find((c) => c.name.toLowerCase() === key.toLowerCase()) ??
    null
  );
}

/* ─── resolved-decision banner ──────────────────────────────────────────── */

function DecisionBanner({
  status,
  character,
}: {
  status: AssetValidationStatus;
  character: Character | null;
}) {
  if (status === "approved") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {character ? (
          <span>
            Accepted — linked to{" "}
            <Link
              href={`/writer/characters/${character.id}`}
              className="underline underline-offset-2 hover:text-emerald-300"
            >
              {character.name}
            </Link>
          </span>
        ) : (
          <span>Accepted</span>
        )}
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-400">
        <XCircle className="h-3.5 w-3.5" />
        Rejected — designer notified
      </div>
    );
  }
  // needs_revision
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
      <Clock className="h-3.5 w-3.5" />
      Changes requested — designer notified
    </div>
  );
}

/* ─── message-to-designer panel (the chat control) ──────────────────────── */

function FeedbackPanel({
  kind,
  onSend,
  onCancel,
}: {
  kind: DesignFeedbackKind;
  onSend: (message: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState("");
  const reject = kind === "reject";

  return (
    <div className="rounded-lg border border-gold-3/25 bg-bg-0 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-ink/70">
          <MessageSquareText className="h-3.5 w-3.5 text-gold-2" />
          {reject ? "Tell the designer why you're rejecting this" : "Tell the designer what to change"}
        </p>
        <button onClick={onCancel} aria-label="Close" className="text-ink/40 hover:text-ink">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        autoFocus
        placeholder={
          reject
            ? "e.g. This direction doesn't match the character's tone…"
            : "e.g. Love the silhouette — can we warm up the palette?"
        }
        className="w-full resize-y rounded-md border border-gold-3/25 bg-bg-1 px-2.5 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-gold-2/50 focus:outline-none"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-full border border-gold-3/30 px-3 py-1.5 text-xs text-ink/70 hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={() => onSend(draft)}
          disabled={!draft.trim()}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            reject
              ? "bg-red-500/80 text-white hover:bg-red-500 disabled:cursor-default disabled:bg-red-500/30"
              : "bg-gold-2/25 text-gold-1 hover:bg-gold-2/35 disabled:cursor-default disabled:bg-gold-2/10 disabled:text-ink/30"
          }`}
        >
          <Send className="h-3 w-3" />
          {reject ? "Send rejection" : "Send to designer"}
        </button>
      </div>
    </div>
  );
}

/* ─── notification card ─────────────────────────────────────────────────── */

function NotifCard({
  notif,
  status,
  character,
  onAccept,
  onSendFeedback,
}: {
  notif: DesignShareNotif;
  status: AssetValidationStatus;
  character: Character | null;
  onAccept: (notif: DesignShareNotif) => void;
  onSendFeedback: (notif: DesignShareNotif, kind: DesignFeedbackKind, message: string) => void;
}) {
  const [panel, setPanel] = useState<DesignFeedbackKind | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [unread, setUnread] = useState(0);
  const decided = status !== "pending";

  // Unread replies from the designer on THIS asset.
  useEffect(
    () =>
      subscribeUnreadChat("writer", ({ assetIds }) =>
        setUnread(assetIds.includes(notif.assetId) ? 1 : 0),
      ),
    [notif.assetId],
  );

  // The Conversations feed above can ask us to open a specific thread.
  useEffect(() => {
    function onOpen(e: Event) {
      const { assetId } = (e as CustomEvent<{ assetId: string }>).detail ?? {};
      if (assetId === notif.assetId) setShowChat(true);
    }
    window.addEventListener("resonance:open-asset-chat", onOpen);
    return () => window.removeEventListener("resonance:open-asset-chat", onOpen);
  }, [notif.assetId]);

  // Opening the thread clears its unread marker.
  useEffect(() => {
    if (showChat) markAssetChatSeen(notif.assetId, "writer");
  }, [showChat, notif.assetId]);

  return (
    <div
      id={`design-share-${notif.assetId}`}
      className={`group relative flex gap-4 rounded-xl border p-4 transition-colors ${
        unread > 0
          ? "border-gold-2/60 bg-gold-2/10"
          : decided
          ? "border-violet-3/15 bg-bg-1/60"
          : "border-gold-2/25 bg-gold-2/5"
      }`}
    >
      {unread > 0 && (
        <span
          title="Unread reply from the designer"
          className="absolute -left-1 -top-1 flex items-center gap-1 rounded-full bg-gold-2 px-2 py-0.5 text-[10px] font-medium text-bg-0"
        >
          New reply
        </span>
      )}
      {/* Thumbnail */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-violet-3/20 bg-bg-0">
        {notif.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={notif.previewUrl}
            alt={notif.assetName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-6 w-6 text-violet-3/40" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-ink">
              New design ready for review
            </p>
            <p className="mt-0.5 font-display text-sm text-ink/70">
              {notif.assetName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!decided && <span className="h-2 w-2 rounded-full bg-gold-2" />}
            <span className="whitespace-nowrap text-xs text-ink/35">
              {timeAgo(new Date(notif.createdAt))}
            </span>
          </div>
        </div>

        {/* Character / scene context — shows the resolved character name */}
        {(character || notif.characterId || notif.sceneId) && (
          <p className="mt-1 text-xs text-ink/45">
            {[character?.name ?? notif.characterId, notif.sceneId].filter(Boolean).join(" · ")}
          </p>
        )}

        {notif.description && (
          <p className="mt-1 line-clamp-2 text-xs text-ink/55">
            {notif.description}
          </p>
        )}

        {/* Review controls */}
        <div className="mt-3 flex flex-col gap-3">
          {decided ? (
            <DecisionBanner status={status} character={character} />
          ) : panel ? (
            <FeedbackPanel
              kind={panel}
              onSend={(message) => {
                onSendFeedback(notif, panel, message);
                setPanel(null);
              }}
              onCancel={() => setPanel(null)}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onAccept(notif)}
                className="flex items-center gap-1.5 rounded-full bg-gold-2 px-4 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-gold-1"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                Accept design
              </button>
              <button
                onClick={() => setPanel("revision")}
                className="flex items-center gap-1.5 rounded-full border border-gold-3/30 px-4 py-2 text-sm text-ink transition-colors hover:border-gold-2/60 hover:text-gold-1"
              >
                <MessageSquareText className="h-3.5 w-3.5" />
                Review &amp; request changes
              </button>
              <button
                onClick={() => setPanel("reject")}
                className="flex items-center gap-1.5 rounded-full border border-red-500/30 px-4 py-2 text-sm text-red-400/90 transition-colors hover:border-red-500/60 hover:bg-red-500/5"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject design
              </button>
            </div>
          )}

          {/* Conversation — available before and after a decision so the writer
              and designer can keep discussing this specific design. */}
          <div>
            <button
              onClick={() => setShowChat((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-ink/50 transition-colors hover:text-gold-1"
            >
              <MessagesSquare className="h-3.5 w-3.5" />
              {showChat ? "Hide conversation" : "Conversation with designer"}
            </button>
            {showChat && (
              <div className="mt-2">
                <AssetChat
                  assetId={notif.assetId}
                  assetName={notif.assetName}
                  characterId={notif.characterId}
                  me="writer"
                  accent="gold"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesignShareNotifications() {
  const [notifs,    setNotifs]    = useState<DesignShareNotif[]>([]);
  const [assets,    setAssets]    = useState<AssetRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAll,   setShowAll]   = useState(false);

  const { allCharacters, updateCharacter } = useCharacters();
  const { showToast } = useToast();

  useEffect(() => {
    const unsub = subscribeDesignShareNotifs(
      (n) => setNotifs(n),
      (err) => setLoadError(err.message),
    );
    return unsub;
  }, []);

  useEffect(() => subscribeAssets((a) => setAssets(a)), []);

  // Current validation status for each asset, so a card shows the writer's
  // last decision even after a reload.
  const statusByAsset = new Map<string, AssetValidationStatus>();
  for (const a of assets) statusByAsset.set(a.id, a.validationStatus);

  function handleAccept(notif: DesignShareNotif) {
    const character = resolveCharacter(allCharacters, notif.characterId);

    // Connect the design to the character it was originally made for, and swap
    // the approved artwork in as the character's portrait.
    if (character) {
      const existing = character.designerSharedAssetIds ?? [];
      updateCharacter(character.id, {
        designerSharedAssetIds: existing.includes(notif.assetId)
          ? existing
          : [...existing, notif.assetId],
        ...(notif.previewUrl ? { portraitUrl: notif.previewUrl } : {}),
      });
    }

    setValidationStatus(notif.assetId, "approved").catch(console.error);
    markNotifRead(notif.id).catch(console.error);

    // Record the approval in the asset's conversation so the designer sees it.
    postAssetChatMessage(
      { id: notif.assetId, name: notif.assetName, characterId: notif.characterId },
      "writer",
      character ? `Approved — linked to ${character.name}.` : "Approved this design.",
      "approve",
    ).catch(console.error);

    showToast({
      title: character
        ? `Design accepted — linked to ${character.name}`
        : "Design accepted",
      href: character ? `/writer/characters/${character.id}` : undefined,
      actionLabel: character ? "View character" : undefined,
    });
  }

  function handleSendFeedback(
    notif: DesignShareNotif,
    kind: DesignFeedbackKind,
    message: string,
  ) {
    sendDesignFeedback(
      { id: notif.assetId, name: notif.assetName, characterId: notif.characterId },
      kind,
      message,
    ).catch(console.error);
    markNotifRead(notif.id).catch(console.error);

    showToast({
      title:
        kind === "reject"
          ? "Design rejected — designer notified"
          : "Change request sent to the designer",
    });
  }

  const openCount = notifs.filter(
    (n) => (statusByAsset.get(n.assetId) ?? "pending") === "pending",
  ).length;
  const visible = showAll ? notifs : notifs.slice(0, 5);

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        Could not load design notifications: {loadError}
      </div>
    );
  }

  if (notifs.length === 0) return null;

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenTool className="h-4 w-4 text-gold-2" />
          <h2 className="font-display text-sm uppercase tracking-widest text-ink/50">
            Design Reviews
          </h2>
          {openCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-2/20 px-1.5 text-[10px] font-medium text-gold-2">
              {openCount}
            </span>
          )}
        </div>
        {notifs.length > 5 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-ink/40 transition-colors hover:text-ink"
          >
            {showAll ? "Show less" : `Show all ${notifs.length}`}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((n) => (
          <NotifCard
            key={n.id}
            notif={n}
            status={statusByAsset.get(n.assetId) ?? "pending"}
            character={resolveCharacter(allCharacters, n.characterId)}
            onAccept={handleAccept}
            onSendFeedback={handleSendFeedback}
          />
        ))}
      </div>
    </section>
  );
}
