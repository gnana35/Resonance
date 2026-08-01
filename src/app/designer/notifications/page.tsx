"use client";

import { useRouter } from "next/navigation";
import { DiscrepancyNotificationsPage } from "@/components/DiscrepancyNotificationsPage";
import { ConversationNotifications } from "@/components/ConversationNotifications";

export default function DesignerNotifications() {
  const router = useRouter();

  return (
    <div>
      {/* What the writer said or decided on the designer's assets. Previously
          this page showed consistency discrepancies only, so replies, approvals
          and rejections were invisible unless the designer happened to already
          be on the Assets page. */}
      <div className="px-6 pt-8 md:px-10">
        <ConversationNotifications
          role="designer"
          accentClass="violet"
          onOpenAsset={(assetId) => router.push(`/designer/assets?asset=${assetId}`)}
        />
      </div>

      <DiscrepancyNotificationsPage accentClass="violet" role="designer" />
    </div>
  );
}
