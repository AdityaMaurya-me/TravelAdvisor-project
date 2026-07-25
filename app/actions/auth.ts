"use server";

import { createClient } from "@/lib/supabase/server";

export async function requireUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) throw new Error("You must sign in to continue.");
  return { supabase, userId };
}
