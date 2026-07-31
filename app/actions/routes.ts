"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/app/actions/auth";

export async function toggleSavedRoute(routeId: string, shouldSave: boolean) {
  const { supabase, userId } = await requireUserId();
  const request = shouldSave
    ? supabase.from("saved_routes").upsert({ user_id: userId, route_id: routeId }, { onConflict: "user_id,route_id" })
    : supabase.from("saved_routes").delete().eq("user_id", userId).eq("route_id", routeId);
  const { error } = await request;
  if (error) throw error;
  revalidatePath("/collections");
}

export async function getSavedRouteStatus(routeId: string) {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase.from("saved_routes").select("route_id").eq("user_id", userId).eq("route_id", routeId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
