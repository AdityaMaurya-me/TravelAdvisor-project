"use client";

import * as maptilersdk from "@maptiler/sdk";
import { LocateFixed, MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import "@maptiler/sdk/dist/maptiler-sdk.css";

export type RouteMapPoint = { name: string; latitude: number; longitude: number; role: "origin" | "destination" };

type RouteDirectionsMapProps = { points: RouteMapPoint[]; geometry: [number, number][] | null; loading?: boolean; error?: string };

const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

function getBounds(points: RouteMapPoint[], geometry: [number, number][] | null) {
  const coordinates = geometry?.length ? geometry : points.map((point) => [point.longitude, point.latitude] as [number, number]);
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  return { west: Math.min(...longitudes), east: Math.max(...longitudes), south: Math.min(...latitudes), north: Math.max(...latitudes) };
}

export function RouteDirectionsMap({ points, geometry, loading = false, error }: RouteDirectionsMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapInputKey = useMemo(() => JSON.stringify({ points, geometry }), [points, geometry]);
  const bounds = useMemo(() => points.length >= 2 ? getBounds(points, geometry) : null, [mapInputKey]);

  useEffect(() => {
    if (!container.current || !mapTilerKey || !bounds) return;
    let disposed = false;
    let map: maptilersdk.Map | undefined;
    let markers: maptilersdk.Marker[] = [];
    setMapError(null);

    try {
      map = new maptilersdk.Map({
        container: container.current,
        style: "streets-v2",
        apiKey: mapTilerKey,
        projection: "mercator",
        center: [(bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2],
        zoom: 9,
        logSDKVersion: false,
      });
      map.on("error", (event) => {
        const status = (event.error as { status?: number } | undefined)?.status;
        if (!disposed && (status === 401 || status === 403)) setMapError("MapTiler rejected this browser key. Check its allowed origins and deployed-domain restriction.");
      });
      map.on("load", () => {
        if (!map || disposed) return;
        if (geometry?.length) {
          map.addSource("journey-route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: geometry } } });
          map.addLayer({ id: "journey-route-shadow", type: "line", source: "journey-route", paint: { "line-color": "#07111e", "line-width": 9, "line-opacity": 0.7 } });
          map.addLayer({ id: "journey-route-line", type: "line", source: "journey-route", paint: { "line-color": "#22d3ee", "line-width": 5, "line-opacity": 0.95 } });
        }
        markers = points.map((point) => {
          const element = document.createElement("div");
          element.className = `grid h-8 w-8 place-items-center rounded-full border-2 border-white text-xs font-bold shadow-lg ${point.role === "origin" ? "bg-cyan-500 text-slate-950" : "bg-slate-950 text-cyan-100"}`;
          element.textContent = point.role === "origin" ? "A" : "B";
          return new maptilersdk.Marker({ element, anchor: "center" }).setLngLat([point.longitude, point.latitude]).addTo(map!);
        });
        map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], { padding: 64, maxZoom: 14, duration: 0 });
        map.addControl(new maptilersdk.NavigationControl({ showCompass: false }), "bottom-right");
      });
    } catch (caught) {
      if (!disposed) setMapError(caught instanceof Error ? caught.message : "The route map could not load.");
    }
    return () => { disposed = true; markers.forEach((marker) => marker.remove()); map?.remove(); };
  }, [bounds, geometry, mapInputKey, points]);

  const message = error || mapError;
  return <section className="relative min-h-105 overflow-hidden rounded-2xl border border-slate-700 bg-[#0b2034]">
    {mapTilerKey && points.length >= 2 ? <div ref={container} className="absolute inset-0" aria-label="Interactive route map" /> : <div className="absolute inset-0 grid place-items-center p-7 text-center text-sm leading-6 text-slate-300"><LocateFixed className="mb-3 h-7 w-7 text-cyan-300" />{loading ? "Calculating the fastest route…" : !mapTilerKey ? "Add NEXT_PUBLIC_MAPTILER_API_KEY to display the road map." : "Choose A and B, then calculate your road route."}</div>}
    {loading && mapTilerKey && points.length >= 2 && <div className="absolute inset-0 grid place-items-center bg-slate-950/45 text-sm text-cyan-100 backdrop-blur-sm">Updating route…</div>}
    {message && <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-amber-300/30 bg-slate-950/90 p-3 text-center text-sm text-amber-100 backdrop-blur">{message}</div>}
    {points.length === 2 && <div className="pointer-events-none absolute left-4 top-4 flex gap-2"><span className="inline-flex items-center gap-1 rounded-lg bg-slate-950/85 px-2.5 py-1.5 text-xs text-cyan-100 backdrop-blur"><MapPin className="h-3.5 w-3.5" />{points[0].name}</span><span className="rounded-lg bg-slate-950/85 px-2.5 py-1.5 text-xs text-cyan-100 backdrop-blur">→</span><span className="rounded-lg bg-slate-950/85 px-2.5 py-1.5 text-xs text-cyan-100 backdrop-blur">{points[1].name}</span></div>}
  </section>;
}
