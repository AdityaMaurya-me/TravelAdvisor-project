"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ImageOff, MapPinned, RefreshCw, ShieldAlert } from "lucide-react";

import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";

type Place = { id: string; name: string; slug: string; level: string; parent_id: string | null; is_external: boolean; is_published: boolean; google_place_id: string | null; location: unknown | null; cover_image: string | null; last_verified_at: string | null };
const isGeneric = (image: string | null) => !image || /(?:placeholder|attraction-\d+|travel-hero|hero-bg)\.(?:png|jpe?g|webp)/i.test(image);

export default function DataQuality() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [message, setMessage] = useState("");
  const load = async () => {
    const { data: role } = await supabase.from("curator_roles").select("role").maybeSingle();
    const allowed = role?.role === "admin"; setAdmin(allowed); if (!allowed) return;
    const { data, error } = await supabase.from("places").select("id,name,slug,level,parent_id,is_external,is_published,google_place_id,location,cover_image,last_verified_at").order("name").limit(500);
    if (error) setMessage(error.message); else setPlaces((data ?? []) as Place[]);
  };
  useEffect(() => { void load(); }, []);
  const issues = useMemo(() => {
    const published = places.filter((place) => place.is_published && !place.is_external);
    const names = new Map<string, Place[]>();
    published.forEach((place) => names.set(place.name.trim().toLowerCase(), [...(names.get(place.name.trim().toLowerCase()) ?? []), place]));
    return [
      { id: "image", title: "Unverified or missing cover images", description: "These cards should be corrected before being promoted.", icon: <ImageOff className="h-5 w-5" />, places: published.filter((place) => isGeneric(place.cover_image)) },
      { id: "google", title: "No canonical Google match", description: "Match these to a real Google Place before accepting new photos or live facts.", icon: <MapPinned className="h-5 w-5" />, places: published.filter((place) => !place.google_place_id) },
      { id: "map", title: "Missing map coordinates", description: "These cannot participate accurately in nearby search and route planning.", icon: <AlertTriangle className="h-5 w-5" />, places: published.filter((place) => !place.location) },
      { id: "structure", title: "Missing destination", description: "Attractions without a parent destination break contextual exploration.", icon: <AlertTriangle className="h-5 w-5" />, places: published.filter((place) => place.level !== "city" && !place.parent_id) },
      { id: "duplicates", title: "Possible duplicate records", description: "Review these before linking or publishing a new version.", icon: <AlertTriangle className="h-5 w-5" />, places: [...names.values()].filter((group) => group.length > 1).flat() },
    ];
  }, [places]);
  if (admin === false) return <main className="min-h-screen bg-background"><Navbar /><section className="p-20 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-amber-400" /><h1 className="mt-4 text-3xl font-bold">Admin access required</h1></section><Footer /></main>;
  return <main className="min-h-screen bg-background text-foreground"><Navbar /><section className="mx-auto max-w-6xl px-4 py-10"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-cyan-400">Admin workspace</p><h1 className="mt-1 text-4xl font-bold">Catalogue integrity</h1><p className="mt-2 max-w-2xl text-muted-foreground">Audit existing records before they represent a destination publicly. Start with image and Google Maps match issues.</p></div><button type="button" onClick={() => void load()} className="rounded-lg border border-border p-3 text-cyan-400 hover:bg-cyan-400/10" aria-label="Refresh integrity queue"><RefreshCw className="h-4 w-4" /></button></div>{message && <p className="mt-5 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{message}</p>}<div className="mt-8 grid gap-5 lg:grid-cols-2">{issues.map((issue) => <section key={issue.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start gap-3"><span className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300">{issue.icon}</span><div><h2 className="font-semibold">{issue.title}</h2><p className="mt-1 text-sm text-muted-foreground">{issue.description}</p><p className="mt-2 text-sm font-medium text-cyan-400">{issue.places.length} records</p></div></div><div className="mt-4 max-h-64 space-y-2 overflow-y-auto">{issue.places.slice(0, 30).map((place) => <Link key={`${issue.id}-${place.id}`} href={`/admin/locations/${place.slug}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 text-sm transition hover:border-cyan-400/50 hover:bg-cyan-400/5"><span className="min-w-0 truncate font-medium">{place.name}</span><span className="shrink-0 text-xs text-cyan-400">Fix record →</span></Link>)}{issue.places.length > 30 && <p className="px-1 text-xs text-muted-foreground">Showing the first 30 of {issue.places.length} records.</p>}{!issue.places.length && <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">No issues found.</p>}</div></section>)}</div><div className="mt-8 flex flex-wrap gap-5 text-sm"><Link href="/admin/locations" className="text-cyan-400 hover:underline">Manage locations →</Link><Link href="/admin/canonical-links" className="text-cyan-400 hover:underline">Link live Google records →</Link></div></section><Footer /></main>;
}
