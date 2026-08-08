"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, LoaderCircle, MapPinned, Route, SlidersHorizontal } from "lucide-react";

import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { saveTripPlan } from "@/app/actions/trip-plans";
import { ShareTripButton } from "@/components/sections/collections/share-trip-button";
import { SaveTripToRouteCollection } from "@/components/sections/collections/save-trip-to-route-collection";
import { readJourneyPlannerDraft, writeJourneyPlannerDraft, type JourneyPlannerBudgetFilter, type JourneyPlannerFilter } from "@/lib/journey-planner-draft";
import { supabase } from "@/lib/supabase";

type PlaceOption = {
  id: string;
  slug: string;
  name: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  isPetFriendly: boolean | null;
  hasEvCharging: boolean | null;
  typicalVisitMinutes: number | null;
  entryFee: string | null;
};

type PlacePickerProps = {
  label: string;
  value: string;
  options: PlaceOption[];
  onChange: (value: string) => void;
  onSelect: (option: PlaceOption) => void;
};

const radians = (value: number) => value * Math.PI / 180;
const kilometresBetween = (a: PlaceOption, b: PlaceOption) => {
  const earthRadius = 6371;
  const latitude = radians(b.latitude - a.latitude);
  const longitude = radians(b.longitude - a.longitude);
  const h = Math.sin(latitude / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitude / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

// Equirectangular projection is accurate enough for a local planning buffer.
// It is deliberately labelled as a planning corridor, not a driving route.
const distanceToCorridorKm = (point: PlaceOption, start: PlaceOption, end: PlaceOption) => {
  const latitudeScale = 111.32;
  const longitudeScale = latitudeScale * Math.cos(radians((start.latitude + end.latitude) / 2));
  const px = (point.longitude - start.longitude) * longitudeScale;
  const py = (point.latitude - start.latitude) * latitudeScale;
  const ex = (end.longitude - start.longitude) * longitudeScale;
  const ey = (end.latitude - start.latitude) * latitudeScale;
  const lengthSquared = ex ** 2 + ey ** 2;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (px * ex + py * ey) / lengthSquared));
  return Math.hypot(px - ratio * ex, py - ratio * ey);
};

type BudgetFilter = JourneyPlannerBudgetFilter;

function budgetBand(entryFee: string | null) {
  if (!entryFee?.trim()) return "unknown" as const;
  if (/\bfree\b|₹\s*0\b|rs\.?\s*0\b/i.test(entryFee)) return "free" as const;
  const amounts = Array.from(entryFee.matchAll(/(?:₹|rs\.?\s*)\s*(\d[\d,]*)/gi), (match) => Number(match[1].replace(/,/g, ""))).filter(Number.isFinite);
  if (amounts.length === 0) return "unknown" as const;
  return Math.min(...amounts) < 200 ? "under-200" as const : "200-plus" as const;
}

function PlacePicker({ label, value, options, onChange, onSelect }: PlacePickerProps) {
  const [open, setOpen] = useState(false);
  const picker = useRef<HTMLLabelElement>(null);
  const matches = value.trim().length >= 2
    ? options.filter((option) => `${option.name} ${option.locationLabel}`.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : options.slice(0, 6);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (picker.current && !picker.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return <label ref={picker} className="relative grid gap-2 text-sm font-medium">{label}
    <span className="relative"><input value={value} onFocus={() => setOpen(true)} onChange={(event) => { setOpen(true); onChange(event.target.value); }} placeholder="Search a verified place" autoComplete="off" className="h-11 w-full rounded-lg border border-border bg-card px-3 pr-11 text-foreground outline-none focus:border-cyan-400" /><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)} aria-label={`Toggle ${label} places`} aria-expanded={open} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition hover:text-cyan-300"><ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} /></button></span>
    {open && matches.length > 0 && <div className="absolute left-0 right-0 top-[4.9rem] z-20 max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">{matches.map((option) => <button type="button" key={option.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(option); setOpen(false); }} className="block w-full px-3 py-3 text-left transition hover:bg-accent"><span className="block text-sm font-medium">{option.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{option.locationLabel}</span></button>)}</div>}
  </label>;
}

export default function PlannerPage() {
  const { requireAuth } = useAuthModal();
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [origin, setOrigin] = useState<PlaceOption | null>(null);
  const [destination, setDestination] = useState<PlaceOption | null>(null);
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [bufferKm, setBufferKm] = useState(5);
  const [filter, setFilter] = useState<JourneyPlannerFilter>("all");
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>("all");
  const [planned, setPlanned] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loadPlaces = async () => {
      const { data, error: loadError } = await (supabase as any).from("v_place_map_marker").select("id, slug, name, location_label, latitude, longitude, is_pet_friendly, has_ev_charging, typical_visit_minutes, entry_fee").order("name").limit(300);
      if (loadError) { setError("Verified places could not load. Please refresh and try again."); return; }
      const options = (data ?? []).flatMap((row: any) => {
        const latitude = Number(row.latitude); const longitude = Number(row.longitude);
        return Number.isFinite(latitude) && Number.isFinite(longitude) ? [{ id: row.id, slug: row.slug, name: row.name, locationLabel: row.location_label || "India", latitude, longitude, isPetFriendly: row.is_pet_friendly ?? null, hasEvCharging: row.has_ev_charging ?? null, typicalVisitMinutes: row.typical_visit_minutes ?? null, entryFee: row.entry_fee ?? null }] : [];
      }) as PlaceOption[];
      setPlaces(options);
      const draft = readJourneyPlannerDraft();
      const savedOrigin = draft?.originSlug ? options.find((place) => place.slug === draft.originSlug) : undefined;
      const savedDestination = draft?.destinationSlug ? options.find((place) => place.slug === draft.destinationSlug) : undefined;
      if (draft) {
        setOrigin(savedOrigin ?? null);
        setOriginText(savedOrigin?.name ?? "");
        setDestination(savedDestination ?? null);
        setDestinationText(savedDestination?.name ?? "");
        setBufferKm(draft.bufferKm);
        setFilter(draft.filter);
        setBudgetFilter(draft.budgetFilter);
        setPlanned(Boolean(draft.planned && savedOrigin && savedDestination));
        setHydrated(true);
        return;
      }
      const mumbai = options.find((place) => place.name.toLowerCase() === "mumbai");
      const lonavala = options.find((place) => place.name.toLowerCase() === "lonavala");
      if (mumbai) { setOrigin(mumbai); setOriginText(mumbai.name); }
      if (lonavala) { setDestination(lonavala); setDestinationText(lonavala.name); }
      setHydrated(true);
    };
    void loadPlaces();
  }, []);

  const candidates = useMemo(() => {
    if (!origin || !destination) return [];
    return places.filter((place) => place.id !== origin.id && place.id !== destination.id && distanceToCorridorKm(place, origin, destination) <= bufferKm).filter((place) => {
      if (filter === "pet") return place.isPetFriendly === true;
      if (filter === "ev") return place.hasEvCharging === true;
      if (filter === "quick") return place.typicalVisitMinutes !== null && place.typicalVisitMinutes <= 30;
      return true;
    }).filter((place) => budgetFilter === "all" || budgetBand(place.entryFee) === budgetFilter).sort((a, b) => distanceToCorridorKm(a, origin, destination) - distanceToCorridorKm(b, origin, destination));
  }, [bufferKm, budgetFilter, destination, filter, origin, places]);

  useEffect(() => {
    if (!hydrated) return;
    writeJourneyPlannerDraft({
      originSlug: origin?.slug ?? null,
      destinationSlug: destination?.slug ?? null,
      bufferKm,
      filter,
      budgetFilter,
      planned,
      candidateSlugs: candidates.map((place) => place.slug),
      savedAt: Date.now(),
    });
  }, [bufferKm, budgetFilter, candidates, destination?.slug, filter, hydrated, origin?.slug, planned]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!origin || !destination || origin.id === destination.id) { setError("Choose two different verified places to plan a journey."); return; }
    setError("");
    setPlanned(true);
  };
  const routeDistance = origin && destination ? kilometresBetween(origin, destination) : null;
  const save = async () => {
    if (!origin || !destination) return;
    if (!await requireAuth(save)) return;
    try {
      const tripId = await saveTripPlan({ originPlaceId: origin.id, destinationPlaceId: destination.id, bufferKm, stops: candidates.map((place) => ({ id: place.id, slug: place.slug, name: place.name })) });
      setSavedTripId(tripId);
      setSaveMessage("Journey saved to Collections.");
    } catch (saveError) { setSaveMessage(saveError instanceof Error ? saveError.message : "Unable to save this journey."); }
  };

  return <main className="min-h-screen bg-background"><Navbar /><section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8"><Link href="/journey" className="text-sm text-muted-foreground transition-colors hover:text-cyan-400">← Back to journey tools</Link><div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-10"><div className="flex items-start gap-4"><span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-400"><Route className="h-6 w-6" /></span><div><p className="text-sm font-medium text-cyan-400">Journey planner</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Plan around the places that matter</h1><p className="mt-3 max-w-3xl text-muted-foreground">Choose verified start and end points, then explore places within a local planning corridor. Driving directions and travel time will be added when a routing provider is connected.</p></div></div><form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-border bg-background/40 p-5 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end"><PlacePicker label="Starting point" value={originText} options={places} onChange={(value) => { setOriginText(value); setOrigin(null); setPlanned(false); }} onSelect={(place) => { setOrigin(place); setOriginText(place.name); setPlanned(false); }} /><ArrowRight className="hidden h-5 w-5 text-cyan-400 sm:mb-3 sm:block" /><PlacePicker label="Destination" value={destinationText} options={places} onChange={(value) => { setDestinationText(value); setDestination(null); setPlanned(false); }} onSelect={(place) => { setDestination(place); setDestinationText(place.name); setPlanned(false); }} /><button type="submit" disabled={places.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 font-medium text-slate-950 transition-colors hover:bg-cyan-300 disabled:opacity-60"><MapPinned className="h-4 w-4" />Plan journey</button></form>{places.length === 0 && !error && <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Loading verified places…</p>}{error && <p role="alert" className="mt-4 rounded-lg bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}</div>
    {planned && origin && destination && <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="rounded-2xl border border-border bg-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-cyan-300">Planning corridor</p><h2 className="mt-1 text-2xl font-bold">{origin.name} <span className="text-cyan-300">→</span> {destination.name}</h2><p className="mt-2 text-sm text-muted-foreground">Approx. {routeDistance?.toFixed(0)} km direct distance · Places are within {bufferKm} km of the corridor.</p></div><div className="flex flex-col items-end gap-2"><button type="button" onClick={() => void save()} className="rounded-lg border border-cyan-400/50 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-400/10">Save journey</button><a href={`/route/mumbai-to-lonavala?from=/planner&fromLabel=Back%20to%20Journey%20Planner`} className="text-sm text-cyan-300 hover:text-cyan-100">Open sample route →</a></div></div>{saveMessage && <p className="mt-4 rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100">{saveMessage}</p>}<div className="mt-6 flex flex-wrap items-center gap-3"><label className="flex items-center gap-3 text-sm">Buffer <input type="range" min="2" max="25" value={bufferKm} onChange={(event) => setBufferKm(Number(event.target.value))} className="accent-cyan-400" /><span className="w-12 text-cyan-200">{bufferKm} km</span></label><div className="flex flex-wrap gap-2">{([ ["all", "All"], ["pet", "Pet friendly"], ["ev", "EV charging"], ["quick", "≤ 30 min"] ] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={`rounded-full border px-3 py-1.5 text-xs transition ${filter === value ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-border text-muted-foreground hover:border-cyan-400/50"}`}>{label}</button>)}</div></div><div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-muted-foreground">Budget</span>{([ ["all", "Any"], ["free", "Free"], ["under-200", "Under ₹200"], ["200-plus", "₹200+"] ] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setBudgetFilter(value)} className={`rounded-full border px-3 py-1.5 text-xs transition ${budgetFilter === value ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-border text-muted-foreground hover:border-cyan-400/50"}`}>{label}</button>)}</div><div className="mt-6 space-y-3">{candidates.length ? candidates.map((place) => <Link href={`/place/${place.slug}?from=/planner&fromLabel=Back%20to%20Journey%20Planner`} key={place.id} className="flex items-center justify-between rounded-xl border border-border/70 p-4 transition hover:border-cyan-400/60 hover:bg-accent"><span><span className="block font-medium">{place.name}</span><span className="mt-1 block text-sm text-muted-foreground">{place.locationLabel} · {distanceToCorridorKm(place, origin, destination).toFixed(1)} km from corridor{place.entryFee ? ` · ${place.entryFee}` : ""}</span></span><ArrowRight className="h-4 w-4 text-cyan-300" /></Link>) : <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No verified stops match this corridor and filter. Increase the buffer or choose another facility or budget filter.</div>}</div></div><aside className="rounded-2xl border border-border bg-card p-6"><SlidersHorizontal className="h-5 w-5 text-cyan-300" /><h2 className="mt-4 font-semibold">How this works</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">This is a straight-line planning corridor, calculated from verified coordinates. It helps discover relevant places before a road-routing service is connected.</p><p className="mt-4 text-xs leading-5 text-slate-500">It does not claim road distance, traffic, tolls, or on-route driving directions.</p></aside></section>}
    {savedTripId && origin && destination && <div className="mt-5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4"><p className="text-sm font-medium text-cyan-100">Journey saved — ready to share</p><p className="mt-1 text-xs text-muted-foreground">Send this itinerary by WhatsApp, social apps, or a copied link.</p><ShareTripButton tripId={savedTripId} title={`${origin.name} to ${destination.name}`} /><SaveTripToRouteCollection tripPlanId={savedTripId} /></div>}
  </section><Footer /></main>;
}
