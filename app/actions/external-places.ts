"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/app/actions/auth";
import { getGooglePlaceById } from "@/lib/google-places";

export type ManagedExternalPlace = { id: string; slug: string };

export async function ensureExternalGooglePlace(googlePlaceId: string): Promise<ManagedExternalPlace> {
  const place = await getGooglePlaceById(googlePlaceId);
  if (!place) throw new Error("This Google place could not be verified. Refresh the page and try again.");

  const { supabase } = await requireUserId();
  const { data, error } = await (supabase as any).rpc("ensure_external_google_place", {
    p_google_place_id: place.id,
    p_name: place.name,
    p_address: place.address,
    p_latitude: place.latitude,
    p_longitude: place.longitude,
  }).single();
  if (error || !data?.id || !data?.slug) throw error ?? new Error("Unable to prepare this place for TravelAdvisor features.");
  revalidatePath("/community");
  return { id: data.id, slug: data.slug };
}
