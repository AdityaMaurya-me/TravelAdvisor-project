import { NextResponse } from "next/server";

type DirectionsRequest = {
  origin?: { longitude?: number; latitude?: number };
  destination?: { longitude?: number; latitude?: number };
  profile?: "driving-car" | "cycling-regular" | "foot-walking";
};

const validProfiles = new Set(["driving-car", "cycling-regular", "foot-walking"]);

function isCoordinate(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Directions are not configured yet. Add OPENROUTESERVICE_API_KEY to the server environment and restart the app." }, { status: 503 });
  }

  let payload: DirectionsRequest;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid directions request." }, { status: 400 });
  }

  const profile = payload.profile ?? "driving-car";
  const { origin, destination } = payload;
  if (!validProfiles.has(profile)
    || !isCoordinate(origin?.longitude, -180, 180)
    || !isCoordinate(origin?.latitude, -90, 90)
    || !isCoordinate(destination?.longitude, -180, 180)
    || !isCoordinate(destination?.latitude, -90, 90)) {
    return NextResponse.json({ error: "Choose two valid, different locations." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "application/geo+json, application/json",
      },
      body: JSON.stringify({
        coordinates: [[origin!.longitude!, origin!.latitude!], [destination!.longitude!, destination!.latitude!]],
        preference: "fastest",
        instructions: true,
        language: "en",
      }),
      cache: "no-store",
    });
    const body = await response.json().catch(() => null) as any;
    if (!response.ok) {
      const providerMessage = body?.error?.message || body?.error?.error || body?.message || "";
      const message = /could not find routable point/i.test(String(providerMessage))
        ? "One of these places has no road-network connection for the selected mode. Choose a nearby road-accessible point; island, ferry-only, and off-road places cannot have a car route."
        : providerMessage || "OpenRouteService could not calculate a route.";
      return NextResponse.json({ error: message }, { status: response.status >= 400 && response.status < 500 ? 422 : 502 });
    }

    const feature = body?.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    const summary = feature?.properties?.summary;
    if (!Array.isArray(coordinates) || coordinates.length < 2 || !summary) {
      return NextResponse.json({ error: "The directions service returned an incomplete route." }, { status: 502 });
    }
    const steps = (feature.properties?.segments ?? []).flatMap((segment: any) => segment.steps ?? []).map((step: any) => ({
      instruction: String(step.instruction ?? "Continue"),
      distanceMeters: Number(step.distance ?? 0),
      durationSeconds: Number(step.duration ?? 0),
    }));

    return NextResponse.json({
      profile,
      distanceMeters: Number(summary.distance ?? 0),
      durationSeconds: Number(summary.duration ?? 0),
      geometry: coordinates,
      steps,
    });
  } catch {
    return NextResponse.json({ error: "The directions service could not be reached. Please try again." }, { status: 502 });
  }
}
