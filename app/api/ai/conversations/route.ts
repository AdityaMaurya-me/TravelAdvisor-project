import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ conversations: [] });

  // Do not rely on PostgREST's inferred nested relation here.  It can return
  // an empty embedded `ai_messages` array when the relationship cache is not
  // refreshed, which made an existing chat appear blank after navigation.
  const { data: conversations, error: conversationError } = await (supabase as any)
    .from("ai_conversations")
    .select("id,title,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (conversationError) {
    return NextResponse.json({ error: conversationError.message }, { status: 500 });
  }

  const conversationIds = (conversations ?? []).map((conversation: { id: string }) => conversation.id);
  const { data: messages, error: messageError } = conversationIds.length
    ? await (supabase as any)
      .from("ai_messages")
      .select("id,conversation_id,role,content,cards,response_data,created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (messageError) {
    return NextResponse.json({ error: messageError.message }, { status: 500 });
  }

  const messagesByConversation = new Map<string, unknown[]>();
  for (const message of messages ?? []) {
    const row = message as { conversation_id: string };
    const current = messagesByConversation.get(row.conversation_id) ?? [];
    current.push(message);
    messagesByConversation.set(row.conversation_id, current);
  }

  return NextResponse.json({
    conversations: (conversations ?? []).map((conversation: { id: string }) => ({
      ...conversation,
      ai_messages: messagesByConversation.get(conversation.id) ?? [],
    })),
  });
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
