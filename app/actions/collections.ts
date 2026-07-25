"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/app/actions/auth";

async function getOrCreateSavedPlacesCollection(
  supabase: Awaited<ReturnType<typeof requireUserId>>["supabase"],
  userId: string,
) {
  const { data: existing, error: existingError } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", userId)
    .eq("is_system", true)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("collections")
    .insert({ user_id: userId, title: "Saved places", is_system: true })
    .select("id")
    .single();
  if (createError || !created) throw createError ?? new Error("Unable to create Saved places.");
  return created;
}

async function getPlaceId(
  supabase: Awaited<ReturnType<typeof requireUserId>>["supabase"],
  placeSlug: string,
) {
  const { data: place, error } = await supabase.from("places").select("id").eq("slug", placeSlug).single();
  if (error || !place) throw new Error("Place not found.");
  return place.id;
}

export async function createCollection(title: string) {
  const cleanTitle = title.trim();
  if (!cleanTitle || cleanTitle.length > 80) throw new Error("Collection titles must be between 1 and 80 characters.");

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("collections").insert({ user_id: userId, title: cleanTitle });
  if (error) throw error;
  revalidatePath("/collections");
}

export async function savePlace(placeSlug: string) {
  const { supabase, userId } = await requireUserId();
  const [placeId, collection] = await Promise.all([getPlaceId(supabase, placeSlug), getOrCreateSavedPlacesCollection(supabase, userId)]);

  const { error } = await supabase.from("collection_items").upsert(
    { collection_id: collection.id, place_id: placeId },
    { onConflict: "collection_id,place_id" },
  );
  if (error) throw error;
  revalidatePath("/collections");
}

export async function renameCollection(collectionId: string, title: string) {
  const cleanTitle = title.trim();
  if (!cleanTitle || cleanTitle.length > 80) throw new Error("Collection titles must be between 1 and 80 characters.");

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("collections")
    .update({ title: cleanTitle })
    .eq("id", collectionId)
    .eq("user_id", userId)
    .eq("is_system", false);
  if (error) throw error;
  revalidatePath("/collections");
}

export async function deleteCollection(collectionId: string) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", userId)
    .eq("is_system", false);
  if (error) throw error;
  revalidatePath("/collections");
}

export async function addPlaceToCollection(collectionId: string, placeId: string) {
  const { supabase, userId } = await requireUserId();
  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .eq("is_system", false)
    .maybeSingle();
  if (collectionError || !collection) throw new Error("Collection not found.");

  const savedPlaces = await getOrCreateSavedPlacesCollection(supabase, userId);
  const { error } = await supabase.from("collection_items").upsert(
    [
      { collection_id: savedPlaces.id, place_id: placeId },
      { collection_id: collection.id, place_id: placeId },
    ],
    { onConflict: "collection_id,place_id" },
  );
  if (error) throw error;
  revalidatePath("/collections");
}

export async function removePlaceFromCollection(collectionId: string, placeId: string) {
  const { supabase, userId } = await requireUserId();
  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .eq("is_system", false)
    .maybeSingle();
  if (collectionError || !collection) throw new Error("Collection not found.");

  const { error } = await supabase.from("collection_items").delete().eq("collection_id", collection.id).eq("place_id", placeId);
  if (error) throw error;
  revalidatePath("/collections");
}

export async function unsavePlace(placeSlug: string) {
  const { supabase, userId } = await requireUserId();
  const placeId = await getPlaceId(supabase, placeSlug);

  const { data: collections, error: collectionError } = await supabase.from("collections").select("id").eq("user_id", userId);
  if (collectionError) throw collectionError;
  if (!collections?.length) return;

  const { error } = await supabase.from("collection_items").delete().in("collection_id", collections.map((collection) => collection.id)).eq("place_id", placeId);
  if (error) throw error;
  revalidatePath("/collections");
}
