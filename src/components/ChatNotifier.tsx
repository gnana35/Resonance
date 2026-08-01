"use client";

/**
 * ChatNotifier
 *
 * Fires a toast when a new reply arrives on any asset conversation for this
 * persona — the writer is notified of the designer's replies and vice versa.
 * Only messages created after mount trigger a toast (existing unread is left to
 * the sidebar badge), so navigating around doesn't re-announce old messages.
 *
 * Must be rendered inside a <ToastProvider>.
 */

import { useEffect, useRef } from "react";
import { subscribeUnreadChat, type DesignChatFrom } from "@/lib/assets";
import { useToast } from "@/components/Toast";

export function ChatNotifier({ role }: { role: DesignChatFrom }) {
  const { showToast } = useToast();
  // Anything already in the thread when this mounts is "old" — don't toast it.
  const sinceRef = useRef<number>(0);

  useEffect(() => {
    // Set the cutoff inside the effect (not during render) so the immediate
    // emit below compares new messages against mount time.
    sinceRef.current = Date.now();
    return subscribeUnreadChat(role, ({ latest }) => {
      if (!latest) return;
      if (latest.createdAt <= sinceRef.current) return;
      sinceRef.current = latest.createdAt;
      showToast({
        title: `New reply on "${latest.assetName}"`,
        href: role === "writer" ? "/writer/notifications" : "/designer/assets",
        actionLabel: "Open conversation",
      });
    });
  }, [role, showToast]);

  return null;
}
