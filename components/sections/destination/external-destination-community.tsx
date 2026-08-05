"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import { ensureExternalGooglePlace } from "@/app/actions/external-places";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { PlaceCommunityDiscussion } from "@/components/sections/place/place-community-discussion";
import { supabase } from "@/lib/supabase";

export function ExternalDestinationCommunity({ googlePlaceId, placeName }: { googlePlaceId: string; placeName: string }) {
  const { requireAuth } = useAuthModal();
  const [slug, setSlug] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("places").select("slug").eq("google_place_id", googlePlaceId).maybeSingle();
    setSlug(data?.slug ?? null);
    setIsPreparing(false);
  }, [googlePlaceId]);

  useEffect(() => { void load(); }, [load]);

  const enable = async () => {
    setIsPreparing(true);
    try { setSlug((await ensureExternalGooglePlace(googlePlaceId)).slug); }
    finally { setIsPreparing(false); }
  };

  const startDiscussion = async () => { if (!await requireAuth(enable)) return; await enable(); };
  if (slug) return <PlaceCommunityDiscussion placeSlug={slug} placeName={placeName} />;
  return <section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-start gap-3"><span className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><MessageCircle className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold">Community discussion</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Start the shared discussion for {placeName}. It will remain available whenever this destination is opened.</p></div></div><button type="button" disabled={isPreparing} onClick={() => void startDiscussion()} className="mt-5 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">{isPreparing ? "Preparing discussion..." : "Sign in to write a review"}</button></section>;
}
