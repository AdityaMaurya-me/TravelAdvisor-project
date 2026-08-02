"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { supabase } from "@/lib/supabase";

type Place = { id: string; name: string; slug: string; city: string | null; level: string; is_published: boolean };

export function LocationManager() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    const { data: role } = await supabase.from("curator_roles").select("role").maybeSingle();
    const allowed = role?.role === "admin"; setAdmin(allowed); if (!allowed) return;
    const { data, error } = await supabase.from("places").select("id,name,slug,city,level,is_published").order("name").limit(300);
    if (error) setMessage(error.message); else setPlaces((data ?? []) as Place[]);
  };
  useEffect(() => { void load(); }, []);
  const toggle = async (place: Place) => { const { error } = await supabase.from("places").update({ is_published: !place.is_published }).eq("id", place.id); if (error) setMessage(error.message); else await load(); };
  if (admin === false) return <main className="min-h-screen bg-background text-foreground"><Navbar /><section className="mx-auto max-w-3xl px-4 py-20 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-amber-400" /><h1 className="mt-4 text-3xl font-bold">Admin access required</h1></section><Footer /></main>;
  const visible = places.filter((place) => `${place.name} ${place.city ?? ""} ${place.level}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="min-h-screen bg-background text-foreground"><Navbar /><section className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-cyan-400">Admin workspace</p><h1 className="mt-1 text-4xl font-bold">Location management</h1><p className="mt-2 text-muted-foreground">Unpublish a location to remove it from public search and cards without deleting saved data or discussions.</p></div><button onClick={() => void load()} className="rounded-lg border border-border p-3 text-cyan-400"><RefreshCw className="h-4 w-4" /></button></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search location, city, or type…" className="mt-7 w-full rounded-xl border border-border bg-card px-4 py-3" />{message && <p className="mt-4 text-sm text-red-400">{message}</p>}<div className="mt-5 grid gap-3 sm:grid-cols-2">{visible.map((place) => <article key={place.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"><div><Link href={`/place/${place.slug}`} className="font-semibold hover:text-cyan-400 hover:underline">{place.name}</Link><p className="mt-1 text-xs text-muted-foreground">{place.city ?? place.level}</p></div><div className="flex shrink-0 gap-2"><Link href={`/admin/locations/${place.slug}`} className="rounded-lg border border-cyan-400/40 px-3 py-2 text-sm font-medium text-cyan-400 hover:bg-cyan-400/10">Edit details</Link><button onClick={() => void toggle(place)} className={`rounded-lg px-3 py-2 text-sm font-medium ${place.is_published ? "bg-amber-400/15 text-amber-700 dark:text-amber-200" : "bg-emerald-400/15 text-emerald-700 dark:text-emerald-200"}`}>{place.is_published ? "Unpublish" : "Restore"}</button></div></article>)}</div></section><Footer /></main>;
}
