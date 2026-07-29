"use client";

import { TopNav } from "@/components/TopNav";
import { DesignerSidebar } from "@/components/DesignerSidebar";
import { ConsistencyProvider } from "@/context/ConsistencyContext";

function getActiveProjectId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem("resonance:activeProject") ?? undefined;
}

export default function DesignerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeProjectId = getActiveProjectId();

  return (
    <ConsistencyProvider activeProjectId={activeProjectId}>
      <div className="min-h-screen bg-bg-0">
        <TopNav />
        <div className="flex">
          <DesignerSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </ConsistencyProvider>
  );
}
