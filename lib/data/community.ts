import { createClient } from "@/lib/supabase/server";

export async function getCommunityTipInteractions(tipId: string) {
  const supabase = await createClient();
  const [{ count: voteCount, error: voteError }, { data: comments, error: commentError }] = await Promise.all([
    supabase.from("community_tip_votes").select("*", { count: "exact", head: true }).eq("tip_id", tipId),
    supabase.from("community_tip_comments").select("id, content, user_id, created_at").eq("tip_id", tipId).order("created_at"),
  ]);

  if (voteError) throw voteError;
  if (commentError) throw commentError;
  return { voteCount: voteCount ?? 0, comments };
}
