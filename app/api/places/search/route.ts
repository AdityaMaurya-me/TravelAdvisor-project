import { NextRequest, NextResponse } from "next/server";

import { hasGooglePlaces, searchGooglePlaces } from "@/lib/google-places";
import { createClient } from "@/lib/supabase/server";
import { allowRequest } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  if (!allowRequest(request, "place-search", 25)) return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429 });
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ places: [] });
  const supabase = await createClient();
  const { data: curated } = await supabase.from("places").select("id,name,address,slug,level").eq("is_published", true).ilike("name", `%${query}%`).limit(12);
  const google = hasGooglePlaces() ? await searchGooglePlaces(query, 6) : [];
  const curatedNames = new Set((curated ?? []).map((place) => place.name.trim().toLowerCase()));
  const orderedCurated = [...(curated ?? [])].sort((a, b) => Number(b.name.trim().toLowerCase() === query.toLowerCase()) - Number(a.name.trim().toLowerCase() === query.toLowerCase()));
  const places = [
    ...orderedCurated.map((place) => ({ id: place.id, name: place.name, address: place.address ?? "TravelAdvisor verified location", slug: place.slug, level: place.level, source: "curated" })),
    ...google.filter((place) => !curatedNames.has(place.name.trim().toLowerCase())).map((place) => ({ ...place, source: "google" })),
  ].slice(0, 6);
  return NextResponse.json({ places }, { headers: { "Cache-Control": "no-store" } });
}
