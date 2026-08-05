import { NextRequest, NextResponse } from "next/server";

import { allowRequest } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };
type CataloguePlace = { slug: string; name: string; level: "city" | "attraction"; city: string | null; state: string | null; country: string | null; description: string | null; cover_image: string | null; rating: number | null; review_count: number | null; opening_hours: string | null; entry_fee: string | null };
type AssistantPayload = { answer?: unknown; placeSlugs?: unknown };

const SEARCH_STOP_WORDS = new Set([
  "a", "an", "and", "are", "at", "be", "best", "can", "for", "from", "give", "i", "in", "is", "it", "me", "my", "near", "of", "on", "or", "plan", "please", "recommend", "show", "suggest", "the", "to", "trip", "what", "which", "with", "you",
]);

function asMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((message) => {
    if (!message || typeof message !== "object") return [];
    const record = message as Record<string, unknown>;
    if ((record.role !== "user" && record.role !== "assistant") || typeof record.content !== "string") return [];
    const content = record.content.trim().slice(0, 2_000);
    return content ? [{ role: record.role, content }] : [];
  }).slice(-8);
}

function placeContext(places: CataloguePlace[]) {
  return places.map((place) => {
    const location = [place.city, place.state, place.country].filter((part) => typeof part === "string" && part.trim()).join(", ");
    const description = typeof place.description === "string" ? place.description.replace(/\s+/g, " ").slice(0, 240) : "";
    const practical = [place.opening_hours ? `hours: ${place.opening_hours}` : "", place.entry_fee ? `entry: ${place.entry_fee}` : "", place.rating ? `rating: ${place.rating}${place.review_count ? ` (${place.review_count} reviews)` : ""}` : ""].filter(Boolean).join("; ");
    return `- ${place.name} (${place.level}; ${location || "India"}; slug: ${place.slug})${description ? ` - ${description}` : ""}${practical ? ` [${practical}]` : ""}`;
  }).join("\n");
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function searchTerms(value: string) {
  return [...new Set(
    normalizeSearchText(value)
      .match(/[a-z0-9]{2,}/g)
      ?.flatMap((term) => term.length > 4 && term.endsWith("s") ? [term, term.slice(0, -1)] : [term])
      .filter((term) => !SEARCH_STOP_WORDS.has(term)) ?? [],
  )];
}

function retrieveRelevantPlaces(catalogue: CataloguePlace[], messages: ChatMessage[]) {
  // Prioritise the latest question, while preserving the traveller's destination
  // context from earlier messages when the latest prompt is a short follow-up.
  const query = messages
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => message.content)
    .join(" ");
  const normalizedQuery = normalizeSearchText(query);
  const terms = searchTerms(query);

  const ranked = catalogue
    .map((place) => {
      const title = normalizeSearchText(place.name);
      const location = normalizeSearchText([place.city, place.state, place.country].filter(Boolean).join(" "));
      const details = normalizeSearchText(place.description ?? "");
      let score = 0;

      for (const term of terms) {
        if (title.includes(term)) score += 28;
        if (location.includes(term)) score += 20;
        if (details.includes(term)) score += 6;
      }
      if (terms.length > 1 && title.includes(normalizedQuery)) score += 80;
      if (place.level === "city" && terms.some((term) => title.includes(term))) score += 12;

      return { place, score };
    })
    .sort((left, right) => right.score - left.score || left.place.name.localeCompare(right.place.name));

  const matches = ranked.filter((row) => row.score > 0).slice(0, 12).map((row) => row.place);
  if (matches.length) return { places: matches, hasDirectMatch: true };

  // A small country-level fallback lets the assistant explain catalogue coverage
  // without sending an unrelated full catalogue to the model.
  return {
    places: catalogue.filter((place) => place.level === "city").slice(0, 8),
    hasDirectMatch: false,
  };
}

function extractJson(text: string): AssistantPayload | null {
  try { return JSON.parse(text) as AssistantPayload; } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]) as AssistantPayload; } catch { return null; }
  }
}

export async function POST(request: NextRequest) {
  if (!allowRequest(request, "travel-ai", 12)) return NextResponse.json({ error: "Too many assistant requests. Please wait a minute and try again." }, { status: 429 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "The AI assistant is not configured yet. Add a Gemini Developer API key and restart the app." }, { status: 503 });

  let payload: { messages?: unknown; conversationId?: unknown };
  try { payload = await request.json() as { messages?: unknown; conversationId?: unknown }; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const messages = asMessages(payload.messages);
  if (!messages.length || messages.at(-1)?.role !== "user") return NextResponse.json({ error: "Send a travel question to the assistant." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const conversationId = typeof payload.conversationId === "string" ? payload.conversationId : null;
  if (conversationId && user) {
    const { data: conversation } = await (supabase as any).from("ai_conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
    if (!conversation) return NextResponse.json({ error: "This chat is no longer available." }, { status: 404 });
  }
  const { data: places } = await supabase
    .from("places")
    .select("slug, name, level, city, state, country, description, cover_image, rating, review_count, opening_hours, entry_fee")
    .eq("is_published", true)
    .eq("is_external", false)
    .in("level", ["city", "attraction"])
    .order("name")
    .limit(80);
  const catalogue = (places ?? []) as CataloguePlace[];
  const retrieval = retrieveRelevantPlaces(catalogue, messages);
  const instructions = `You are TravelAdvisor's helpful India travel-planning assistant. Use the retrieved TravelAdvisor catalogue below as your factual source. Give a self-contained answer that directly solves the traveller's question, then offer a concise itinerary or next steps when useful. Never invent opening hours, ticket prices, road distances, ratings, weather, availability, bookings, transport, or access conditions. If the catalogue does not establish a fact, say that it needs checking. Do not tell the traveller to browse the website to get the answer. Do not claim that you saved, booked, contacted, or changed anything for the user. Keep answers under 350 words.\n\nReturn valid JSON only in this exact shape: {"answer":"self-contained helpful answer","placeSlugs":["up to four exact retrieved catalogue slugs"]}. Use placeSlugs only for places genuinely recommended in your answer, and only exact slugs from the retrieved catalogue.${retrieval.hasDirectMatch ? "" : " The traveller's wording did not directly match the catalogue, so do not force an unrelated recommendation."}\n\nRetrieved TravelAdvisor catalogue:\n${placeContext(retrieval.places)}\n\nConversation:\n${messages.map((message) => `${message.role === "user" ? "Traveller" : "Assistant"}: ${message.content}`).join("\n")}`;

  try {
    // Free-tier demand can spike. Start with the lower-latency Flash-Lite
    // model and only try a second free model when Gemini reports capacity.
    const preferredModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
    const models = [...new Set([preferredModel, "gemini-3.5-flash-lite"])];
    let response: Response | null = null;
    for (const model of models) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: instructions }] },
          contents: messages.map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
          generationConfig: { maxOutputTokens: 900, temperature: 0.35, responseMimeType: "application/json" },
        }),
        cache: "no-store",
      });
      if (response.ok || (response.status !== 429 && response.status !== 503)) break;
    }
    if (!response) return NextResponse.json({ error: "The assistant could not be reached. Please try again shortly." }, { status: 502 });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      console.error("Gemini travel assistant request failed", response.status, body?.error?.message);
      const detail = process.env.NODE_ENV === "development" ? body?.error?.message : undefined;
      return NextResponse.json({ error: detail || "The assistant is temporarily unavailable. Please try again shortly." }, { status: 502 });
    }
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const output = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
    const parsed = extractJson(output);
    const answer = typeof parsed?.answer === "string" ? parsed.answer.trim() : output;
    if (!answer) return NextResponse.json({ error: "The assistant did not return an answer. Please try again." }, { status: 502 });
    const validSlugs = new Set(retrieval.places.map((place) => place.slug));
    const requestedSlugs = Array.isArray(parsed?.placeSlugs) ? parsed.placeSlugs.filter((slug): slug is string => typeof slug === "string" && validSlugs.has(slug)).slice(0, 4) : [];
    const cards = requestedSlugs.flatMap((slug) => {
      const place = retrieval.places.find((item) => item.slug === slug);
      if (!place) return [];
      return [{ slug: place.slug, title: place.name, href: place.level === "city" ? `/destination/${place.slug}` : `/place/${place.slug}`, location: [place.city, place.state].filter(Boolean).join(", ") || "India", image: place.cover_image || "/placeholder.jpg", description: place.description?.slice(0, 140) || null, type: place.level === "city" ? "Destination" : "Place" }];
    });
    if (conversationId && user) {
      const lastUserMessage = messages.at(-1)!;
      await (supabase as any).from("ai_messages").insert([
        { conversation_id: conversationId, role: "user", content: lastUserMessage.content },
        { conversation_id: conversationId, role: "assistant", content: answer.slice(0, 4000), cards },
      ]);
      const title = messages.filter((message) => message.role === "user").length === 1 ? lastUserMessage.content.slice(0, 80) : undefined;
      await (supabase as any).from("ai_conversations").update({ ...(title ? { title } : {}), updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", user.id);
    }
    return NextResponse.json({ answer, cards });
  } catch (error) {
    console.error("Gemini travel assistant connection failed", error);
    return NextResponse.json({ error: "The assistant could not be reached. Check your connection and try again." }, { status: 502 });
  }
}
