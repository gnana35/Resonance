"use client";

import { ShieldCheck } from "lucide-react";
import { ApprovalsPanel } from "@/components/ApprovalsPanel";

export default function Approvals() {
  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-1 h-5 w-5 text-violet-2" />
        <div>
          <h1 className="font-display text-2xl text-violet-1">Approvals</h1>
          <p className="mt-1 text-ink/70">
            Review and approve creative submissions. Communicate feedback
            clearly and keep the project moving.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ApprovalsPanel />
      </div>
    </div>
  );
}
