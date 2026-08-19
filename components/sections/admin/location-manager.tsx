"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Search, ShieldAlert } from "lucide-react";

import Navbar from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { supabase } from "@/lib/supabase";

type Place = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  level: string;
  is_published: boolean;
  is_external: boolean;
  external_source: string | null;
};

function PlaceRow({ place, onPublishChange }: { place: Place; onPublishChange: (place: Place) => void }) {
  const isPendingGooglePlace = !place.is_published && place.is_external && place.external_source === "google";
  return (
    <article className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0">
        <Link href={`/admin/locations/${place.slug}`} className="font-semibold hover:text-cyan-400 hover:underline">{place.name}</Link>
        <p className="mt-1 text-xs text-muted-foreground">{place.city ?? place.level}{isPendingGooglePlace ? " · AI-discovered Google place" : ""}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href={`/admin/locations/${place.slug}`} className="rounded-lg border border-cyan-400/40 px-3 py-2 text-sm font-medium text-cyan-400 hover:bg-cyan-400/10">Edit details</Link>
        <button onClick={() => onPublishChange(place)} className={`rounded-lg px-3 py-2 text-sm font-medium ${place.is_published ? "bg-amber-400/15 text-amber-700 dark:text-amber-200" : "bg-emerald-400/15 text-emerald-700 dark:text-emerald-200"}`}>{place.is_published ? "Unpublish" : "Publish"}</button>
      </div>
    </article>
  );
}

export function LocationManager() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    const { data: role } = await supabase.from("curator_roles").select("role").maybeSingle();
    const allowed = role?.role === "admin";
    setAdmin(allowed);
    if (!allowed) return;
    const { data, error } = await supabase.from("places").select("id,name,slug,city,level,is_published,is_external,external_source").order("name").limit(1_000);
    if (error) setMessage(error.message);
    else setPlaces((data ?? []) as Place[]);
  };
  useEffect(() => { void load(); }, []);

  const changePublication = async (place: Place) => {
    setMessage("");
    // Publishing an AI-discovered Google record promotes it into the regular
    // TravelAdvisor catalogue. Its Google source remains recorded separately.
    const payload = place.is_published
      ? { is_published: false }
      : { is_published: true, is_external: false };
    const { error } = await supabase.from("places").update(payload).eq("id", place.id);
    if (error) setMessage(error.message);
    else await load();
  };

  const { unpublished, published } = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matching = places.filter((place) => !normalized || `${place.name} ${place.city ?? ""} ${place.level}`.toLowerCase().includes(normalized));
    return {
      unpublished: matching.filter((place) => !place.is_published),
      published: matching.filter((place) => place.is_published),
    };
  }, [places, query]);

  if (admin === false) return <main className="min-h-screen bg-background text-foreground"><Navbar /><section className="mx-auto max-w-3xl px-4 py-20 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-amber-400" /><h1 className="mt-4 text-3xl font-bold">Admin access required</h1></section><Footer /></main>;

  return <main className="min-h-screen bg-background text-foreground"><Navbar /><section className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-cyan-400">Admin workspace</p><h1 className="mt-1 text-4xl font-bold">Location management</h1><p className="mt-2 max-w-2xl text-muted-foreground">Review AI-discovered and drafted places first, then publish approved locations to public search and cards without deleting their saved data or discussions.</p></div><button aria-label="Refresh locations" onClick={() => void load()} className="rounded-lg border border-border p-3 text-cyan-400"><RefreshCw className="h-4 w-4" /></button></div><label className="relative mt-7 block"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search published and unpublished locations..." className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4" /></label>{message && <p className="mt-4 text-sm text-red-400">{message}</p>}<section id="unpublished" className="mt-8 scroll-mt-24"><div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-500" /><h2 className="text-2xl font-bold">Unpublished places</h2><span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-200">{unpublished.length}</span></div><p className="mt-1 text-sm text-muted-foreground">AI-discovered and other pending records stay here until you check the details and publish them.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{unpublished.map((place) => <PlaceRow key={place.id} place={place} onPublishChange={changePublication} />)}</div>{unpublished.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No unpublished locations match this search.</p>}</section><section className="mt-10 border-t border-border pt-8"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><h2 className="text-2xl font-bold">Published places</h2><span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-200">{published.length}</span></div><p className="mt-1 text-sm text-muted-foreground">Visible in TravelAdvisor search and public cards.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{published.map((place) => <PlaceRow key={place.id} place={place} onPublishChange={changePublication} />)}</div>{published.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No published locations match this search.</p>}</section></section><Footer /></main>;
}
