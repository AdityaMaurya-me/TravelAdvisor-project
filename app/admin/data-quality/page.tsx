"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ImageOff, MapPinned, RefreshCw, ShieldAlert } from "lucide-react";

import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";

type Place = {
  id: string;
  name: string;
  slug: string;
  level: string;
  parent_id: string | null;
  is_external: boolean;
  is_published: boolean;
  google_place_id: string | null;
  location: unknown | null;
  cover_image: string | null;
};

type IssueId = "image" | "google" | "map" | "structure" | "duplicates";
type Issue = {
  id: IssueId;
  title: string;
  description: string;
  icon: React.ReactNode;
  places: Place[];
};

const isGeneric = (image: string | null) => !image || /(?:placeholder|attraction-\d+|travel-hero|hero-bg)\.(?:png|jpe?g|webp)/i.test(image);

function targetFor(issue: IssueId, place: Place) {
  return issue === "google"
    ? `/admin/google-matches?place=${encodeURIComponent(place.slug)}`
    : `/admin/locations/${place.slug}`;
}

function actionLabel(issue: IssueId) {
  if (issue === "google") return "Find Google match";
  if (issue === "map") return "Review map readiness";
  if (issue === "structure") return "Assign destination";
  if (issue === "image") return "Review cover";
  return "Review record";
}

export default function DataQuality() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [message, setMessage] = useState("");
  const [queueSearch, setQueueSearch] = useState("");

  const load = async () => {
    setMessage("");
    const { data: role } = await supabase.from("curator_roles").select("role").maybeSingle();
    const allowed = role?.role === "admin";
    setAdmin(allowed);
    if (!allowed) return;

    const { data, error } = await supabase
      .from("places")
      .select("id,name,slug,level,parent_id,is_external,is_published,google_place_id,location,cover_image")
      .order("name")
      .limit(500);
    if (error) setMessage(error.message);
    else setPlaces((data ?? []) as Place[]);
  };

  useEffect(() => { void load(); }, []);

  const published = useMemo(() => places.filter((place) => place.is_published && !place.is_external), [places]);
  const issues = useMemo<Issue[]>(() => {
    const names = new Map<string, Place[]>();
    published.forEach((place) => {
      const key = place.name.trim().toLowerCase();
      names.set(key, [...(names.get(key) ?? []), place]);
    });
    return [
      { id: "google", title: "No canonical Google match", description: "Match these first before accepting live facts, ratings, or Google photos.", icon: <MapPinned className="h-5 w-5" />, places: published.filter((place) => !place.google_place_id) },
      { id: "image", title: "Unverified or missing cover images", description: "Review these before promoting their cards anywhere in the catalogue.", icon: <ImageOff className="h-5 w-5" />, places: published.filter((place) => isGeneric(place.cover_image)) },
      { id: "map", title: "Missing map coordinates", description: "These cannot participate accurately in nearby search or route planning.", icon: <AlertTriangle className="h-5 w-5" />, places: published.filter((place) => !place.location) },
      { id: "structure", title: "Missing destination context", description: "Attractions without a parent destination break contextual exploration.", icon: <AlertTriangle className="h-5 w-5" />, places: published.filter((place) => place.level !== "city" && !place.parent_id) },
      { id: "duplicates", title: "Possible duplicate records", description: "Review these before linking or publishing another version of the same place.", icon: <AlertTriangle className="h-5 w-5" />, places: [...names.values()].filter((group) => group.length > 1).flat() },
    ];
  }, [published]);

  const visibleIssues = useMemo(() => {
    const needle = queueSearch.trim().toLowerCase();
    if (!needle) return issues;
    return issues.map((issue) => ({ ...issue, places: issue.places.filter((place) => `${place.name} ${place.slug}`.toLowerCase().includes(needle)) }));
  }, [issues, queueSearch]);

  const completeCount = useMemo(() => published.filter((place) => !isGeneric(place.cover_image) && Boolean(place.google_place_id) && Boolean(place.location) && (place.level === "city" || Boolean(place.parent_id))).length, [published]);
  const priority = useMemo(() => issues.filter((issue) => issue.id !== "duplicates").map((issue) => issue.places[0] ? { issue, place: issue.places[0] } : null).find(Boolean), [issues]);

  if (admin === false) return <main className="min-h-screen bg-background"><Navbar /><section className="p-20 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-amber-400" /><h1 className="mt-4 text-3xl font-bold">Admin access required</h1></section><Footer /></main>;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-cyan-400">Admin workspace</p>
            <h1 className="mt-1 text-4xl font-bold">Catalogue integrity</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">Work through the records that still prevent reliable cards, maps, search, ratings, and destination exploration.</p>
          </div>
          <button type="button" onClick={() => void load()} className="rounded-lg border border-border p-3 text-cyan-400 transition hover:bg-cyan-400/10" aria-label="Refresh integrity queue"><RefreshCw className="h-4 w-4" /></button>
        </div>
        {message && <p className="mt-5 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{message}</p>}

        <section className="mt-8 overflow-hidden rounded-2xl border border-cyan-400/30 bg-linear-to-br from-cyan-400/10 via-card to-card p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-300">Catalogue completion sprint</p>
              <h2 className="mt-1 text-2xl font-semibold">{completeCount} of {published.length} public records are ready across all four checks.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A ready record has a reviewed cover image, exact Google match, usable coordinates, and destination context. Correcting these in order keeps the product dependable.</p>
            </div>
            {priority ? <Link href={targetFor(priority.issue.id, priority.place)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Fix next: {priority.place.name}<ArrowRight className="h-4 w-4" /></Link> : <span className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200"><CheckCircle2 className="h-4 w-4" />All records are ready</span>}
          </div>
          <div className="mt-5 grid gap-2 text-xs sm:grid-cols-4">
            {["1. Match exact Google place", "2. Verify the cover image", "3. Confirm coordinates", "4. Assign destination"].map((step) => <span key={step} className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-muted-foreground">{step}</span>)}
          </div>
        </section>

        <label className="mt-7 block max-w-xl">
          <span className="text-sm font-medium">Search integrity queues</span>
          <input value={queueSearch} onChange={(event) => setQueueSearch(event.target.value)} placeholder="Search a location by name or slug..." className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400" />
        </label>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {visibleIssues.map((issue) => <section key={issue.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3"><span className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300">{issue.icon}</span><div><h2 className="font-semibold">{issue.title}</h2><p className="mt-1 text-sm text-muted-foreground">{issue.description}</p><p className="mt-2 text-sm font-medium text-cyan-400">{issue.places.length} records</p></div></div>
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
              {issue.places.map((place) => <Link key={`${issue.id}-${place.id}`} href={targetFor(issue.id, place)} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 text-sm transition hover:border-cyan-400/50 hover:bg-cyan-400/5"><span className="min-w-0 truncate font-medium">{place.name}</span><span className="inline-flex shrink-0 items-center gap-1 text-xs text-cyan-400">{actionLabel(issue.id)}<ArrowRight className="h-3.5 w-3.5" /></span></Link>)}
              {!issue.places.length && <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">No matching records found.</p>}
            </div>
          </section>)}
        </div>
        <div className="mt-8 flex flex-wrap gap-5 text-sm"><Link href="/admin/locations" className="text-cyan-400 hover:underline">Manage locations →</Link><Link href="/admin/google-matches" className="text-cyan-400 hover:underline">Link live Google records →</Link></div>
      </section>
      <Footer />
    </main>
  );
}
