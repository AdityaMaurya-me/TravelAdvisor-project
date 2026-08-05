"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { LoaderCircle, MapPin, Search } from "lucide-react";

type PlaceSuggestion = { id: string; name: string; address: string; primaryType?: string; latitude?: number; longitude?: number; slug?: string; level?: "city" | "attraction"; kind?: "destination" | "place"; source?: "curated" | "google" | "openstreetmap" };

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPlaceSelect?: (place: PlaceSuggestion) => void;
}

const PLACEHOLDERS = [
  "Where do you want to go?",
  "Search a destination...",
  "Find your next adventure...",
];

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  onPlaceSelect,
}: SearchBarProps) {
  const [placeholder, setPlaceholder] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [characterIndex, setCharacterIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [liveSearchMessage, setLiveSearchMessage] = useState("");
  const element = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const current = PLACEHOLDERS[placeholderIndex];

    const timeout = setTimeout(() => {
      if (!deleting) {
        if (characterIndex < current.length) {
          setPlaceholder(current.slice(0, characterIndex + 1));
          setCharacterIndex((prev) => prev + 1);
        } else {
          setDeleting(true);
        }
      } else {
        if (characterIndex > 0) {
          setPlaceholder(current.slice(0, characterIndex - 1));
          setCharacterIndex((prev) => prev - 1);
        } else {
          setDeleting(false);
          setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        }
      }
    }, deleting ? 35 : 55);

    return () => clearTimeout(timeout);
  }, [characterIndex, deleting, placeholderIndex]);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) { setSuggestions([]); setLiveSearchMessage(""); setIsLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const body = await response.json() as { places?: PlaceSuggestion[]; liveSearchStatus?: "available" | "not_configured" | "quota_exhausted" | "provider_error" };
        if (!controller.signal.aborted) {
          setSuggestions(body.places ?? []);
          const hasOpenStreetMapFallback = (body.places ?? []).some((place) => place.source === "openstreetmap");
          setLiveSearchMessage(body.liveSearchStatus === "quota_exhausted" ? hasOpenStreetMapFallback ? "Google discovery has reached its daily quota. Showing basic OpenStreetMap results instead." : "Live Google discovery is temporarily unavailable because its daily search quota has been reached. Verified TravelAdvisor results remain available." : body.liveSearchStatus === "not_configured" || body.liveSearchStatus === "provider_error" ? hasOpenStreetMapFallback ? "Showing basic OpenStreetMap results while Google discovery is unavailable." : "Live Google discovery is temporarily unavailable. Verified TravelAdvisor results remain available." : "");
        }
      } catch { if (!controller.signal.aborted) { setSuggestions([]); setLiveSearchMessage("Search is temporarily unavailable. Please try again."); } }
      finally { if (!controller.signal.aborted) setIsLoading(false); }
    }, 450);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [value]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (element.current && !element.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <form ref={element} onSubmit={onSubmit} className="relative w-full">
      <div className="relative flex items-center">
        <input
          id="homepage-place-search"
          name="place-search"
          type="text"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          placeholder={placeholder}
          className="search-bar-input w-full rounded-full bg-white px-8 py-5 pr-20 text-lg text-gray-900 shadow-lg transition-all placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />

        <button
          type="submit"
          aria-label="Search"
          className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white transition-colors hover:bg-cyan-600"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
      {open && (suggestions.length > 0 || isLoading || liveSearchMessage) && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <p className="border-b border-slate-100 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Search results</p>
          {isLoading && suggestions.length === 0 ? <div className="flex items-center gap-2 px-5 py-5 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin text-cyan-600" />Finding the best matches…</div> : <><div className="max-h-[min(52vh,24rem)] overflow-y-auto overscroll-contain">{suggestions.map((place) => (
            <button key={place.id} type="button" onClick={() => { onChange(place.name); setOpen(false); if (onPlaceSelect) onPlaceSelect(place); else requestAnimationFrame(() => element.current?.requestSubmit()); }} className="flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-slate-50">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
              <span className="min-w-0"><span className="flex items-center gap-2"><span className="block truncate text-sm font-semibold">{place.name}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${place.source === "curated" ? "bg-emerald-100 text-emerald-700" : place.source === "openstreetmap" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-700"}`}>{place.source === "curated" ? "TravelAdvisor" : place.source === "openstreetmap" ? "OpenStreetMap" : "Google"}</span>{place.kind === "destination" && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">Destination</span>}</span><span className="mt-0.5 block text-xs text-slate-500">{place.address}</span></span>
            </button>
          ))}</div>{liveSearchMessage && <p className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs leading-5 text-amber-900">{liveSearchMessage}</p>}</>}
          <p className="border-t border-slate-100 px-5 py-2 text-right text-[11px] font-medium text-slate-400">TravelAdvisor results · Google and OpenStreetMap when available</p>
        </div>
      )}
    </form>
  );
}
