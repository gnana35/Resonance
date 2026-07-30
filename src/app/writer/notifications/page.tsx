"use client";

import { DiscrepancyNotificationsPage } from "@/components/DiscrepancyNotificationsPage";
import { DesignShareNotifications } from "@/components/DesignShareNotifications";

export default function WriterNotifications() {
  return (
    <div>
      {/* Design-share notifications from the designer — shown above discrepancies */}
      <div className="px-6 pt-8 md:px-10">
        <DesignShareNotifications />
      </div>

      {/* Existing consistency / discrepancy notifications */}
      <DiscrepancyNotificationsPage accentClass="gold" role="writer" />
    </div>
  );
}
