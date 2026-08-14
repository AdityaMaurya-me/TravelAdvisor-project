"use client";

import Link from "next/link";
import * as maptilersdk from "@maptiler/sdk";
import { AlertCircle, Crosshair, MapPin, Navigation, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { mapTilerStyle, OPEN_STREET_MAP_FALLBACK_STYLE } from "@/lib/maps/map-style";
import { isLocationEnabled } from "@/lib/location-preference";
import { LocationAccessPrompt } from "@/components/ui/location-access-prompt";
import { MapLoadingIndicator } from "@/components/maps/map-loading-indicator";

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
const NEARBY_SESSION_KEY = "traveladvisor:nearby-places";
const NEARBY_SESSION_MAX_AGE = 12 * 60 * 60 * 1000;

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
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [mapMessage, setMapMessage] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);

  const selected = places.find((place) => place.id === selectedId) ?? places[0] ?? null;

  // Keep the last successful nearby result while a visitor opens a place card
  // and comes back home. It is intentionally session-like: pressing the
  // location button always requests fresh GPS coordinates and fresh results.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(NEARBY_SESSION_KEY);
      if (!saved) return;
      const snapshot = JSON.parse(saved) as { savedAt?: number; origin?: { latitude: number; longitude: number }; places?: NearbyPlace[]; radius?: number; selectedId?: string; message?: string };
      if (!snapshot.origin || !Array.isArray(snapshot.places) || !snapshot.savedAt || Date.now() - snapshot.savedAt > NEARBY_SESSION_MAX_AGE) return;
      setOrigin(snapshot.origin);
      setPlaces(snapshot.places);
      setRadius(snapshot.radius ?? 25);
      setSelectedId(snapshot.selectedId ?? snapshot.places[0]?.id ?? null);
      setMessage(snapshot.message ?? `${snapshot.places.length} verified places near you.`);
      setState("ready");
    } catch { window.localStorage.removeItem(NEARBY_SESSION_KEY); }
  }, []);

  useEffect(() => {
    const clearLocationState = (event: Event) => {
      if ((event as CustomEvent<{ enabled?: boolean }>).detail?.enabled !== false) return;
      setOrigin(null);
      setPlaces([]);
      setSelectedId(null);
      setState("idle");
      setMessage("Location services are disabled. Enable them in Settings to find places near you.");
    };
    window.addEventListener("traveladvisor:location-preference", clearLocationState);
    return () => window.removeEventListener("traveladvisor:location-preference", clearLocationState);
  }, []);

  useEffect(() => {
    if (state !== "ready" || !origin) return;
    try { window.localStorage.setItem(NEARBY_SESSION_KEY, JSON.stringify({ savedAt: Date.now(), origin, places, radius, selectedId, message })); } catch { /* Storage can be unavailable in private browsing. */ }
  }, [message, origin, places, radius, selectedId, state]);

  useEffect(() => {
    if (!origin || !element.current) return;

    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let map: maptilersdk.Map | null = null;
    let fallbackActive = !MAPTILER_API_KEY;
    let fallbackAttempted = fallbackActive;
    setMapStatus("loading");
    setMapMessage("");
    setUsingFallback(fallbackActive);

    const mountMap = (useFallback: boolean) => {
      if (disposed || !element.current) return;
      fallbackActive = useFallback;
      setUsingFallback(useFallback);
      markerRef.current.forEach((marker) => marker.remove());
      markerRef.current = [];
      map?.remove();
      try {
        if (MAPTILER_API_KEY) maptilersdk.config.apiKey = MAPTILER_API_KEY;
        map = new maptilersdk.Map({
          container: element.current,
          style: useFallback ? OPEN_STREET_MAP_FALLBACK_STYLE : mapTilerStyle(MAPTILER_API_KEY!),
          center: [origin.longitude, origin.latitude],
          zoom: 11,
          logSDKVersion: false,
        });
        const instance = map;
        mapRef.current = map;
        map.addControl(new maptilersdk.NavigationControl({ showCompass: false }), "bottom-right");
        map.on("load", () => {
          if (disposed || instance !== map) return;
          if (timeout) clearTimeout(timeout);
          setMapStatus("ready");
        });
        map.on("error", () => {
          if (disposed || instance !== map) return;
          if (!fallbackActive && !fallbackAttempted) {
            fallbackAttempted = true;
            mountMap(true);
            return;
          }
          if (timeout) clearTimeout(timeout);
          setMapStatus("error");
          setMapMessage("The backup map could not load. Check your connection and refresh.");
        });
        const currentLocation = document.createElement("span");
        currentLocation.className = "travel-map-current-location";
        currentLocation.setAttribute("aria-label", "Your current location");
        new maptilersdk.Marker({ element: currentLocation }).setLngLat([origin.longitude, origin.latitude]).addTo(map);
      } catch {
        if (!fallbackActive && !fallbackAttempted) {
          fallbackAttempted = true;
          mountMap(true);
        } else {
          setMapStatus("error");
          setMapMessage("The backup map could not start. Check your connection and refresh.");
        }
      }
    };

    timeout = setTimeout(() => {
      if (disposed) return;
      if (!fallbackActive && !fallbackAttempted) {
        fallbackAttempted = true;
        mountMap(true);
      } else {
        setMapStatus("error");
        setMapMessage("The backup map is taking too long to load. Check your connection and refresh.");
      }
    }, 8000);
    mountMap(fallbackActive);

    return () => {
      disposed = true;
      if (timeout) clearTimeout(timeout);
      markerRef.current.forEach((marker) => marker.remove());
      markerRef.current = [];
      map?.remove();
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
  }, [mapStatus, origin, places]);

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
      const cityLabel = result.city?.name ? ` in ${result.city.name}` : "";
      setMessage(result.places?.length ? `${result.places.length} verified places${cityLabel} within ${result.radius} km.` : result.city ? `No verified places found in ${result.city.name} within ${result.radius} km yet.` : "We could not match your current location to a supported destination yet.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to load nearby places.");
    }
  };

  const startLocationRequest = () => {
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

  const useCurrentLocation = () => {
    if (!isLocationEnabled()) {
      setLocationPromptOpen(true);
      return;
    }
    startLocationRequest();
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
            {origin ? <><div ref={element} className="absolute inset-0" aria-label="Interactive map of places near you" />{mapStatus !== "ready" && <div className="absolute inset-0 grid place-items-center bg-card/85 p-8 text-center text-sm leading-6 text-muted-foreground backdrop-blur-sm">{mapStatus === "loading" ? <MapLoadingIndicator label="Loading nearby places" /> : <div><AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-300" />{mapMessage || "The nearby map could not load."}</div>}</div>}</> : <div className="absolute inset-0 grid place-items-center p-8 text-center text-sm leading-6 text-slate-300">{state === "locating" || state === "loading" ? <MapLoadingIndicator label={state === "locating" ? "Finding your location" : "Finding nearby places"} /> : <div><MapPin className="mx-auto mb-3 h-8 w-8 text-cyan-300" />{message}</div>}</div>}
            {origin && usingFallback && <div className="pointer-events-none absolute bottom-5 left-5 rounded-xl border border-border bg-background/90 p-3 text-xs text-muted-foreground backdrop-blur">OpenStreetMap backup is active.</div>}
          </div>
          <div className="border-t border-border lg:border-l lg:border-t-0">
            <div className="border-b border-border px-5 py-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-300">Nearby places</p><p className="mt-1 text-sm text-muted-foreground">{message}</p></div></div><div className="mt-4 flex gap-2">{[10, 25, 50].map((value) => <button key={value} type="button" onClick={() => updateRadius(value)} disabled={!origin || state === "loading"} className={`rounded-full border px-3 py-1.5 text-xs transition ${radius === value ? "border-cyan-300 bg-cyan-300/10 text-cyan-100" : "border-border text-muted-foreground hover:border-cyan-300/50"} disabled:cursor-not-allowed disabled:opacity-45`}>Within {value} km</button>)}</div></div>
            <div className="max-h-110 overflow-y-auto p-3">{state === "error" ? <div className="flex gap-3 p-3 text-sm text-rose-200"><AlertCircle className="h-5 w-5 shrink-0" />{message}</div> : places.length ? places.map((place) => <Link key={place.id} href={`/place/${place.slug}?from=/&fromLabel=Back%20to%20home`} onMouseEnter={() => setSelectedId(place.id)} className={`block rounded-xl p-3 transition ${selected?.id === place.id ? "bg-cyan-300/10" : "hover:bg-accent"}`}><div className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><MapPin className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><span className="truncate text-sm font-semibold">{place.name}</span><span className="shrink-0 text-xs text-cyan-200">{readableDistance(place.distanceKm)}</span></span><span className="mt-1 block truncate text-xs text-muted-foreground">{place.locationLabel}</span>{place.rating && <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-amber-200"><Star className="h-3.5 w-3.5 fill-current" />{place.rating.toFixed(1)}</span>}</span></div></Link>) : state === "ready" ? <p className="p-3 text-sm leading-6 text-muted-foreground">Try a wider distance to find more verified places.</p> : <p className="p-3 text-sm leading-6 text-muted-foreground">Use your location to unlock nearby places and distance filters.</p>}</div>
          </div>
        </div>
      </div>
      <LocationAccessPrompt open={locationPromptOpen} onOpenChange={setLocationPromptOpen} onEnable={startLocationRequest} />
    </section>
  );
}
