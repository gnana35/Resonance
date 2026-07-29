"use client";

import { useEffect, useRef } from "react";
import { CharactersProvider } from "@/context/CharactersContext";
import { WorldProvider } from "@/context/WorldContext";
import { ToastProvider } from "@/components/Toast";

/**
 * Reads the active project id from localStorage and passes it into the
 * CharactersProvider and WorldProvider so all data is always scoped to the
 * current project.
 *
 * Also subscribes to storage events so switching projects in the writer tab
 * automatically refreshes the characters list.
 */
export function CharactersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read active project synchronously on mount (client only)
  const activeProjectId =
    typeof window !== "undefined"
      ? (localStorage.getItem("resonance:activeProject") ?? undefined)
      : undefined;

  return (
    <CharactersProvider activeProjectId={activeProjectId}>
      <WorldProvider activeProjectId={activeProjectId}>
        <ToastProvider>
          <AutoscanBridge />
          {children}
        </ToastProvider>
      </WorldProvider>
    </CharactersProvider>
  );
}

/**
 * Listens for chapter saves (via a custom storage event fired by the writer
 * page) and debounces a re-scan so the character list and world stay up to
 * date without the writer having to manually refresh.
 */
function AutoscanBridge() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      // The writer page writes "resonance:chapters" on every chapter save.
      if (e.key !== "resonance:chapters" && e.key !== "resonance:activeProject") return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // Fire a custom event that the Characters and World pages listen for
        window.dispatchEvent(new CustomEvent("resonance:chaptersUpdated"));
      }, 1500);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
