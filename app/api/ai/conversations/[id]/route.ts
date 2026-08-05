import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage chat history." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { title?: unknown };
  if (typeof body.title !== "string" || !body.title.trim()) return NextResponse.json({ error: "Enter a chat name." }, { status: 400 });
  const { error } = await (supabase as any).from("ai_conversations").update({ title: body.title.trim().slice(0, 120), updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage chat history." }, { status: 401 });
  const { error } = await (supabase as any).from("ai_conversations").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ ok: true });
}
