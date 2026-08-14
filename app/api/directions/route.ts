import { NextResponse } from "next/server";
import { allowRequest } from "@/lib/rate-limit";

type DirectionsRequest = {
  origin?: { longitude?: number; latitude?: number };
  destination?: { longitude?: number; latitude?: number };
  profile?: "driving-car" | "cycling-regular" | "foot-walking";
};

const validProfiles = new Set(["driving-car", "cycling-regular", "foot-walking"]);
// The product's "Bike" option is intended for the motorcycle/two-wheeler
// journeys that are common in India. `BICYCLE` is human-powered cycling and
// often has no country-wide network for long trips such as Mumbai → Delhi.
const googleTravelModes = { "driving-car": "DRIVE", "cycling-regular": "TWO_WHEELER", "foot-walking": "WALK" } as const;

function isCoordinate(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function durationSeconds(value: unknown) {
  const match = typeof value === "string" ? /^(\d+(?:\.\d+)?)s$/.exec(value) : null;
  return match ? Number(match[1]) : 0;
}

function decodeGooglePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0; let latitude = 0; let longitude = 0;
  const decodeValue = () => {
    let result = 0; let shift = 0; let byte = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20 && index < encoded.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    latitude += decodeValue();
    longitude += decodeValue();
    coordinates.push([longitude / 1e5, latitude / 1e5]);
  }
  return coordinates;
}

function roadAccessError(message: string) {
  return /could not find routable point/i.test(message)
    ? "One of these places has no road-network connection for the selected mode. Choose a nearby road-accessible point; island, ferry-only, and off-road places cannot have a car route."
    : message;
}

async function getGoogleRoute(apiKey: string, origin: Required<DirectionsRequest>["origin"], destination: Required<DirectionsRequest>["destination"], profile: DirectionsRequest["profile"]) {
  const travelMode = googleTravelModes[profile!];
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction.instructions,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin!.latitude!, longitude: origin!.longitude! } } },
      destination: { location: { latLng: { latitude: destination!.latitude!, longitude: destination!.longitude! } } },
      travelMode,
      ...(travelMode === "DRIVE" || travelMode === "TWO_WHEELER" ? { routingPreference: "TRAFFIC_AWARE" } : {}),
      polylineQuality: "HIGH_QUALITY",
      languageCode: "en",
      units: "METRIC",
    }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as any;
  if (!response.ok) {
    throw new Error(body?.error?.message || "Google Maps could not calculate a route.");
  }
  const route = body?.routes?.[0];
  const geometry = typeof route?.polyline?.encodedPolyline === "string" ? decodeGooglePolyline(route.polyline.encodedPolyline) : [];
  if (!route || geometry.length < 2) throw new Error("Google Maps returned an incomplete route.");
  const steps = (route.legs ?? []).flatMap((leg: any) => leg.steps ?? []).map((step: any) => ({
    instruction: String(step.navigationInstruction?.instructions ?? "Continue"),
    distanceMeters: Number(step.distanceMeters ?? 0),
    durationSeconds: durationSeconds(step.duration || step.staticDuration),
  }));
  return {
    provider: "Google Maps Routes API",
    profile,
    distanceMeters: Number(route.distanceMeters ?? 0),
    durationSeconds: durationSeconds(route.duration || route.staticDuration),
    geometry,
    steps,
  };
}

async function getOpenRouteServiceRoute(apiKey: string, origin: Required<DirectionsRequest>["origin"], destination: Required<DirectionsRequest>["destination"], profile: DirectionsRequest["profile"]) {
  const response = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json", Accept: "application/geo+json, application/json" },
    body: JSON.stringify({ coordinates: [[origin!.longitude!, origin!.latitude!], [destination!.longitude!, destination!.latitude!]], preference: "fastest", instructions: true, language: "en" }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as any;
  if (!response.ok) throw new Error(roadAccessError(body?.error?.message || body?.error?.error || body?.message || "OpenRouteService could not calculate a route."));
  const feature = body?.features?.[0]; const coordinates = feature?.geometry?.coordinates; const summary = feature?.properties?.summary;
  if (!Array.isArray(coordinates) || coordinates.length < 2 || !summary) throw new Error("The directions service returned an incomplete route.");
  return {
    provider: profile === "cycling-regular" ? "OpenRouteService cycling network" : "OpenRouteService road network",
    profile,
    distanceMeters: Number(summary.distance ?? 0),
    durationSeconds: Number(summary.duration ?? 0),
    geometry: coordinates as [number, number][],
    steps: (feature.properties?.segments ?? []).flatMap((segment: any) => segment.steps ?? []).map((step: any) => ({ instruction: String(step.instruction ?? "Continue"), distanceMeters: Number(step.distance ?? 0), durationSeconds: Number(step.duration ?? 0) })),
  };
}

export async function POST(request: Request) {
  if (!allowRequest(request, "directions", 12)) return NextResponse.json({ error: "Too many route requests. Try again shortly." }, { status: 429 });
  let payload: DirectionsRequest;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid directions request." }, { status: 400 }); }
  const profile = payload.profile ?? "driving-car";
  const { origin, destination } = payload;
  if (!validProfiles.has(profile) || !isCoordinate(origin?.longitude, -180, 180) || !isCoordinate(origin?.latitude, -90, 90) || !isCoordinate(destination?.longitude, -180, 180) || !isCoordinate(destination?.latitude, -90, 90)) {
    return NextResponse.json({ error: "Choose two valid locations." }, { status: 400 });
  }
  if (origin!.longitude === destination!.longitude && origin!.latitude === destination!.latitude) return NextResponse.json({ error: "Choose two different locations." }, { status: 400 });

  const routeOrigin = origin as Required<DirectionsRequest>["origin"];
  const routeDestination = destination as Required<DirectionsRequest>["destination"];
  const googleDemoKey = process.env.GOOGLE_MAPS_DEMO_API_KEY;
  const orsKey = process.env.OPENROUTESERVICE_API_KEY;
  let googleError: unknown = null;

  // Google is preferred for traffic-aware car/two-wheeler routes, but an
  // incomplete beta-mode response must not prevent the configured fallback
  // provider from serving the route.
  if (googleDemoKey) {
    try {
      return NextResponse.json(await getGoogleRoute(googleDemoKey, routeOrigin, routeDestination, profile));
    } catch (caught) {
      googleError = caught;
    }
  }

  if (orsKey) {
    try {
      const fallbackRoute = await getOpenRouteServiceRoute(orsKey, routeOrigin, routeDestination, profile);
      return NextResponse.json({
        ...fallbackRoute,
        provider: googleDemoKey ? `${fallbackRoute.provider} (Google fallback)` : fallbackRoute.provider,
      });
    } catch (caught) {
      return NextResponse.json({ error: roadAccessError(caught instanceof Error ? caught.message : "The directions service could not be reached. Please try again.") }, { status: 422 });
    }
  }

  if (googleError) {
    return NextResponse.json({ error: roadAccessError(googleError instanceof Error ? googleError.message : "Google Maps could not calculate a route.") }, { status: 422 });
  }

  return NextResponse.json({ error: "Directions are not configured. Add GOOGLE_MAPS_DEMO_API_KEY or OPENROUTESERVICE_API_KEY to the server environment." }, { status: 503 });
}
