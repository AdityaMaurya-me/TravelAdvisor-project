import { NextRequest, NextResponse } from "next/server";

import { hasGooglePlaces, searchGooglePlaces } from "@/lib/google-places";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ places: [] });
  if (!hasGooglePlaces()) return NextResponse.json({ places: [], unavailable: true });
  return NextResponse.json({ places: await searchGooglePlaces(query, 6) }, { headers: { "Cache-Control": "no-store" } });
}
