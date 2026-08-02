"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/app/actions/auth";
import { logAdminAction } from "@/app/actions/admin-audit";

async function canModerateCommunityContent(supabase: Awaited<ReturnType<typeof requireUserId>>["supabase"], userId: string) {
  const { data, error } = await supabase
    .from("curator_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.role === "admin";
}

export async function createCommunityTip(placeId: string, content: string, rating?: number | null, imageUrl?: string | null) {
  const cleanContent = content.trim();
  if (!placeId || !cleanContent || cleanContent.length > 1000) throw new Error("Enter a tip between 1 and 1000 characters.");
  if (rating !== undefined && rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) throw new Error("Choose a rating from 1 to 5 stars.");
  if (imageUrl && (imageUrl.length > 1000 || !/^https:\/\//.test(imageUrl))) throw new Error("The review photo URL is invalid.");

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("community_tips").insert({ user_id: userId, place_id: placeId, tip_type: "hidden_place", content: cleanContent, rating: rating ?? null, image_url: imageUrl ?? null });
  if (error) throw error;
  revalidatePath("/community");
}

export async function updateCommunityTip(tipId: string, content: string) {
  const cleanContent = content.trim();
  if (!tipId || !cleanContent || cleanContent.length > 1000) throw new Error("Enter a tip between 1 and 1000 characters.");
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("community_tips").update({ content: cleanContent }).eq("id", tipId).eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/community");
}

export async function deleteCommunityTip(tipId: string) {
  const { supabase, userId } = await requireUserId();
  const isAdmin = await canModerateCommunityContent(supabase, userId);
  let request = supabase.from("community_tips").delete().eq("id", tipId);
  if (!isAdmin) request = request.eq("user_id", userId);
  const { error } = await request;
  if (error) throw error;
  if (isAdmin) await logAdminAction("delete_community_tip", "community_tip", tipId);
  revalidatePath("/community");
}

export async function reportCommunityTip(tipId: string, reason: string) {
  const cleanReason = reason.trim();
  if (!tipId || !cleanReason || cleanReason.length > 1000) throw new Error("Enter a report reason between 1 and 1000 characters.");

  const { supabase, userId } = await requireUserId();
  const { data: tip, error: tipError } = await supabase
    .from("community_tips")
    .select("user_id")
    .eq("id", tipId)
    .maybeSingle();
  if (tipError || !tip) throw new Error("Community post not found.");
  if (tip.user_id === userId) throw new Error("You cannot report your own post.");

  const { error } = await (supabase as any)
    .from("community_tip_reports")
    .upsert({ tip_id: tipId, reporter_id: userId, reason: cleanReason }, { onConflict: "tip_id,reporter_id" });
  if (error) throw error;
  revalidatePath("/community");
}

export async function createTipComment(tipId: string, content: string) {
  const cleanContent = content.trim();
  if (!tipId || !cleanContent || cleanContent.length > 1000) throw new Error("Enter a comment between 1 and 1000 characters.");

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("community_tip_comments").insert({ tip_id: tipId, user_id: userId, content: cleanContent });
  if (error) throw error;
  revalidatePath("/community");
}

export async function updateTipComment(commentId: string, content: string) {
  const cleanContent = content.trim();
  if (!commentId || !cleanContent || cleanContent.length > 1000) throw new Error("Enter a comment between 1 and 1000 characters.");

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("community_tip_comments")
    .update({ content: cleanContent })
    .eq("id", commentId)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/community");
}

export async function deleteTipComment(commentId: string) {
  const { supabase, userId } = await requireUserId();
  const isAdmin = await canModerateCommunityContent(supabase, userId);
  let request = supabase.from("community_tip_comments").delete().eq("id", commentId);
  if (!isAdmin) request = request.eq("user_id", userId);
  const { error } = await request;
  if (error) throw error;
  if (isAdmin) await logAdminAction("delete_community_comment", "community_tip_comment", commentId);
  revalidatePath("/community");
}

export async function reportTipComment(commentId: string, reason: string) {
  const { supabase, userId } = await requireUserId();
  const { data: comment, error: commentError } = await supabase
    .from("community_tip_comments")
    .select("user_id")
    .eq("id", commentId)
    .maybeSingle();
  if (commentError || !comment) throw new Error("Comment not found.");
  if (comment.user_id === userId) throw new Error("You cannot report your own comment.");

  const { error } = await supabase
    .from("community_comment_reports")
    .upsert({ comment_id: commentId, reporter_id: userId, reason: reason.trim() || "Reported by a community member" }, { onConflict: "comment_id,reporter_id" });
  if (error) throw error;
  revalidatePath("/community");
}

export async function toggleTipVote(tipId: string, shouldVote: boolean) {
  const { supabase, userId } = await requireUserId();
  const request = shouldVote
    ? supabase.from("community_tip_votes").upsert({ tip_id: tipId, user_id: userId }, { onConflict: "tip_id,user_id" })
    : supabase.from("community_tip_votes").delete().eq("tip_id", tipId).eq("user_id", userId);
  const { error } = await request;
  if (error) throw error;
  revalidatePath("/community");
}
