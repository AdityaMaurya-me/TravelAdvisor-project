import { NextRequest, NextResponse } from "next/server";

import { allowRequest } from "@/lib/rate-limit";
import { getGooglePlaceById, hasGooglePlaces, searchGooglePlacesWithStatus, type GooglePlaceDetail } from "@/lib/google-places";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };
type CataloguePlace = {
  slug: string;
  name: string;
  level: "city" | "attraction";
  city: string | null;
  state: string | null;
  country: string | null;
  description: string | null;
  cover_image: string | null;
  rating: number | null;
  review_count: number | null;
  opening_hours: string | null;
  entry_fee: string | null;
  destinationSlug: string | null;
  categorySlugs: string[];
};
type AssistantPayload = { answer?: unknown; placeRefs?: unknown; placeSlugs?: unknown };
type AssistantCard = { slug: string; title: string; href: string; location: string; image: string; description: string | null; type: "Destination" | "Place"; source: "TravelAdvisor" | "Google Maps"; googlePhotoName?: string; googlePhotoAuthor?: string };

const SEARCH_STOP_WORDS = new Set([
  "a", "an", "and", "are", "at", "be", "best", "can", "for", "from", "give", "i", "in", "is", "it", "me", "my", "near", "of", "on", "or", "plan", "please", "recommend", "show", "suggest", "the", "to", "trip", "what", "which", "with", "you",
]);

function asMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((message) => {
    if (!message || typeof message !== "object") return [];
    const record = message as Record<string, unknown>;
    const role = record.role;
    if ((role !== "user" && role !== "assistant") || typeof record.content !== "string") return [];
    const content = record.content.trim().slice(0, 2_000);
    return content ? [{ role: role as ChatMessage["role"], content }] : [];
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

const CATEGORY_ALIASES: Record<string, string[]> = {
  cafes: ["cafe", "cafes", "coffee", "bakery", "tea"],
  "local-food": ["food", "restaurant", "restaurants", "meal", "local food", "street food"],
  waterfalls: ["waterfall", "waterfalls"],
  viewpoints: ["viewpoint", "viewpoints", "sunset", "sunrise"],
  temples: ["temple", "temples", "mandir", "church", "mosque"],
  forts: ["fort", "forts"],
  attractions: ["attraction", "attractions", "places to visit", "sightseeing"],
  "photo-spots": ["photo spot", "photo spots", "photography"],
};

type RetrievalContext = { destination?: CataloguePlace; categorySlug?: string; query: string };

function resolveRetrievalContext(catalogue: CataloguePlace[], messages: ChatMessage[]): RetrievalContext {
  const query = messages
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => message.content)
    .join(" ");
  const normalizedQuery = normalizeSearchText(query);
  const destination = catalogue
    .filter((place) => place.level === "city")
    .sort((left, right) => Math.max(right.name.length, right.slug.length) - Math.max(left.name.length, left.slug.length))
    .find((place) => {
      const name = normalizeSearchText(place.name);
      const slug = normalizeSearchText(place.slug.replace(/-/g, " "));
      return normalizedQuery.includes(name) || normalizedQuery.includes(slug);
    });
  const categorySlug = Object.entries(CATEGORY_ALIASES).find(([, aliases]) => aliases.some((alias) => normalizedQuery.includes(alias)))?.[0];
  return { destination, categorySlug, query };
}

function retrieveRelevantPlaces(catalogue: CataloguePlace[], messages: ChatMessage[]) {
  const context = resolveRetrievalContext(catalogue, messages);
  const { query, destination, categorySlug } = context;
  const normalizedQuery = normalizeSearchText(query);
  const terms = searchTerms(query);

  // Destination and category words are hard filters: a query such as
  // "cafes in Goa" only gives Gemini Goa attractions tagged as cafes.
  const destinationScoped = destination
    ? catalogue.filter((place) => place.level === "attraction" && place.destinationSlug === destination.slug)
    : catalogue;
  const categoryScoped = categorySlug
    ? destinationScoped.filter((place) => place.categorySlugs.includes(categorySlug))
    : destinationScoped;
  const candidates = categorySlug ? categoryScoped : destinationScoped;

  const ranked = candidates
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
  if (matches.length) return { places: matches, hasDirectMatch: true, context };

  // Do not leak unrelated results if a recognised scope has no published
  // locations yet; the assistant can accurately state the coverage gap.
  if (destination || categorySlug) {
    return { places: categoryScoped.slice(0, 12), hasDirectMatch: Boolean(categoryScoped.length), context };
  }

  // A small country-level fallback lets the assistant explain catalogue coverage
  // without sending an unrelated full catalogue to the model.
  return {
    places: catalogue.filter((place) => place.level === "city").slice(0, 8),
    hasDirectMatch: false,
    context,
  };
}

const LIVE_PLACE_INTENT = /\b(caf(?:e|es)|coffee|bakery|restaurant|food|hotel|stay|bar|pub|shop|market|pharmacy|hospital|petrol|gas|ev charging|parking|open now)\b/i;

function shouldSearchLivePlaces(catalogue: CataloguePlace[], messages: ChatMessage[]) {
  if (!hasGooglePlaces()) return false;
  const question = messages.at(-1)?.content ?? "";
  const terms = searchTerms(question);
  const hasKnownPlaceName = catalogue.some((place) => {
    const name = normalizeSearchText(place.name);
    return terms.some((term) => name.includes(term));
  });

  // Known curated places stay Supabase-first. Venue/category searches and
  // unknown venue names use Google Places to make the assistant broadly useful.
  return LIVE_PLACE_INTENT.test(question) || !hasKnownPlaceName;
}

async function retrieveLiveGooglePlaces(question: string, destinationName?: string) {
  if (!question.trim() || !hasGooglePlaces()) return [] as GooglePlaceDetail[];
  const searchQuery = destinationName && !normalizeSearchText(question).includes(normalizeSearchText(destinationName))
    ? `${question} in ${destinationName}`
    : question;
  const result = await searchGooglePlacesWithStatus(searchQuery, 4);
  if (!result.places.length) return [];
  const details = await Promise.all(result.places.map((place) => getGooglePlaceById(place.id)));
  const resolved = details.filter((place): place is GooglePlaceDetail => Boolean(place));
  if (!destinationName) return resolved;
  const normalizedDestination = normalizeSearchText(destinationName);
  return resolved.filter((place) => {
    const locationText = normalizeSearchText(`${place.name} ${place.address}`);
    return locationText.includes(normalizedDestination);
  });
}

function livePlaceContext(places: GooglePlaceDetail[]) {
  return places.map((place) => {
    const facts = [
      place.primaryType ? `type: ${place.primaryType.replace(/_/g, " ")}` : "",
      place.rating !== undefined ? `Google Maps rating: ${place.rating}${place.userRatingCount ? ` (${place.userRatingCount} ratings)` : ""}` : "",
      place.priceLevel ? `price: ${place.priceLevel.replace(/_/g, " ").toLowerCase()}` : "",
      place.businessStatus ? `status: ${place.businessStatus.replace(/_/g, " ").toLowerCase()}` : "",
      place.openingHours?.length ? `hours: ${place.openingHours.join("; ")}` : "",
    ].filter(Boolean).join("; ");
    return `- ${place.name} (Google Maps live listing; ref: google:${place.id}; ${place.address || "address unavailable"})${facts ? ` [${facts}]` : ""}`;
  }).join("\n");
}

function livePlaceHref(place: GooglePlaceDetail) {
  const params = new URLSearchParams({
    from: "/ai",
    fromLabel: "Back to AI",
    name: place.name,
    address: place.address,
    lat: String(place.latitude),
    lng: String(place.longitude),
  });
  return `/discover/${encodeURIComponent(place.id)}?${params.toString()}`;
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
    .select("slug, name, level, city, state, country, description, cover_image, rating, review_count, opening_hours, entry_fee, parent:parent_id(slug), place_categories(categories(slug))")
    .eq("is_published", true)
    .eq("is_external", false)
    .in("level", ["city", "attraction"])
    .order("name")
    .limit(300);
  const catalogue = (places ?? []).map((place: any): CataloguePlace => ({
    ...place,
    destinationSlug: place.parent?.slug ?? null,
    categorySlugs: (place.place_categories ?? []).flatMap((mapping: any) => typeof mapping.categories?.slug === "string" ? [mapping.categories.slug] : []),
  }));
  const retrieval = retrieveRelevantPlaces(catalogue, messages);
  const livePlaces = shouldSearchLivePlaces(catalogue, messages)
    ? await retrieveLiveGooglePlaces(messages.at(-1)!.content, retrieval.context.destination?.name)
    : [];
  const instructions = `You are TravelAdvisor's helpful India travel-planning assistant. Use only the retrieved sources below as your factual source. Give a self-contained answer that directly solves the traveller's question, then offer a concise itinerary or next steps when useful. Never invent opening hours, ticket prices, road distances, ratings, weather, availability, bookings, transport, or access conditions. If the sources do not establish a fact, say that it needs checking. Do not tell the traveller to browse the website to get the answer. Do not claim that you saved, booked, contacted, or changed anything for the user. Keep answers under 350 words. Curated TravelAdvisor places are verified project data. Google Maps live listings may change, so say “Google Maps lists” or “live Google Maps data” when using their factual details and never call them TravelAdvisor-verified.\n\nReturn valid JSON only in this exact shape: {"answer":"self-contained helpful answer","placeRefs":["up to four exact source references"]}. Use placeRefs only for places genuinely recommended in your answer. A curated reference is its slug. A live Google reference starts with google:.${retrieval.hasDirectMatch || livePlaces.length ? "" : " The traveller's wording did not directly match available sources, so do not force an unrelated recommendation."}\n\nRetrieved TravelAdvisor catalogue:\n${placeContext(retrieval.places)}\n\nRetrieved live Google Maps listings:\n${livePlaces.length ? livePlaceContext(livePlaces) : "None."}\n\nConversation:\n${messages.map((message) => `${message.role === "user" ? "Traveller" : "Assistant"}: ${message.content}`).join("\n")}`;

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
    const curatedRefs = new Set(retrieval.places.map((place) => place.slug));
    const liveRefs = new Set(livePlaces.map((place) => `google:${place.id}`));
    const candidateRefs = Array.isArray(parsed?.placeRefs) ? parsed.placeRefs : parsed?.placeSlugs;
    const requestedRefs = Array.isArray(candidateRefs)
      ? candidateRefs.filter((ref): ref is string => typeof ref === "string" && (curatedRefs.has(ref) || liveRefs.has(ref))).slice(0, 4)
      : [];
    const cards: AssistantCard[] = requestedRefs.flatMap((ref): AssistantCard[] => {
      const place = retrieval.places.find((item) => item.slug === ref);
      if (place) return [{ slug: place.slug, title: place.name, href: place.level === "city" ? `/destination/${place.slug}` : `/place/${place.slug}`, location: [place.city, place.state].filter(Boolean).join(", ") || "India", image: place.cover_image || "/placeholder.jpg", description: place.description?.slice(0, 140) || null, type: place.level === "city" ? "Destination" : "Place", source: "TravelAdvisor" as const }];
      const livePlace = livePlaces.find((item) => `google:${item.id}` === ref);
      if (!livePlace) return [];
      return [{
        slug: `google-${livePlace.id}`,
        title: livePlace.name,
        href: livePlaceHref(livePlace),
        location: livePlace.address || "Google Maps place",
        image: "/placeholder.jpg",
        description: [livePlace.primaryType?.replace(/_/g, " "), livePlace.rating !== undefined ? `Google Maps ${livePlace.rating.toFixed(1)}` : null, livePlace.priceLevel?.replace(/_/g, " ").toLowerCase()].filter(Boolean).join(" · ") || null,
        type: "Place" as const,
        source: "Google Maps" as const,
        googlePhotoName: livePlace.photo?.name,
        googlePhotoAuthor: livePlace.photo?.authorName,
      }];
    });
    let historyWarning: string | undefined;
    if (conversationId && user) {
      const lastUserMessage = messages.at(-1)!;
      const { error: messageError } = await (supabase as any).from("ai_messages").insert([
        // Keep every row structurally identical in this bulk insert. If the
        // user row omits cards while the assistant row includes it, PostgREST
        // sends NULL for the user row and violates ai_messages.cards NOT NULL.
        { conversation_id: conversationId, role: "user", content: lastUserMessage.content, cards: [] },
        { conversation_id: conversationId, role: "assistant", content: answer.slice(0, 4000), cards },
      ]);
      const title = messages.filter((message) => message.role === "user").length === 1 ? lastUserMessage.content.slice(0, 80) : undefined;
      const { error: conversationError } = await (supabase as any)
        .from("ai_conversations")
        .update({ ...(title ? { title } : {}), updated_at: new Date().toISOString() })
        .eq("id", conversationId)
        .eq("user_id", user.id);

      if (messageError || conversationError) {
        console.error("Unable to save AI chat history", { messageError, conversationError });
        historyWarning = "This answer is visible now, but it could not be saved to chat history.";
      }
    }
    return NextResponse.json({ answer, cards, historyWarning });
  } catch (error) {
    console.error("Gemini travel assistant connection failed", error);
    return NextResponse.json({ error: "The assistant could not be reached. Check your connection and try again." }, { status: 502 });
  }
}
