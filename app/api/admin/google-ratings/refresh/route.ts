import { NextRequest, NextResponse } from "next/server";

import { refreshGoogleRatingCache } from "@/lib/google-rating-cache";
import { allowRequest } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function readBatchSize(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 10;
}

function readPlaceId(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value) ? value : undefined;
}

export async function POST(request: NextRequest) {
  if (!allowRequest(request, "admin-google-rating-refresh", 6, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rating refresh limit reached. Please try again later." }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: role } = await supabase.from("curator_roles").select("role").maybeSingle();
  if (role?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  try {
    const result = await refreshGoogleRatingCache(readBatchSize(body.batchSize), readPlaceId(body.placeId));
    if (result.unavailable) {
      return NextResponse.json({ error: "Server-side Supabase credentials are not configured for rating caching." }, { status: 503 });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Google rating refresh is temporarily unavailable." }, { status: 502 });
  }
}
