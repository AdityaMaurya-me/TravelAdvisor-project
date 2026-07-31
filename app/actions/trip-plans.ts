"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/app/actions/auth";

type TripPlanInput = {
  originPlaceId?: string;
  destinationPlaceId?: string;
  origin?: TripEndpoint;
  destination?: TripEndpoint;
  bufferKm: number;
  stops: Array<{ id: string; slug: string; name: string }>;
};

type TripEndpoint = { id: string; slug: string; name: string; locationLabel: string; latitude: number; longitude: number };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function endpointValues(input: TripPlanInput, side: "origin" | "destination") {
  const placeId = side === "origin" ? input.originPlaceId : input.destinationPlaceId;
  const endpoint = side === "origin" ? input.origin : input.destination;
  const verifiedId = placeId && uuidPattern.test(placeId) ? placeId : endpoint && uuidPattern.test(endpoint.id) ? endpoint.id : null;
  if (verifiedId) return { placeId: verifiedId, snapshot: null };
  if (!endpoint?.name || !Number.isFinite(endpoint.latitude) || !Number.isFinite(endpoint.longitude)) throw new Error(`Choose a valid ${side === "origin" ? "starting point" : "destination"}.`);
  return { placeId: null, snapshot: { name: endpoint.name.slice(0, 180), slug: endpoint.slug.slice(0, 180), locationLabel: endpoint.locationLabel.slice(0, 180), latitude: endpoint.latitude, longitude: endpoint.longitude, source: endpoint.id.startsWith("current-") ? "device" : "external" } };
}

export async function saveTripPlan(input: TripPlanInput) {
  if (!Number.isInteger(input.bufferKm) || input.bufferKm < 2 || input.bufferKm > 25) throw new Error("Choose a planning buffer between 2 and 25 km.");
  const origin = endpointValues(input, "origin");
  const destination = endpointValues(input, "destination");
  if (origin.placeId && destination.placeId && origin.placeId === destination.placeId) throw new Error("Choose two different places.");
  const { supabase, userId } = await requireUserId();
  const { data, error } = await (supabase as any).from("trip_plans").insert({ user_id: userId, origin_place_id: origin.placeId, destination_place_id: destination.placeId, origin_snapshot: origin.snapshot, destination_snapshot: destination.snapshot, buffer_km: input.bufferKm, stops: input.stops.slice(0, 100) }).select("id").single();
  if (error || !data?.id) throw error ?? new Error("Unable to save this journey.");
  revalidatePath("/collections");
  return String(data.id);
}

export async function getSavedTripPlan(originPlaceId: string, destinationPlaceId: string) {
  if (!originPlaceId || !destinationPlaceId) return null;
  const { supabase, userId } = await requireUserId();
  const { data, error } = await (supabase as any)
    .from("trip_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("origin_place_id", originPlaceId)
    .eq("destination_place_id", destinationPlaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ? String(data.id) : null;
}

export async function createShareableTripPlan(tripPlanId: string) {
  const { supabase, userId } = await requireUserId();
  const { data: trip, error: tripError } = await (supabase as any).from("trip_plans").select("id, origin_snapshot, destination_snapshot").eq("id", tripPlanId).eq("user_id", userId).maybeSingle();
  if (tripError || !trip) throw tripError ?? new Error("Saved journey not found.");
  if (trip.origin_snapshot?.source === "device" || trip.destination_snapshot?.source === "device") throw new Error("Journeys using your device location cannot be shared.");
  const { data, error } = await (supabase as any)
    .from("trip_plans")
    .update({ is_public: true })
    .eq("id", tripPlanId)
    .eq("user_id", userId)
    .select("share_token")
    .single();
  if (error || !data?.share_token) throw error ?? new Error("Unable to create a share link.");
  revalidatePath("/collections");
  return String(data.share_token);
}

export async function disableShareableTripPlan(tripPlanId: string) {
  const { supabase, userId } = await requireUserId();
  const { error } = await (supabase as any).from("trip_plans").update({ is_public: false }).eq("id", tripPlanId).eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/collections");
}
