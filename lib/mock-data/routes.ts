import { createClient } from "@/lib/supabase/server";

export interface RouteStopPreview {
  id: string;
  slug: string;
  title: string;
  image: string;
  type: string;
  distance: string;
  isPetFriendly: boolean | null;
  hasParking: boolean | null;
  hasWashroom: boolean | null;
  hasEvCharging: boolean | null;
  typicalVisitMinutes: number | null;
}

export interface RouteWaypoint {
  id: string;
  name: string;
  kind: "start" | "stop" | "end";
  latitude: number;
  longitude: number;
}

export interface JourneyRoute {
  id: string;
  slug: string;
  title: string;
  startName: string;
  endName: string;
  distance: string;
  duration: string;
  stops: RouteStopPreview[];
  waypoints: RouteWaypoint[];
}

export async function getJourneyRouteBySlug(slug: string): Promise<JourneyRoute | null> {
  const supabase = await createClient();
  const { data: route, error } = await supabase
    .from("routes")
    .select("id, slug, name, distance_km, duration_min, start:start_place_id(id, name), end:end_place_id(id, name)")
    .eq("slug", slug)
    .single();

  if (error || !route) return null;

  const { data: stops } = await supabase
    .from("route_stops")
    .select("sort_order, stop_type, places(id, slug, name, cover_image, is_pet_friendly, has_parking, has_washroom, has_ev_charging, typical_visit_minutes)")
    .eq("route_id", route.id)
    .order("sort_order");

  const start = route.start as unknown as { id: string; name: string } | null;
  const end = route.end as unknown as { id: string; name: string } | null;
  const totalMinutes = route.duration_min ?? 0;
  const durationHours = Math.floor(totalMinutes / 60);
  const durationMinutes = totalMinutes % 60;

  const normalisedStops = (stops ?? []).flatMap((stop: any, index) => {
    const place = stop.places;
    if (!place?.id || !place?.slug || !place?.name) return [];
    return [{
      id: place.id,
      slug: place.slug,
      title: place.name,
      image: place.cover_image || "/placeholder.jpg",
      type: String(stop.stop_type).replace(/_/g, " "),
      distance: `${Math.max(10, Math.round((index + 1) * Number(route.distance_km ?? 0) / ((stops?.length ?? 0) + 1)))} km`,
      isPetFriendly: place.is_pet_friendly ?? null,
      hasParking: place.has_parking ?? null,
      hasWashroom: place.has_washroom ?? null,
      hasEvCharging: place.has_ev_charging ?? null,
      typicalVisitMinutes: place.typical_visit_minutes ?? null,
    }];
  });

  const waypointIds = [start?.id, ...normalisedStops.map((stop) => stop.id), end?.id].filter(Boolean) as string[];
  const { data: markerRows } = waypointIds.length
    ? await (supabase as any).from("v_place_map_marker").select("id, name, latitude, longitude").in("id", waypointIds)
    : { data: [] };
  const markerById = new Map<string, any>((markerRows ?? []).map((marker: any) => [marker.id, marker]));
  const toWaypoint = (id: string | undefined, name: string | undefined, kind: RouteWaypoint["kind"]): RouteWaypoint | null => {
    const marker = id ? markerById.get(id) : null;
    const latitude = Number(marker?.latitude);
    const longitude = Number(marker?.longitude);
    return marker && Number.isFinite(latitude) && Number.isFinite(longitude) && id && name
      ? { id, name, kind, latitude, longitude }
      : null;
  };

  const waypoints = [
    toWaypoint(start?.id, start?.name, "start"),
    ...normalisedStops.map((stop) => toWaypoint(stop.id, stop.title, "stop")),
    toWaypoint(end?.id, end?.name, "end"),
  ].filter(Boolean) as RouteWaypoint[];

  return {
    id: route.id,
    slug: route.slug,
    title: route.name,
    startName: start?.name ?? "Start",
    endName: end?.name ?? "Destination",
    distance: `${Number(route.distance_km ?? 0).toLocaleString()} km`,
    duration: `${durationHours}h${durationMinutes ? ` ${durationMinutes}m` : ""}`,
    stops: normalisedStops,
    waypoints,
  };
}
