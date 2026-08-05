import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ conversations: [] });
  const { data, error } = await (supabase as any).from("ai_conversations").select("id,title,created_at,updated_at,ai_messages(id,role,content,cards,created_at)").eq("user_id", user.id).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save chat history." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { title?: unknown };
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : "New chat";
  const { data, error } = await (supabase as any).from("ai_conversations").insert({ user_id: user.id, title }).select("id,title,created_at,updated_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversation: { ...data, ai_messages: [] } });
}
