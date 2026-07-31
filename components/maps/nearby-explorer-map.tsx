"use client";

import Link from "next/link";
import * as maptilersdk from "@maptiler/sdk";
import { AlertCircle, Crosshair, LoaderCircle, MapPin, Navigation, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import "@maptiler/sdk/dist/maptiler-sdk.css";

type NearbyPlace = {
  id: string;
  slug: string;
  name: string;
  locationLabel: string;
  rating: number | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

type LocationState = "idle" | "locating" | "loading" | "ready" | "error";

const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

function readableDistance(distance: number) {
  return distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(distance < 10 ? 1 : 0)} km`;
}

export function NearbyExplorerMap() {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const markerRef = useRef<maptilersdk.Marker[]>([]);
  const [state, setState] = useState<LocationState>("idle");
  const [message, setMessage] = useState("Choose your location to find verified places near you.");
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [radius, setRadius] = useState(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = places.find((place) => place.id === selectedId) ?? places[0] ?? null;

  useEffect(() => {
    if (!origin || !element.current || !MAPTILER_API_KEY) return;

    const map = new maptilersdk.Map({
      container: element.current,
      style: maptilersdk.MapStyle.STREETS_V2.DEFAULT,
      apiKey: MAPTILER_API_KEY,
      center: [origin.longitude, origin.latitude],
      zoom: 11,
      logSDKVersion: false,
    });
    mapRef.current = map;
    map.addControl(new maptilersdk.NavigationControl({ showCompass: false }), "bottom-right");

    const currentLocation = document.createElement("span");
    currentLocation.className = "travel-map-current-location";
    currentLocation.setAttribute("aria-label", "Your current location");
    new maptilersdk.Marker({ element: currentLocation }).setLngLat([origin.longitude, origin.latitude]).addTo(map);

    return () => {
      markerRef.current.forEach((marker) => marker.remove());
      markerRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [origin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !origin) return;

    markerRef.current.forEach((marker) => marker.remove());
    markerRef.current = places.map((place) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "travel-map-marker";
      button.textContent = "•";
      button.setAttribute("aria-label", `Show ${place.name}`);
      button.addEventListener("click", () => setSelectedId(place.id));
      return new maptilersdk.Marker({ element: button, anchor: "bottom" })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
    });

    if (places.length) {
      const bounds = new maptilersdk.LngLatBounds([origin.longitude, origin.latitude], [origin.longitude, origin.latitude]);
      places.forEach((place) => bounds.extend([place.longitude, place.latitude]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 450 });
    }
  }, [origin, places]);

  const loadNearbyPlaces = async (coordinates: { latitude: number; longitude: number }, nextRadius = radius) => {
    setState("loading");
    setMessage("Finding verified places near you…");
    try {
      const response = await fetch(`/api/places/nearby?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&radius=${nextRadius}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load nearby places.");
      setOrigin(coordinates);
      setPlaces(result.places ?? []);
      setSelectedId(result.places?.[0]?.id ?? null);
      setState("ready");
      setMessage(result.places?.length ? `${result.places.length} verified places within ${result.radius} km.` : `No verified places found within ${result.radius} km yet.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to load nearby places.");
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setState("error");
      setMessage("Your browser does not support location services.");
      return;
    }
    setState("locating");
    setMessage("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => void loadNearbyPlaces({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => {
        setState("error");
        setMessage(error.code === error.PERMISSION_DENIED ? "Location permission was not granted. You can allow it and try again." : "Your location could not be determined. Please try again.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const updateRadius = (nextRadius: number) => {
    setRadius(nextRadius);
    if (origin) void loadNearbyPlaces(origin, nextRadius);
  };

  return (
    <section className="border-y border-border bg-background py-12 sm:py-16">
      <div className="mx-auto w-full max-w-360 px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-sm font-medium text-cyan-300">Explore nearby</p><h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Find places around you</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Your location is used only to find nearby verified places in this session.</p></div>
          <button type="button" onClick={useCurrentLocation} disabled={state === "locating" || state === "loading"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-70"><Crosshair className="h-4 w-4" />{state === "locating" || state === "loading" ? "Locating…" : "Use my location"}</button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-cyan-300/20 bg-card shadow-2xl shadow-cyan-950/20 lg:grid lg:grid-cols-[minmax(0,1.7fr)_22rem]">
          <div className="relative min-h-95 bg-card sm:min-h-120">
            {origin && MAPTILER_API_KEY ? <div ref={element} className="absolute inset-0" aria-label="Interactive map of places near you" /> : <div className="absolute inset-0 grid place-items-center p-8 text-center text-sm leading-6 text-slate-300"><div><MapPin className="mx-auto mb-3 h-8 w-8 text-cyan-300" />{!MAPTILER_API_KEY ? "Add a valid MapTiler browser key to show the nearby map." : message}</div></div>}
            {origin && !MAPTILER_API_KEY && <div className="absolute inset-x-5 bottom-5 rounded-xl border border-amber-300/20 bg-slate-950/80 p-3 text-xs text-amber-100 backdrop-blur">Places were found, but the map needs a valid MapTiler browser key.</div>}
          </div>
          <div className="border-t border-border lg:border-l lg:border-t-0">
            <div className="border-b border-border px-5 py-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-300">Nearby places</p><p className="mt-1 text-sm text-muted-foreground">{message}</p></div>{state === "loading" && <LoaderCircle className="h-5 w-5 animate-spin text-cyan-300" />}</div><div className="mt-4 flex gap-2">{[10, 25, 50].map((value) => <button key={value} type="button" onClick={() => updateRadius(value)} disabled={!origin || state === "loading"} className={`rounded-full border px-3 py-1.5 text-xs transition ${radius === value ? "border-cyan-300 bg-cyan-300/10 text-cyan-100" : "border-border text-muted-foreground hover:border-cyan-300/50"} disabled:cursor-not-allowed disabled:opacity-45`}>Within {value} km</button>)}</div></div>
            <div className="max-h-110 overflow-y-auto p-3">{state === "error" ? <div className="flex gap-3 p-3 text-sm text-rose-200"><AlertCircle className="h-5 w-5 shrink-0" />{message}</div> : places.length ? places.map((place) => <Link key={place.id} href={`/place/${place.slug}?from=/&fromLabel=Back%20to%20home`} onMouseEnter={() => setSelectedId(place.id)} className={`block rounded-xl p-3 transition ${selected?.id === place.id ? "bg-cyan-300/10" : "hover:bg-accent"}`}><div className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><MapPin className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><span className="truncate text-sm font-semibold">{place.name}</span><span className="shrink-0 text-xs text-cyan-200">{readableDistance(place.distanceKm)}</span></span><span className="mt-1 block truncate text-xs text-muted-foreground">{place.locationLabel}</span>{place.rating && <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-amber-200"><Star className="h-3.5 w-3.5 fill-current" />{place.rating.toFixed(1)}</span>}</span></div></Link>) : state === "ready" ? <p className="p-3 text-sm leading-6 text-muted-foreground">Try a wider distance to find more verified places.</p> : <p className="p-3 text-sm leading-6 text-muted-foreground">Use your location to unlock nearby places and distance filters.</p>}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
