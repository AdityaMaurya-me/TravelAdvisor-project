import { NextRequest, NextResponse } from "next/server";

import { hasGooglePlaces, isGoogleDestinationPlace, searchGooglePlacesWithStatus } from "@/lib/google-places";
import { searchOpenStreetMapPlaces } from "@/lib/openstreetmap-places";
import { createClient } from "@/lib/supabase/server";
import { allowRequest } from "@/lib/rate-limit";
import { scoreSearchMatch } from "@/lib/search-ranking";

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
  ].sort((a, b) => scoreSearchMatch(query, b.name, b.address, b.source === "curated") - scoreSearchMatch(query, a.name, a.address, a.source === "curated")).slice(0, 12);
  return NextResponse.json({ places, liveSearchStatus: googleResult.unavailableReason ?? "available" }, { headers: { "Cache-Control": "no-store" } });
}
