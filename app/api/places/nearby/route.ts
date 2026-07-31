import { NextRequest, NextResponse } from "next/server";

import { distanceInKilometres } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_RADIUS_KM = 25;
const MAX_RADIUS_KM = 100;
const MAX_RESULTS = 30;

function readNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const latitude = readNumber(request.nextUrl.searchParams.get("latitude"));
  const longitude = readNumber(request.nextUrl.searchParams.get("longitude"));
  const requestedRadius = readNumber(request.nextUrl.searchParams.get("radius"));
  const radius = Math.min(Math.max(requestedRadius ?? DEFAULT_RADIUS_KM, 1), MAX_RADIUS_KM);

  if (latitude === null || longitude === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Valid latitude and longitude are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("v_place_map_marker")
    .select("id, slug, name, location_label, rating, latitude, longitude")
    .limit(500);

  if (error) {
    return NextResponse.json({ error: "Nearby places are unavailable right now." }, { status: 500 });
  }

  const origin = { latitude, longitude };
  const places = (data ?? [])
    .flatMap((row: any) => {
      const placeLatitude = Number(row.latitude);
      const placeLongitude = Number(row.longitude);
      if (!Number.isFinite(placeLatitude) || !Number.isFinite(placeLongitude)) return [];
      const distanceKm = distanceInKilometres(origin, { latitude: placeLatitude, longitude: placeLongitude });
      if (distanceKm > radius) return [];
      return [{
        id: row.id,
        slug: row.slug,
        name: row.name,
        locationLabel: row.location_label,
        rating: row.rating === null ? null : Number(row.rating),
        latitude: placeLatitude,
        longitude: placeLongitude,
        distanceKm,
      }];
    })
    .sort((first: { distanceKm: number }, second: { distanceKm: number }) => first.distanceKm - second.distanceKm)
    .slice(0, MAX_RESULTS);

  return NextResponse.json({ places, radius }, { headers: { "Cache-Control": "no-store" } });
}
