"use client";

import { DiscrepancyNotificationsPage } from "@/components/DiscrepancyNotificationsPage";
import { DesignShareNotifications } from "@/components/DesignShareNotifications";
import { ConversationNotifications } from "@/components/ConversationNotifications";

export default function WriterNotifications() {
  /**
   * Opening a conversation scrolls to that asset's card in
   * DesignShareNotifications and opens its chat, rather than navigating into
   * the designer's workspace — the writer stays where they are.
   */
  function openAsset(assetId: string) {
    const el = document.getElementById(`design-share-${assetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // DesignShareNotifications listens for this to expand the right thread.
      window.dispatchEvent(
        new CustomEvent("resonance:open-asset-chat", { detail: { assetId } }),
      );
    }
  }

  return (
    <div>
      {/* Replies and decisions from the designer, newest first. */}
      <div className="px-6 pt-8 md:px-10">
        <ConversationNotifications
          role="writer"
          accentClass="gold"
          onOpenAsset={openAsset}
        />
      </div>

      {/* Design-share notifications from the designer — shown above discrepancies */}
      <div className="px-6 pt-8 md:px-10">
        <DesignShareNotifications />
      </div>

      {/* Existing consistency / discrepancy notifications */}
      <DiscrepancyNotificationsPage accentClass="gold" role="writer" />
    </div>
  );
}
