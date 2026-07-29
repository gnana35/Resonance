"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * /designer/sketchpad is now merged into /designer.
 * Redirect immediately.
 */
export default function SketchpadRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/designer"); }, [router]);
  return (
    <div className="flex h-64 items-center justify-center gap-2 text-ink/40">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Redirecting…</span>
    </div>
  );
}
