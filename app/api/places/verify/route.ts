import { NextRequest, NextResponse } from "next/server";

import { hasGooglePlaces, searchGooglePlacesWithStatus } from "@/lib/google-places";
import { allowRequest } from "@/lib/rate-limit";

/**
 * Provides a narrow, non-persistent Google Places lookup for the curation
 * form. The selected ID is the factual anchor for a proposed location; Google
 * content itself is never copied into our catalogue from this endpoint.
 */
export async function GET(request: NextRequest) {
  if (!allowRequest(request, "place-verification-search", 20)) {
    return NextResponse.json({ error: "Too many verification searches. Please wait a moment." }, { status: 429 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) return NextResponse.json({ places: [] });
  if (!hasGooglePlaces()) {
    return NextResponse.json({ places: [], unavailable: true });
  }

  const result = await searchGooglePlacesWithStatus(query, 6);
  return NextResponse.json({
    places: result.places.map((place) => ({
      id: place.id,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      primaryType: place.primaryType ?? null,
    })),
    unavailable: Boolean(result.unavailableReason),
    unavailableReason: result.unavailableReason ?? null,
  }, { headers: { "Cache-Control": "no-store" } });
}
