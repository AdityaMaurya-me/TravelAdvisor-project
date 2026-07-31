"use client";

import Link from "next/link";
import * as maptilersdk from "@maptiler/sdk";
import { LocateFixed, MapPin, Navigation } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { DetailMapMarker } from "@/lib/data/detail-maps";

import "@maptiler/sdk/dist/maptiler-sdk.css";

const MAPTILER_API_KEY =
  process.env.NEXT_PUBLIC_MAPTILER_API_KEY ||
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const mapStyleUrl = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(MAPTILER_API_KEY)}`
  : undefined;

type DetailMapProps = {
  markers: DetailMapMarker[];
  title: string;
  mode: "destination" | "place";
  className?: string;
  routeHref?: string;
};

function getBounds(markers: DetailMapMarker[]) {
  const longitudes = markers.map((marker) => marker.longitude);
  const latitudes = markers.map((marker) => marker.latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const paddingLongitude = Math.max((maxLongitude - minLongitude) * 0.18, 0.015);
  const paddingLatitude = Math.max((maxLatitude - minLatitude) * 0.18, 0.012);

  return {
    west: minLongitude - paddingLongitude,
    east: maxLongitude + paddingLongitude,
    south: minLatitude - paddingLatitude,
    north: maxLatitude + paddingLatitude,
  };
}

export function DetailMap({ markers, title, mode, className = "", routeHref }: DetailMapProps) {
  const element = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(markers[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const selected = markers.find((marker) => marker.id === selectedId) ?? markers[0];
  const bounds = useMemo(() => markers.length ? getBounds(markers) : null, [markers]);

  useEffect(() => {
    if (!MAPTILER_API_KEY || !element.current || markers.length === 0 || !bounds) return;

    const mapElement = element.current;
    let disposed = false;
    let map: maptilersdk.Map | undefined;
    let mapMarkers: maptilersdk.Marker[] = [];
    const loadingTimer = window.setTimeout(() => {
      if (!disposed) setError("The map is taking too long to load. Check the MapTiler key's allowed domains.");
    }, 8000);
    setIsLoading(true);
    setError(null);

    const initialiseMap = async () => {
      try {
        map = new maptilersdk.Map({
          container: mapElement,
          style: mapStyleUrl!,
          apiKey: MAPTILER_API_KEY,
          center: [(bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2],
          zoom: mode === "place" ? 15 : 10,
          logSDKVersion: false,
        });
        map.addControl(new maptilersdk.NavigationControl({ showCompass: false }), "bottom-right");
        map.on("load", () => {
          if (!map || disposed) return;
          window.clearTimeout(loadingTimer);
          setIsLoading(false);
          if (mode === "destination") {
            map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], { padding: 48, maxZoom: 13, duration: 0 });
            map.addSource("destination-explorer-area", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Polygon",
                  coordinates: [[
                    [bounds.west, bounds.south], [bounds.east, bounds.south],
                    [bounds.east, bounds.north], [bounds.west, bounds.north],
                    [bounds.west, bounds.south],
                  ]],
                },
              },
            });
            map.addLayer({ id: "destination-explorer-fill", type: "fill", source: "destination-explorer-area", paint: { "fill-color": "#22d3ee", "fill-opacity": 0.07 } });
            map.addLayer({ id: "destination-explorer-outline", type: "line", source: "destination-explorer-area", paint: { "line-color": "#67e8f9", "line-width": 2, "line-dasharray": [2, 2] } });
          }
          map.resize();
        });

        mapMarkers = markers.map((marker) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "travel-map-marker";
          button.textContent = String.fromCharCode(9679);
          button.setAttribute("aria-label", `Open ${marker.name}`);
          button.addEventListener("click", () => setSelectedId(marker.id));
          return new maptilersdk.Marker({ element: button, anchor: "bottom" })
            .setLngLat([marker.longitude, marker.latitude])
            .addTo(map!);
        });
      } catch {
        if (!disposed) {
          setIsLoading(false);
          setError("The interactive map could not start. Check your connection and MapTiler key settings, then refresh.");
        }
      }
    }

    void initialiseMap();

    return () => {
      disposed = true;
      window.clearTimeout(loadingTimer);
      mapMarkers.forEach((marker) => marker.remove());
      map?.remove();
    };
  }, [bounds, markers, mode]);

  const hasMap = Boolean(MAPTILER_API_KEY);
  return (
    <section className={`overflow-hidden rounded-2xl border border-border bg-card ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-300">{mode === "destination" ? "Destination map" : "Location map"}</p><h2 className="mt-1 text-lg font-semibold">{title}</h2></div>
        {mode === "destination" && <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100">{markers.length} places</span>}
      </div>
      <div className={`relative bg-[#09192a] ${mode === "destination" ? "h-110" : "h-64"}`}>
        {hasMap && markers.length > 0 ? <><div ref={element} className="absolute inset-0" aria-label={`${title} interactive map`} />{isLoading && !error && <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#09192a] text-sm text-slate-300">Loading map…</div>}</> : <div className="absolute inset-0 grid place-items-center p-5 text-center text-sm leading-6 text-slate-400"><LocateFixed className="mb-3 h-7 w-7 text-cyan-300" />{markers.length === 0 ? "This place does not have verified coordinates yet." : "Add NEXT_PUBLIC_MAPTILER_API_KEY to activate this map."}</div>}
        {error && <div className="absolute inset-0 grid place-items-center bg-slate-950/70 p-5 text-center text-sm text-slate-200 backdrop-blur-sm">{error}</div>}
        {mode === "destination" && markers.length > 0 && <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-cyan-300/30 bg-slate-950/80 px-3 py-2 text-xs text-cyan-100 backdrop-blur"><Navigation className="mr-1 inline h-3.5 w-3.5" />Explorer area</div>}
      </div>
      {selected && <Link href={`/route/mumbai-to-lonavala?destination=${encodeURIComponent(selected.slug)}`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-accent"><span className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><MapPin className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">Plan a route to {selected.name}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">Set this as B · {selected.locationLabel}</span></span><Navigation className="h-4 w-4 shrink-0 text-cyan-300" /></Link>}
    </section>
  );
}
