import { createClient } from "@/lib/supabase/server";

export interface RouteStopPreview {
  slug: string;
  title: string;
  image: string;
  type: string;
  distance: string;
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
}

export async function getJourneyRouteBySlug(slug: string): Promise<JourneyRoute | null> {
  const supabase = await createClient();
  const { data: route, error } = await supabase
    .from("routes")
    .select("id, slug, name, distance_km, duration_min, start:start_place_id(name), end:end_place_id(name)")
    .eq("slug", slug)
    .single();

  if (error || !route) return null;

  const { data: stops } = await supabase
    .from("route_stops")
    .select("sort_order, stop_type, places(slug, name, cover_image)")
    .eq("route_id", route.id)
    .order("sort_order");

  const start = route.start as unknown as { name: string } | null;
  const end = route.end as unknown as { name: string } | null;
  const totalMinutes = route.duration_min ?? 0;
  const durationHours = Math.floor(totalMinutes / 60);
  const durationMinutes = totalMinutes % 60;

  return {
    id: route.id,
    slug: route.slug,
    title: route.name,
    startName: start?.name ?? "Start",
    endName: end?.name ?? "Destination",
    distance: `${Number(route.distance_km ?? 0).toLocaleString()} km`,
    duration: `${durationHours}h${durationMinutes ? ` ${durationMinutes}m` : ""}`,
    stops: (stops ?? []).map((stop: any, index) => ({
      slug: stop.places.slug,
      title: stop.places.name,
      image: stop.places.cover_image || "/placeholder.jpg",
      type: String(stop.stop_type).replace(/_/g, " "),
      distance: `${Math.max(10, Math.round((index + 1) * Number(route.distance_km ?? 0) / ((stops?.length ?? 0) + 1)))} km`,
    })),
  };
}
