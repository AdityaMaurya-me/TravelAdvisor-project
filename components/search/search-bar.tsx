"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";

type GooglePlaceSuggestion = { id: string; name: string; address: string; primaryType?: string };

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPlaceSelect?: (place: GooglePlaceSuggestion) => void;
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
  const [suggestions, setSuggestions] = useState<GooglePlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
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
    if (query.length < 2) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const body = await response.json() as { places?: GooglePlaceSuggestion[] };
        if (!controller.signal.aborted) setSuggestions(body.places ?? []);
      } catch { if (!controller.signal.aborted) setSuggestions([]); }
    }, 300);
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
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <p className="border-b border-slate-100 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Places from Google</p>
          {suggestions.map((place) => (
            <button key={place.id} type="button" onClick={() => { onChange(place.name); setOpen(false); if (onPlaceSelect) onPlaceSelect(place); else requestAnimationFrame(() => element.current?.requestSubmit()); }} className="flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-slate-50">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
              <span><span className="block text-sm font-semibold">{place.name}</span><span className="mt-0.5 block text-xs text-slate-500">{place.address}</span></span>
            </button>
          ))}
          <p className="border-t border-slate-100 px-5 py-2 text-right text-[11px] font-medium text-slate-400">Powered by Google</p>
        </div>
      )}
    </form>
  );
}
