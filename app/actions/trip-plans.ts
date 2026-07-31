"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/app/actions/auth";

type TripPlanInput = {
  originPlaceId: string;
  destinationPlaceId: string;
  bufferKm: number;
  stops: Array<{ id: string; slug: string; name: string }>;
};

export async function saveTripPlan(input: TripPlanInput) {
  if (!input.originPlaceId || !input.destinationPlaceId || input.originPlaceId === input.destinationPlaceId) throw new Error("Choose two different places.");
  if (!Number.isInteger(input.bufferKm) || input.bufferKm < 2 || input.bufferKm > 25) throw new Error("Choose a planning buffer between 2 and 25 km.");
  const { supabase, userId } = await requireUserId();
  const { error } = await (supabase as any).from("trip_plans").insert({ user_id: userId, origin_place_id: input.originPlaceId, destination_place_id: input.destinationPlaceId, buffer_km: input.bufferKm, stops: input.stops.slice(0, 100) });
  if (error) throw error;
  revalidatePath("/collections");
}

export async function createShareableTripPlan(tripPlanId: string) {
  const { supabase, userId } = await requireUserId();
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
