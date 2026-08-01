"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";

/**
 * Lightweight transient notifications. Uses the same visual language as the
 * cards on the Notifications page — round accent icon, gold-on-dark card — so
 * an AI result announced here reads as the same kind of event.
 */

export type Toast = {
  id: string;
  title: string;
  /** Optional link rendered as the toast's action. */
  href?: string;
  actionLabel?: string;
};

type ToastInput = Omit<Toast, "id">;

interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_MS = 8000;

let toastCounter = 0;
function nextToastId() {
  toastCounter += 1;
  return `toast-${toastCounter}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = nextToastId();
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => dismiss(id), DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-toast-in pointer-events-auto flex items-start gap-3 rounded-xl border border-gold-3/25 bg-bg-1 p-4 shadow-xl"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-2/15">
              <Sparkles className="h-4 w-4 text-gold-2" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{toast.title}</p>
              {toast.href && (
                <Link
                  href={toast.href}
                  onClick={() => dismiss(toast.id)}
                  className="mt-1 inline-block text-sm text-gold-2 transition-colors hover:text-gold-1"
                >
                  {toast.actionLabel ?? "View now"}
                </Link>
              )}
            </div>

            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-ink/30 transition-colors hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
