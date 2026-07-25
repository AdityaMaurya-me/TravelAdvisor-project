"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/app/actions/auth";

export async function createCommunityTip(placeId: string, content: string) {
  const cleanContent = content.trim();
  if (!placeId || !cleanContent || cleanContent.length > 1000) throw new Error("Enter a tip between 1 and 1000 characters.");

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("community_tips").insert({ user_id: userId, place_id: placeId, tip_type: "hidden_place", content: cleanContent });
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
  const { error } = await supabase.from("community_tips").delete().eq("id", tipId).eq("user_id", userId);
  if (error) throw error;
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
  const { error } = await supabase
    .from("community_tip_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);
  if (error) throw error;
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
