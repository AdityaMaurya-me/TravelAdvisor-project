"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { toggleSavedRoute } from "@/app/actions/routes";
import { useAuthModal } from "@/components/auth/auth-modal-provider";

export function SaveRouteButton({ routeId }: { routeId: string }) {
  const { requireAuth } = useAuthModal();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const completeSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await toggleSavedRoute(routeId, !saved);
      setSaved((isSaved) => !isSaved);
    } catch {
      // Keep the current state when the server action cannot complete.
    }
    setSaving(false);
  };

  const save = async () => {
    if (saving) return;
    if (!await requireAuth(completeSave)) return;
    await completeSave();
  };

  return (
    <button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium transition hover:border-cyan-400/60">
      <Star className={saved ? "h-4 w-4 fill-amber-300 text-amber-300" : "h-4 w-4"} />
      {saving ? "Saving..." : saved ? "Route saved" : "Save route"}
    </button>
  );
}
