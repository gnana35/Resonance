"use client";

import { CharactersProvider } from "@/context/CharactersContext";
import { ToastProvider } from "@/components/Toast";

export function CharactersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CharactersProvider>
      <ToastProvider>{children}</ToastProvider>
    </CharactersProvider>
  );
}
