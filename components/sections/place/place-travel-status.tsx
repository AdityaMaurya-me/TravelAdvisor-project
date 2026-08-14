"use client";

import { CheckCircle2, Route, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { OpenGoogleMapsButton } from "@/components/ui/open-google-maps-button";
import { supabase } from "@/lib/supabase";

type Status = "want_to_visit" | "visited" | null;

export function PlaceTravelStatus({ placeId, placeName, destinationName, googleMapsUrl }: { placeId: string; placeName: string; destinationName: string; googleMapsUrl?: string }) {
  const { requireAuth } = useAuthModal();
  const [status, setStatus] = useState<Status>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const mapsUrl = googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${placeName}, ${destinationName}`)}`;

  const load = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus(null); setIsLoading(false); return; }
    const { data } = await (supabase as any).from("user_place_status").select("status").eq("user_id", user.id).eq("place_id", placeId).maybeSingle();
    setStatus((data?.status as Status) ?? null);
    setIsLoading(false);
  };

  useEffect(() => { void load(); }, [placeId]);

  const setTravelStatus = async (nextStatus: Exclude<Status, null>) => {
    if (!await requireAuth(() => setTravelStatus(nextStatus))) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setIsSaving(true);
    const { error } = await (supabase as any).from("user_place_status").upsert({ user_id: user.id, place_id: placeId, status: nextStatus, visited_at: nextStatus === "visited" ? new Date().toISOString().slice(0, 10) : null }, { onConflict: "user_id,place_id" });
    setIsSaving(false);
    if (!error) setStatus(nextStatus);
  };

  const clearStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setIsSaving(true);
    const { error } = await (supabase as any).from("user_place_status").delete().eq("user_id", user.id).eq("place_id", placeId);
    setIsSaving(false);
    if (!error) setStatus(null);
  };


  return <section className="rounded-2xl border border-border bg-card p-5"><p className="text-sm font-medium text-cyan-300">Your travel plan</p><h2 className="mt-1 text-lg font-semibold">Plan this place</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Keep a private record of places you want to visit and places you have already explored.</p><div className="mt-4 grid gap-2"><button type="button" disabled={isSaving || isLoading} onClick={() => void setTravelStatus("want_to_visit")} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${status === "want_to_visit" ? "border-cyan-400 bg-cyan-400/15 text-cyan-100" : "border-border hover:border-cyan-400/60"}`}><Route className="h-4 w-4" />{status === "want_to_visit" ? "On your travel list" : "Want to visit"}</button><button type="button" disabled={isSaving || isLoading} onClick={() => void setTravelStatus("visited")} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${status === "visited" ? "border-emerald-400 bg-emerald-400/15 text-emerald-100" : "border-border hover:border-emerald-400/60"}`}><CheckCircle2 className="h-4 w-4" />{status === "visited" ? "Marked visited" : "Mark visited"}</button><OpenGoogleMapsButton href={mapsUrl} />{status && <button type="button" disabled={isSaving} onClick={() => void clearStatus()} className="inline-flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground hover:text-red-300"><X className="h-3.5 w-3.5" />Clear travel status</button>}</div></section>;
}
