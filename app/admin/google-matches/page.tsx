"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPinned, RefreshCw, Search, ShieldAlert } from "lucide-react";

import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";

type Place = { id: string; name: string; slug: string; city: string | null; google_place_id: string | null };
type Match = { id: string; name: string; address: string; latitude: number; longitude: number };

export default function GoogleMatchesPage() {
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshingRatings, setRefreshingRatings] = useState(false);

  const load = async () => {
    const { data: role } = await supabase.from("curator_roles").select("role").maybeSingle();
    const ok = role?.role === "admin";
    setAllowed(ok);
    if (!ok) return;
    const { data, error } = await supabase.from("places").select("id,name,slug,city,google_place_id").eq("is_external", false).eq("is_published", true).order("name").limit(500);
    if (error) setMessage(error.message);
    else setPlaces((data ?? []) as Place[]);
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const requestedSlug = searchParams.get("place");
    if (!requestedSlug || !places.length || selected) return;
    const requested = places.find((place) => place.slug === requestedSlug && !place.google_place_id);
    if (requested) { setSelected(requested); setQuery(requested.name); }
  }, [places, searchParams, selected]);

  const search = async () => {
    const text = (query || selected?.name || "").trim();
    if (text.length < 3) { setMessage("Enter at least three characters to search Google Maps."); return; }
    setLoading(true); setMessage(""); setMatches([]);
    try {
      const response = await fetch(`/api/places/verify?q=${encodeURIComponent(text)}`);
      const result = await response.json() as { places?: Match[]; error?: string; unavailableReason?: "not_configured" | "quota_exhausted" | "provider_error" | null };
      if (!response.ok) setMessage(result.error ?? "Could not search Google Maps.");
      else if (result.unavailableReason === "not_configured") setMessage("Google Places is not configured on this deployment yet.");
      else if (result.unavailableReason === "quota_exhausted") setMessage("Google Places has temporarily reached its request quota. Try again later.");
      else if (result.unavailableReason) setMessage("Google Maps search is temporarily unavailable. Please try again.");
      else { setMatches(result.places ?? []); if (!(result.places ?? []).length) setMessage("No Google Maps match found. Try adding the city or a more specific name."); }
    } catch { setMessage("Could not reach Google Maps. Check your connection and try again."); }
    finally { setLoading(false); }
  };

  const link = async (match: Match) => {
    if (!selected) return;
    const { error } = await supabase.from("places").update({ google_place_id: match.id, google_rating: null, google_rating_count: null, google_rating_checked_at: null }).eq("id", selected.id);
    if (error) { setMessage(error.message); return; }
    setMessage(`Linked ${selected.name} to ${match.name}.`);
    setSelected({ ...selected, google_place_id: match.id });
    await load();
    try {
      const response = await fetch("/api/admin/google-ratings/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placeId: selected.id }) });
      if (response.ok) setMessage(`Linked ${selected.name} to ${match.name} and refreshed its Google rating.`);
    } catch { /* The link is already saved; a later batch refresh can populate the rating. */ }
  };

  const refreshRatings = async () => {
    setRefreshingRatings(true); setMessage("");
    try {
      const response = await fetch("/api/admin/google-ratings/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchSize: 10 }) });
      const result = await response.json() as { refreshed?: number; skipped?: number; error?: string };
      setMessage(response.ok ? `Updated Google rating snapshots for ${result.refreshed ?? 0} places${result.skipped ? `; ${result.skipped} did not return an aggregate rating.` : "."}` : result.error ?? "Could not refresh Google ratings.");
    } catch { setMessage("Could not refresh Google ratings. Check your connection and try again."); }
    finally { setRefreshingRatings(false); }
  };

  if (allowed === false) return <main className="min-h-screen bg-background"><Navbar /><section className="p-20 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-amber-400" /><h1 className="mt-4 text-3xl font-bold">Admin access required</h1></section><Footer /></main>;
  const visible = places.filter((place) => !place.google_place_id);

  return <main className="min-h-screen bg-background text-foreground"><Navbar /><section className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-8 sm:py-10">
    <p className="text-sm font-medium text-cyan-400">Admin workspace</p>
    <div className="mt-1 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><h1 className="text-3xl font-bold sm:text-4xl">Canonical Google matches</h1><button type="button" disabled={refreshingRatings} onClick={() => void refreshRatings()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/40 px-3 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/10 disabled:opacity-50 sm:w-auto sm:shrink-0"><RefreshCw className={`h-4 w-4 ${refreshingRatings ? "animate-spin" : ""}`} />{refreshingRatings ? "Refreshing…" : "Refresh 10 Google ratings"}</button></div>
    <p className="mt-2 max-w-2xl text-muted-foreground">Link each published TravelAdvisor location to its exact Google Place ID. This enables trustworthy live facts and photos without changing the public URL. Refreshing saves only Google’s aggregate rating and rating count for public cards.</p>
    {message && <p className="mt-5 rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</p>}
    <div className="mt-8 grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5"><h2 className="font-semibold">Needs a Google match</h2><div className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto pr-0.5 sm:pr-1">{visible.map((place) => <button type="button" key={place.id} onClick={() => { setSelected(place); setQuery(place.name); setMatches([]); }} className={`block w-full min-w-0 rounded-lg border px-3 py-3 text-left text-sm ${selected?.id === place.id ? "border-cyan-400 bg-cyan-400/10" : "border-border hover:bg-accent"}`}><span className="block break-words font-medium">{place.name}</span><span className="block break-words text-xs text-muted-foreground">{place.city ?? "No city assigned"}</span></button>)}{!visible.length && <p className="text-sm text-muted-foreground">Every published curated location is linked.</p>}</div></section>
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5">{selected ? <><div className="flex min-w-0 items-center gap-2"><MapPinned className="h-5 w-5 shrink-0 text-cyan-300" /><div className="min-w-0"><h2 className="break-words font-semibold">Match {selected.name}</h2><p className="text-sm text-muted-foreground">Search, then select the exact address.</p></div></div><div className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} className="min-w-0 w-full flex-1 rounded-lg border border-border bg-background px-3 py-2" /><button type="button" disabled={loading} onClick={() => void search()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50 sm:w-auto sm:shrink-0"><Search className="h-4 w-4" />{loading ? "Searching…" : "Search"}</button></div><div className="mt-4 space-y-2">{matches.map((match) => <button type="button" key={match.id} onClick={() => void link(match)} className="block w-full min-w-0 rounded-xl border border-border p-3 text-left transition hover:border-cyan-400 hover:bg-cyan-400/5 sm:p-4"><span className="block break-words font-medium">{match.name}</span><span className="mt-1 block break-words text-sm text-muted-foreground">{match.address}</span><span className="mt-2 block text-xs text-cyan-400">Use this exact Google place →</span></button>)}</div></> : <div className="grid min-h-52 place-items-center p-4 text-center text-muted-foreground sm:min-h-64"><p>Select a TravelAdvisor location to find its Google Maps match.</p></div>}</section>
    </div>
    <Link href="/admin/data-quality" className="mt-8 inline-block text-sm text-cyan-400 hover:underline">← Catalogue integrity</Link>
  </section><Footer /></main>;
}
