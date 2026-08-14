"use client";

import * as maptilersdk from "@maptiler/sdk";
import { LocateFixed, MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { mapTilerStyle, OPEN_STREET_MAP_FALLBACK_STYLE } from "@/lib/maps/map-style";
import { MapLoadingIndicator } from "@/components/maps/map-loading-indicator";

import "@maptiler/sdk/dist/maptiler-sdk.css";

export type RouteMapPoint = { name: string; latitude: number; longitude: number; role: "origin" | "destination" };
type RouteDirectionsMapProps = { points: RouteMapPoint[]; geometry: [number, number][] | null; loading?: boolean; error?: string };

const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

function getBounds(points: RouteMapPoint[], geometry: [number, number][] | null) {
  const coordinates = geometry?.length ? geometry : points.map((point) => [point.longitude, point.latitude] as [number, number]);
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  return { west: Math.min(...longitudes), east: Math.max(...longitudes), south: Math.min(...latitudes), north: Math.max(...latitudes) };
}

export function RouteDirectionsMap({ points, geometry, loading = false, error }: RouteDirectionsMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [usingFallback, setUsingFallback] = useState(false);
  const mapInputKey = useMemo(() => JSON.stringify({ points, geometry }), [points, geometry]);
  const bounds = useMemo(() => (points.length >= 2 ? getBounds(points, geometry) : null), [mapInputKey]);

  useEffect(() => {
    if (!container.current || !bounds) return;
    let disposed = false;
    let map: maptilersdk.Map | undefined;
    let markers: maptilersdk.Marker[] = [];
    let fallbackActive = !mapTilerKey;
    let fallbackAttempted = fallbackActive;
    let loadingTimer: number | undefined;
    setMapError(null);
    setMapStatus("loading");
    setUsingFallback(fallbackActive);

    const clearLoadingTimer = () => {
      if (loadingTimer) window.clearTimeout(loadingTimer);
    };

    const mountMap = (useFallback: boolean) => {
      if (disposed || !container.current) return;
      fallbackActive = useFallback;
      setUsingFallback(useFallback);
      markers.forEach((marker) => marker.remove());
      markers = [];
      map?.remove();
      try {
        if (mapTilerKey) maptilersdk.config.apiKey = mapTilerKey;
        map = new maptilersdk.Map({
          container: container.current,
          style: useFallback ? OPEN_STREET_MAP_FALLBACK_STYLE : mapTilerStyle(mapTilerKey!),
          center: [(bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2],
          zoom: 9,
          logSDKVersion: false,
        });
        const instance = map;
        map.addControl(new maptilersdk.NavigationControl({ showCompass: false }), "bottom-right");
        map.on("error", () => {
          if (disposed || instance !== map) return;
          if (!fallbackActive && !fallbackAttempted) {
            fallbackAttempted = true;
            mountMap(true);
            return;
          }
          clearLoadingTimer();
          setMapError("The backup map could not load. Check your connection and refresh.");
          setMapStatus("error");
        });
        map.on("load", () => {
          if (!map || disposed || instance !== map) return;
          clearLoadingTimer();
          setMapStatus("ready");
          if (geometry?.length) {
            map.addSource("journey-route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: geometry } } });
            map.addLayer({ id: "journey-route-shadow", type: "line", source: "journey-route", paint: { "line-color": "#07111e", "line-width": 9, "line-opacity": 0.7 } });
            map.addLayer({ id: "journey-route-line", type: "line", source: "journey-route", paint: { "line-color": "#0891b2", "line-width": 5, "line-opacity": 0.95 } });
          }
          markers = points.map((point) => {
            const marker = document.createElement("div");
            marker.className = `grid h-8 w-8 place-items-center rounded-full border-2 border-white text-xs font-bold shadow-lg ${point.role === "origin" ? "bg-cyan-500 text-slate-950" : "bg-slate-950 text-cyan-100"}`;
            marker.textContent = point.role === "origin" ? "A" : "B";
            return new maptilersdk.Marker({ element: marker, anchor: "center" }).setLngLat([point.longitude, point.latitude]).addTo(map!);
          });
          map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], { padding: 64, maxZoom: 14, duration: 0 });
        });
      } catch {
        if (!fallbackActive && !fallbackAttempted) {
          fallbackAttempted = true;
          mountMap(true);
        } else {
          setMapError("The backup map could not start. Check your connection and refresh.");
          setMapStatus("error");
        }
      }
    };

    loadingTimer = window.setTimeout(() => {
      if (disposed) return;
      if (!fallbackActive && !fallbackAttempted) {
        fallbackAttempted = true;
        mountMap(true);
      } else {
        setMapError("The backup map is taking too long to load. Check your connection and refresh.");
        setMapStatus("error");
      }
    }, 8000);
    mountMap(fallbackActive);

    return () => {
      disposed = true;
      clearLoadingTimer();
      markers.forEach((marker) => marker.remove());
      map?.remove();
    };
  }, [bounds, geometry, mapInputKey, points]);

  const message = error || mapError;
  return <section className="relative min-h-105 overflow-hidden rounded-2xl border border-border bg-card">
    {points.length >= 2 ? <><div ref={container} className="absolute inset-0" aria-label="Interactive route map" />{mapStatus === "loading" && !mapError && <div className="pointer-events-none absolute inset-0 grid place-items-center bg-card/85 p-7 backdrop-blur-sm"><MapLoadingIndicator label="Loading route map" /></div>}</> : <div className="absolute inset-0 grid place-items-center p-7 text-center text-sm leading-6 text-slate-300">{loading ? <MapLoadingIndicator label="Calculating the fastest route" /> : <><LocateFixed className="mb-3 h-7 w-7 text-cyan-300" />Choose A and B, then calculate your road route.</>}</div>}
    {loading && points.length >= 2 && <div className="absolute inset-0 grid place-items-center bg-card/85 p-7 backdrop-blur-sm"><MapLoadingIndicator label="Updating route" /></div>}
    {message && <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-amber-300/30 bg-slate-950/90 p-3 text-center text-sm text-amber-100 backdrop-blur">{message}</div>}
    {usingFallback && points.length >= 2 && <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg border border-border bg-background/90 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">OpenStreetMap backup</div>}
    {points.length === 2 && <div className="pointer-events-none absolute left-4 top-4 flex gap-2"><span className="inline-flex items-center gap-1 rounded-lg bg-slate-950/85 px-2.5 py-1.5 text-xs text-cyan-100 backdrop-blur"><MapPin className="h-3.5 w-3.5" />{points[0].name}</span><span className="rounded-lg bg-slate-950/85 px-2.5 py-1.5 text-xs text-cyan-100 backdrop-blur">→</span><span className="rounded-lg bg-slate-950/85 px-2.5 py-1.5 text-xs text-cyan-100 backdrop-blur">{points[1].name}</span></div>}
  </section>;
}
