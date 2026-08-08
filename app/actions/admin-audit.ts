"use server";
import { requireUserId } from "@/app/actions/auth";
import type { Json } from "@/lib/supabase/database.types";

export async function logAdminAction(action: string, targetType: string, targetId?: string, targetLabel?: string, metadata: Json = {}) {
  const { supabase, userId } = await requireUserId();
  const { data: role } = await supabase.from("curator_roles").select("role").eq("user_id", userId).maybeSingle();
  if (role?.role !== "admin") return;
  await supabase.from("admin_activity_logs").insert({ admin_id: userId, action, target_type: targetType, target_id: targetId ?? null, target_label: targetLabel ?? null, metadata });
}
