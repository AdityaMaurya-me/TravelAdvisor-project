"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Fuel, ParkingCircle, ShieldCheck, Toilet, Zap } from "lucide-react";

import { Footer } from "@/components/layout/footer";
import Navbar from "@/components/layout/navbar";
import { UniversalBackLink } from "@/components/navigation/universal-back-link";
import { RouteExportMenu } from "@/components/sections/route/route-export-menu";
import { SaveRouteButton } from "@/components/ui/save-route-button";
import type { JourneyRoute } from "@/lib/mock-data/routes";

const utilities = [
  [Fuel, "Fuel stations"], [Toilet, "Rest areas"], [Toilet, "Washrooms"],
  [ParkingCircle, "Parking"], [Zap, "EV charging"], [ShieldCheck, "Traffic updates"],
] as const;

type JourneyRoutePageProps = { route: JourneyRoute; backHref?: string; backLabel?: string };
type StopFilter = "all" | "pet" | "ev" | "quick";

export function JourneyRoutePage({ route, backHref = "/", backLabel = "Back to search" }: JourneyRoutePageProps) {
  const [selectedUtility, setSelectedUtility] = useState<string | null>(null);
  const [stopFilter, setStopFilter] = useState<StopFilter>("all");
  const visibleStops = useMemo(() => route.stops.filter((stop) => {
    if (stopFilter === "pet") return stop.isPetFriendly === true;
    if (stopFilter === "ev") return stop.hasEvCharging === true;
    if (stopFilter === "quick") return stop.typicalVisitMinutes !== null && stop.typicalVisitMinutes <= 30;
    return true;
  }), [route.stops, stopFilter]);

  return <main className="min-h-screen bg-[#07111e] text-white">
    <Navbar />
    <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10">
      <UniversalBackLink fallbackHref={backHref} fallbackLabel={backLabel} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-200" />
      <header className="mt-5 flex flex-wrap items-start justify-between gap-5">
        <div><p className="text-sm font-medium text-cyan-300">Route / Journey</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-5xl">{route.startName} <span className="text-cyan-300">→</span> {route.endName}</h1><p className="mt-2 text-sm text-slate-400">{route.distance} · {route.duration} (without stops)</p></div>
        <div className="flex flex-wrap items-center justify-end gap-3"><RouteExportMenu route={route} /><SaveRouteButton routeId={route.id} /></div>
      </header>
      <div className="mt-5 flex flex-wrap gap-2">{["Scenic", "Family friendly", "Food stops", "Weekend trip"].map((tag) => <span key={tag} className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-200">{tag}</span>)}</div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <section className="relative min-h-105 overflow-hidden rounded-2xl border border-slate-700 bg-[#10243a]"><Image src="/hero-bg.jpg" alt={`Map preview from ${route.startName} to ${route.endName}`} fill className="object-cover opacity-35 saturate-50" /><div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(5,20,35,.35),rgba(9,45,61,.75))]" /><svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 h-full w-full"><path d="M14 18 C 20 30, 39 26, 42 43 S 65 48, 61 64 S 78 76, 86 86" fill="none" stroke="#22d3ee" strokeWidth="1.3" strokeDasharray="2 1" /><circle cx="14" cy="18" r="2.6" fill="#f8fafc" /><circle cx="86" cy="86" r="2.6" fill="#f8fafc" /></svg><span className="absolute left-[10%] top-[12%] rounded bg-slate-950/80 px-2 py-1 text-xs">{route.startName}</span><span className="absolute bottom-[8%] right-[8%] rounded bg-slate-950/80 px-2 py-1 text-xs">{route.endName}</span></section>
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6"><h2 className="font-semibold">Route overview</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-400">Total distance</dt><dd className="mt-1 font-medium">{route.distance}</dd></div><div><dt className="text-slate-400">Total time</dt><dd className="mt-1 font-medium">{route.duration}</dd></div><div><dt className="text-slate-400">Best time to leave</dt><dd className="mt-1 font-medium">6:00 AM – 8:00 AM</dd></div><div><dt className="text-slate-400">Toll charges</dt><dd className="mt-1 font-medium">₹160 (one way)</dd></div><div><dt className="text-slate-400">Best route</dt><dd className="mt-1 font-medium">Western Express Highway & Mumbai–Pune Expressway</dd></div></dl></aside>
      </div>

      <section className="mt-10"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Stops along the way</h2><p className="mt-1 text-sm text-slate-400">Choose a break using verified facilities and visit time.</p></div><span className="text-sm text-cyan-300">{visibleStops.length} of {route.stops.length} stops</span></div><div className="mt-4 flex flex-wrap gap-2" aria-label="Filter route stops">{([ ["all", "All stops"], ["pet", "Pet friendly"], ["ev", "EV charging"], ["quick", "Quick stop ≤ 30 min"] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setStopFilter(value)} className={`rounded-full border px-3 py-2 text-xs font-medium transition ${stopFilter === value ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400/50"}`}>{label}</button>)}</div>{visibleStops.length ? <div className="mt-5 grid grid-flow-col auto-cols-[10rem] gap-4 overflow-x-auto pb-2 sm:auto-cols-[12rem] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible">{visibleStops.map((stop) => <Link key={stop.slug} href={`/place/${stop.slug}?from=/route/${route.slug}&fromLabel=Back%20to%20${encodeURIComponent(route.title)}`} className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-900"><div className="relative aspect-[4/3]"><Image src={stop.image} alt="" fill className="object-cover transition group-hover:scale-105" /></div><div className="p-3"><h3 className="line-clamp-1 text-sm font-semibold">{stop.title}</h3><p className="mt-1 text-xs capitalize text-slate-400">{stop.type} · {stop.distance}</p><div className="mt-2 flex flex-wrap gap-1 text-[10px] text-cyan-100">{stop.isPetFriendly && <span className="rounded bg-cyan-400/10 px-1.5 py-0.5">Pet friendly</span>}{stop.hasEvCharging && <span className="rounded bg-cyan-400/10 px-1.5 py-0.5">EV</span>}{stop.typicalVisitMinutes !== null && <span className="rounded bg-slate-800 px-1.5 py-0.5">~{stop.typicalVisitMinutes} min</span>}</div></div></Link>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-400">No stops have verified information for this filter yet. Curators can add it from the location review form.</div>}</section>

      <section className="mt-10"><h2 className="text-xl font-bold">Plan your journey</h2><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{utilities.map(([Icon, label]) => <button type="button" key={label} onClick={() => setSelectedUtility(label)} className="flex min-h-22 flex-col items-start justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-left text-sm transition hover:border-cyan-400/60"><Icon className="h-5 w-5 text-cyan-300" />{label}</button>)}</div>{selectedUtility && <p role="status" className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">{selectedUtility} is a map-data placeholder. Live availability will appear here when a map provider is connected.</p>}</section>
    </div>
    <Footer />
  </main>;
}
