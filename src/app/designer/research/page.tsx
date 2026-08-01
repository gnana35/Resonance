"use client";

import { useState } from "react";
import { ResearchProvider } from "@/context/ResearchContext";
import { ResearchAgentPage } from "@/components/ResearchAgentPage";

function getActiveProject() {
  try {
    return localStorage.getItem("resonance:activeProject") ?? "default";
  } catch {
    return "default";
  }
}

export default function DesignerResearch() {
  const [projectId] = useState<string>(getActiveProject);

  return (
    <ResearchProvider projectId={projectId}>
      <ResearchAgentPage accentClass="violet" projectId={projectId} />
    </ResearchProvider>
  );
}
