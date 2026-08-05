"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { ensureExternalGooglePlace } from "@/app/actions/external-places";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { supabase } from "@/lib/supabase";
import { SaveDestinationButton } from "@/components/ui/save-destination-button";

/** Makes a live Google destination behave exactly like a saved curated destination. */
export function ExternalGoogleSaveButton({ googlePlaceId }: { googlePlaceId: string }) {
  const { requireAuth } = useAuthModal();
  const [slug, setSlug] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("places").select("slug").eq("google_place_id", googlePlaceId).maybeSingle();
    setSlug(data?.slug ?? null);
    setIsPreparing(false);
  }, [googlePlaceId]);

  useEffect(() => { void load(); }, [load]);

  const prepare = async () => {
    setIsPreparing(true);
    try { setSlug((await ensureExternalGooglePlace(googlePlaceId)).slug); }
    finally { setIsPreparing(false); }
  };

  const save = async () => { if (!await requireAuth(prepare)) return; await prepare(); };
  if (slug) return <SaveDestinationButton placeSlug={slug} />;
  return <button type="button" disabled={isPreparing} onClick={() => void save()} className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background/80 px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-60"><Heart className="h-4 w-4" />{isPreparing ? "Checking saved places..." : "Save to collection"}</button>;
}
