"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPinned, Search, ShieldAlert } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";

type Place = { id: string; name: string; slug: string; city: string | null; google_place_id: string | null };
type Match = { id: string; name: string; address: string; latitude: number; longitude: number };

export default function GoogleMatchesPage() {
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState<boolean | null>(null); const [places, setPlaces] = useState<Place[]>([]); const [selected, setSelected] = useState<Place | null>(null); const [matches, setMatches] = useState<Match[]>([]); const [message, setMessage] = useState(""); const [query, setQuery] = useState(""); const [loading, setLoading] = useState(false);
  const load = async () => { const { data: role } = await supabase.from("curator_roles").select("role").maybeSingle(); const ok = role?.role === "admin"; setAllowed(ok); if (!ok) return; const { data, error } = await supabase.from("places").select("id,name,slug,city,google_place_id").eq("is_external", false).eq("is_published", true).order("name").limit(500); if (error) setMessage(error.message); else setPlaces((data ?? []) as Place[]); };
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
      if (!response.ok) { setMessage(result.error ?? "Could not search Google Maps."); return; }
      if (result.unavailableReason === "not_configured") { setMessage("Google Places is not configured on this deployment yet."); return; }
      if (result.unavailableReason === "quota_exhausted") { setMessage("Google Places has temporarily reached its request quota. Try again later."); return; }
      if (result.unavailableReason) { setMessage("Google Maps search is temporarily unavailable. Please try again."); return; }
      const nextMatches = result.places ?? [];
      setMatches(nextMatches);
      if (!nextMatches.length) setMessage("No Google Maps match found. Try adding the city or a more specific name.");
    } catch { setMessage("Could not reach Google Maps. Check your connection and try again."); }
    finally { setLoading(false); }
  };
  const link = async (match: Match) => { if (!selected) return; const { error } = await supabase.from("places").update({ google_place_id: match.id }).eq("id", selected.id); if (error) { setMessage(error.message); return; } setMessage(`Linked ${selected.name} to ${match.name}.`); setSelected({ ...selected, google_place_id: match.id }); await load(); };
  if (allowed === false) return <main className="min-h-screen bg-background"><Navbar /><section className="p-20 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-amber-400" /><h1 className="mt-4 text-3xl font-bold">Admin access required</h1></section><Footer /></main>;
  const visible = places.filter((place) => !place.google_place_id);
  return <main className="min-h-screen bg-background text-foreground"><Navbar /><section className="mx-auto max-w-6xl px-4 py-10"><p className="text-sm font-medium text-cyan-400">Admin workspace</p><h1 className="mt-1 text-4xl font-bold">Canonical Google matches</h1><p className="mt-2 max-w-2xl text-muted-foreground">Link each published TravelAdvisor location to its exact Google Place ID. This enables trustworthy live facts and photos without changing the public URL.</p>{message && <p className="mt-5 rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</p>}<div className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">Needs a Google match</h2><div className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto">{visible.map((place) => <button type="button" key={place.id} onClick={() => { setSelected(place); setQuery(place.name); setMatches([]); }} className={`block w-full rounded-lg border px-3 py-3 text-left text-sm ${selected?.id === place.id ? "border-cyan-400 bg-cyan-400/10" : "border-border hover:bg-accent"}`}><span className="block font-medium">{place.name}</span><span className="text-xs text-muted-foreground">{place.city ?? "No city assigned"}</span></button>)}{!visible.length && <p className="text-sm text-muted-foreground">Every published curated location is linked.</p>}</div></section><section className="rounded-2xl border border-border bg-card p-5">{selected ? <><div className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-cyan-300" /><div><h2 className="font-semibold">Match {selected.name}</h2><p className="text-sm text-muted-foreground">Search, then select the exact address.</p></div></div><div className="mt-5 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2" /><button type="button" disabled={loading} onClick={() => void search()} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"><Search className="h-4 w-4" />{loading ? "Searching…" : "Search"}</button></div><div className="mt-4 space-y-2">{matches.map((match) => <button type="button" key={match.id} onClick={() => void link(match)} className="block w-full rounded-xl border border-border p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-400/5"><span className="block font-medium">{match.name}</span><span className="mt-1 block text-sm text-muted-foreground">{match.address}</span><span className="mt-2 block text-xs text-cyan-400">Use this exact Google place →</span></button>)}</div></> : <div className="grid min-h-64 place-items-center text-center text-muted-foreground"><p>Select a TravelAdvisor location to find its Google Maps match.</p></div>}</section></div><Link href="/admin/data-quality" className="mt-8 inline-block text-sm text-cyan-400 hover:underline">← Catalogue integrity</Link></section><Footer /></main>;
}
