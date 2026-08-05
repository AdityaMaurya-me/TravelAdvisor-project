import { NextRequest, NextResponse } from "next/server";

import { hasGooglePlaces, isGoogleDestinationPlace, searchGooglePlacesWithStatus } from "@/lib/google-places";
import { searchOpenStreetMapPlaces } from "@/lib/openstreetmap-places";
import { createClient } from "@/lib/supabase/server";
import { allowRequest } from "@/lib/rate-limit";

function compact(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function scoreMatch(query: string, name: string, address = "", curated = false) {
  const needle = compact(query);
  const title = compact(name);
  const location = compact(address);
  if (!needle) return 0;
  let score = curated ? 20 : 0;
  if (title === needle) score += 1000;
  else if (title.startsWith(needle)) score += 800;
  else if (title.includes(needle)) score += 620;
  else if (location.startsWith(needle)) score += 360;
  else if (location.includes(needle)) score += 180;
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  score += words.reduce((total, word) => total + (name.toLocaleLowerCase().includes(word) ? 40 : address.toLocaleLowerCase().includes(word) ? 12 : 0), 0);
  return score;
}

export async function GET(request: NextRequest) {
  if (!allowRequest(request, "place-search", 25)) return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429 });
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ places: [] });
  const supabase = await createClient();
  const { data: curated } = await supabase.from("places").select("id,name,address,slug,level").eq("is_published", true).ilike("name", `%${query}%`).limit(12);
  const googleResult = hasGooglePlaces() ? await searchGooglePlacesWithStatus(query, 8) : { places: [], unavailableReason: "not_configured" as const };
  const google = googleResult.places;
  const openStreetMap = google.length === 0 && googleResult.unavailableReason ? await searchOpenStreetMapPlaces(query, 8) : [];
  const curatedNames = new Set((curated ?? []).map((place) => place.name.trim().toLowerCase()));
  const places = [
    ...(curated ?? []).map((place) => ({ id: place.id, name: place.name, address: place.address ?? "TravelAdvisor verified location", slug: place.slug, level: place.level, kind: place.level === "city" ? "destination" as const : "place" as const, source: "curated" as const })),
    ...google.filter((place) => !curatedNames.has(place.name.trim().toLowerCase())).map((place) => ({ ...place, kind: isGoogleDestinationPlace(place) ? "destination" as const : "place" as const, source: "google" as const })),
    ...openStreetMap.filter((place) => !curatedNames.has(place.name.trim().toLowerCase())).map((place) => ({ ...place, kind: "place" as const, source: "openstreetmap" as const })),
  ].sort((a, b) => scoreMatch(query, b.name, b.address, b.source === "curated") - scoreMatch(query, a.name, a.address, a.source === "curated")).slice(0, 12);
  return NextResponse.json({ places, liveSearchStatus: googleResult.unavailableReason ?? "available" }, { headers: { "Cache-Control": "no-store" } });
}
