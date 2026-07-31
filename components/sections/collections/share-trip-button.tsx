"use client";

import { Link2, Share2 } from "lucide-react";
import { useState } from "react";

import { createShareableTripPlan } from "@/app/actions/trip-plans";

export function ShareTripButton({ tripId, title }: { tripId: string; title: string }) {
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    setSharing(true);
    try {
      const token = await createShareableTripPlan(tripId);
      const url = `${window.location.origin}/itinerary/${token}`;
      if (navigator.share) await navigator.share({ title, text: "TravelAdvisor itinerary", url });
      else await navigator.clipboard.writeText(url);
      setMessage(navigator.share ? "Share link ready." : "Share link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Unable to share this journey.");
    } finally { setSharing(false); }
  };

  const supportsNativeShare = typeof navigator !== "undefined" && Boolean(navigator.share);
  return <div className="mt-4"><button type="button" onClick={() => void share()} disabled={sharing} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-60">{supportsNativeShare ? <Share2 className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}{sharing ? "Preparing…" : "Share itinerary"}</button>{message && <p role="status" className="mt-2 text-xs text-cyan-200">{message}</p>}</div>;
}
