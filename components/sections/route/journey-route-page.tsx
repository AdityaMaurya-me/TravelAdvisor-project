"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bike, Car, ChevronDown, Footprints, Fuel, LoaderCircle, LocateFixed, ParkingCircle, ShieldCheck, Toilet, Zap } from "lucide-react";

import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { RouteDirectionsMap } from "@/components/maps/route-directions-map";
import { UniversalBackLink } from "@/components/navigation/universal-back-link";
import { RouteExportMenu } from "@/components/sections/route/route-export-menu";
import { SaveRouteButton } from "@/components/ui/save-route-button";
import type { JourneyRoute, RoutePlaceOption } from "@/lib/mock-data/routes";

const utilities = [[Fuel, "Fuel stations"], [Toilet, "Rest areas"], [Toilet, "Washrooms"], [ParkingCircle, "Parking"], [Zap, "EV charging"], [ShieldCheck, "Traffic updates"]] as const;
const profiles = [{ value: "driving-car", label: "Car", Icon: Car }, { value: "cycling-regular", label: "Bike", Icon: Bike }, { value: "foot-walking", label: "Walk", Icon: Footprints }] as const;
type Profile = typeof profiles[number]["value"];
type StopFilter = "all" | "pet" | "ev" | "quick";
type Directions = { provider: string; distanceMeters: number; durationSeconds: number; geometry: [number, number][]; steps: { instruction: string; distanceMeters: number; durationSeconds: number }[] };
type JourneyRoutePageProps = { route: JourneyRoute; places: RoutePlaceOption[]; initialOriginSlug?: string; initialDestinationSlug?: string; backHref?: string; backLabel?: string };

function PlacePicker({ label, value, options, onChange, onSelect }: { label: string; value: string; options: RoutePlaceOption[]; onChange: (value: string) => void; onSelect: (place: RoutePlaceOption) => void }) {
  const [open, setOpen] = useState(false);
  const element = useRef<HTMLLabelElement>(null);
  const matches = value.trim().length >= 2
    ? options.filter((place) => `${place.name} ${place.locationLabel}`.toLowerCase().includes(value.toLowerCase())).slice(0, 7)
    : options.slice(0, 8);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (element.current && !element.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return <label ref={element} className="relative grid gap-2 text-sm font-medium text-slate-200">{label}<span className="relative"><input value={value} onFocus={() => setOpen(true)} onChange={(event) => { setOpen(true); onChange(event.target.value); }} placeholder="Search a verified place" autoComplete="off" className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 pr-11 text-white outline-none transition focus:border-cyan-400" /><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)} aria-label={`Toggle ${label} places`} aria-expanded={open} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 transition hover:text-cyan-200"><ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} /></button></span>{open && matches.length > 0 && <div className="absolute left-0 right-0 top-[4.7rem] z-30 max-h-72 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">{matches.map((place) => <button type="button" key={place.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(place); setOpen(false); }} className="block w-full px-3 py-3 text-left transition hover:bg-slate-800"><span className="block text-sm font-medium">{place.name}</span><span className="mt-0.5 block text-xs text-slate-400">{place.locationLabel}</span></button>)}</div>}</label>;
}

function formatDistance(meters: number) { return meters >= 1000 ? `${(meters / 1000).toFixed(meters >= 100000 ? 0 : 1)} km` : `${Math.round(meters)} m`; }
function formatDuration(seconds: number) { const minutes = Math.round(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim() : `${minutes} min`; }

export function JourneyRoutePage({ route, places, initialOriginSlug, initialDestinationSlug, backHref = "/", backLabel = "Back to search" }: JourneyRoutePageProps) {
  const defaultOrigin = places.find((place) => place.slug === initialOriginSlug) ?? null;
  const defaultDestination = places.find((place) => place.slug === initialDestinationSlug) ?? null;
  const [origin, setOrigin] = useState<RoutePlaceOption | null>(defaultOrigin);
  const [destination, setDestination] = useState<RoutePlaceOption | null>(defaultDestination);
  const [originText, setOriginText] = useState(defaultOrigin?.name ?? "");
  const [destinationText, setDestinationText] = useState(defaultDestination?.name ?? "");
  const [profile, setProfile] = useState<Profile>("driving-car");
  const [directions, setDirections] = useState<Directions | null>(null);
  const [routeError, setRouteError] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState<string | null>(null);
  const [stopFilter, setStopFilter] = useState<StopFilter>("all");
  const visibleStops = useMemo(() => route.stops.filter((stop) => stopFilter === "pet" ? stop.isPetFriendly === true : stopFilter === "ev" ? stop.hasEvCharging === true : stopFilter === "quick" ? stop.typicalVisitMinutes !== null && stop.typicalVisitMinutes <= 30 : true), [route.stops, stopFilter]);
  const mapPoints = origin && destination ? [{ name: origin.name, latitude: origin.latitude, longitude: origin.longitude, role: "origin" as const }, { name: destination.name, latitude: destination.latitude, longitude: destination.longitude, role: "destination" as const }] : [];

  const calculate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!origin || !destination || origin.id === destination.id) { setRouteError("Choose two different verified places for A and B."); return; }
    setIsCalculating(true); setRouteError(""); setDirections(null);
    try {
      const response = await fetch("/api/directions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin, destination, profile }) });
      const result = await response.json() as Directions & { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to calculate this route.");
      setDirections(result);
    } catch (caught) { setRouteError(caught instanceof Error ? caught.message : "Unable to calculate this route."); }
    finally { setIsCalculating(false); }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setLocationError("This browser does not support location access. Search for a verified starting point instead."); return; }
    setIsLocating(true); setLocationError("");
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      const currentLocation: RoutePlaceOption = { id: `current-${latitude.toFixed(6)}-${longitude.toFixed(6)}`, slug: "current-location", name: "Current location", locationLabel: "Device GPS", latitude, longitude };
      setOrigin(currentLocation); setOriginText("Current location"); setDirections(null); setRouteError(""); setIsLocating(false);
    }, (error) => {
      setIsLocating(false);
      setLocationError(error.code === error.PERMISSION_DENIED ? "Location permission was denied. Allow location access in your browser, or choose a starting place from the list." : "Your current location could not be determined. Check GPS/network access and try again.");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  };

  const shownDistance = directions ? formatDistance(directions.distanceMeters) : "—";
  const shownDuration = directions ? formatDuration(directions.durationSeconds) : "—";
  return <main className="min-h-screen bg-[#07111e] text-white"><Navbar /><div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10"><UniversalBackLink fallbackHref={backHref} fallbackLabel={backLabel} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-200" />
    <header className="mt-5 flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-medium text-cyan-300">Route / Journey</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-5xl">{origin?.name ?? "—"} <span className="text-cyan-300">→</span> {destination?.name ?? "—"}</h1><p className="mt-2 text-sm text-slate-400">{directions ? `${shownDistance} · ${shownDuration} via road route` : origin && destination ? "Ready to calculate a road route" : "Choose A and B to begin"}</p></div><div className="flex flex-wrap items-center justify-end gap-3"><RouteExportMenu route={route} /><SaveRouteButton routeId={route.id} /></div></header>
    <form onSubmit={calculate} className="mt-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start"><div className="grid gap-2"><PlacePicker label="A · Starting point" value={originText} options={places} onChange={(value) => { setOriginText(value); setOrigin(null); setDirections(null); }} onSelect={(place) => { setOrigin(place); setOriginText(place.name); setDirections(null); }} /><button type="button" onClick={useCurrentLocation} disabled={isLocating} className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-cyan-300 transition hover:text-cyan-100 disabled:opacity-60"><LocateFixed className={`h-3.5 w-3.5 ${isLocating ? "animate-pulse" : ""}`} />{isLocating ? "Getting your location…" : "Use my current location"}</button>{locationError && <p className="text-xs text-amber-200">{locationError}</p>}</div><PlacePicker label="B · Destination" value={destinationText} options={places} onChange={(value) => { setDestinationText(value); setDestination(null); setDirections(null); }} onSelect={(place) => { setDestination(place); setDestinationText(place.name); setDirections(null); }} /><button type="submit" disabled={isCalculating || !origin || !destination} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 lg:mt-7">{isCalculating && <LoaderCircle className="h-4 w-4 animate-spin" />}{isCalculating ? "Finding route" : "Find fastest route"}</button><div className="flex flex-wrap gap-2 lg:col-span-3">{profiles.map(({ value, label, Icon }) => <button key={value} type="button" onClick={() => { setProfile(value); setDirections(null); }} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${profile === value ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-400/60"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div></form>
    <p className="mt-3 text-xs text-slate-500">Google Maps Routes is preferred when configured and can use traffic-aware driving estimates. OpenRouteService remains the fallback provider.</p>
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]"><RouteDirectionsMap points={mapPoints} geometry={directions?.geometry ?? null} loading={isCalculating} error={routeError} /><aside className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6"><h2 className="font-semibold">Route overview</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-400">Total distance</dt><dd className="mt-1 font-medium">{shownDistance}</dd></div><div><dt className="text-slate-400">Total time</dt><dd className="mt-1 font-medium">{shownDuration}</dd></div><div><dt className="text-slate-400">Travel mode</dt><dd className="mt-1 font-medium">{origin && destination ? profiles.find((item) => item.value === profile)?.label : "—"}</dd></div><div><dt className="text-slate-400">Route source</dt><dd className="mt-1 font-medium">{directions?.provider ?? "—"}</dd></div></dl>{directions?.steps.length ? <ol className="mt-6 max-h-52 space-y-2 overflow-y-auto border-t border-slate-800 pt-4 text-xs text-slate-300">{directions.steps.slice(0, 8).map((step, index) => <li key={`${step.instruction}-${index}`}><span className="text-cyan-300">{index + 1}.</span> {step.instruction} <span className="text-slate-500">· {formatDistance(step.distanceMeters)}</span></li>)}</ol> : null}</aside></div>
    <section className="mt-10"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Stops along the way</h2><p className="mt-1 text-sm text-slate-400">Choose a break using verified facilities and visit time.</p></div><span className="text-sm text-cyan-300">{visibleStops.length} of {route.stops.length} stops</span></div><div className="mt-4 flex flex-wrap gap-2" aria-label="Filter route stops">{([ ["all", "All stops"], ["pet", "Pet friendly"], ["ev", "EV charging"], ["quick", "Quick stop ≤ 30 min"] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setStopFilter(value)} className={`rounded-full border px-3 py-2 text-xs font-medium transition ${stopFilter === value ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400/50"}`}>{label}</button>)}</div>{visibleStops.length ? <div className="mt-5 grid grid-flow-col auto-cols-[10rem] gap-4 overflow-x-auto pb-2 sm:auto-cols-[12rem] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible">{visibleStops.map((stop) => <Link key={stop.slug} href={`/place/${stop.slug}?from=/route/${route.slug}&fromLabel=Back%20to%20${encodeURIComponent(route.title)}`} className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-900"><div className="relative aspect-[4/3]"><Image src={stop.image} alt="" fill className="object-cover transition group-hover:scale-105" /></div><div className="p-3"><h3 className="line-clamp-1 text-sm font-semibold">{stop.title}</h3><p className="mt-1 text-xs capitalize text-slate-400">{stop.type} · {stop.distance}</p><div className="mt-2 flex flex-wrap gap-1 text-[10px] text-cyan-100">{stop.isPetFriendly && <span className="rounded bg-cyan-400/10 px-1.5 py-0.5">Pet friendly</span>}{stop.hasEvCharging && <span className="rounded bg-cyan-400/10 px-1.5 py-0.5">EV</span>}{stop.typicalVisitMinutes !== null && <span className="rounded bg-slate-800 px-1.5 py-0.5">~{stop.typicalVisitMinutes} min</span>}</div></div></Link>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-400">No stops have verified information for this filter yet.</div>}</section>
    <section className="mt-10"><h2 className="text-xl font-bold">Plan your journey</h2><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{utilities.map(([Icon, label]) => <button type="button" key={label} onClick={() => setSelectedUtility(label)} className="flex min-h-22 flex-col items-start justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-left text-sm transition hover:border-cyan-400/60"><Icon className="h-5 w-5 text-cyan-300" />{label}</button>)}</div>{selectedUtility && <p role="status" className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">{selectedUtility} availability will appear when live map data is connected.</p>}</section>
  </div><Footer /></main>;
}
