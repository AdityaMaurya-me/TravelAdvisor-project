import { NextRequest, NextResponse } from "next/server";

import { getGooglePlaceById, searchGooglePlaces } from "@/lib/google-places";

type UnsplashPhoto = {
  urls?: { regular?: string; full?: string };
  user?: { name?: string };
};

type WikimediaResponse = {
  query?: {
    pages?: Record<string, {
      imageinfo?: Array<{
        thumburl?: string;
        extmetadata?: { Artist?: { value?: string } };
      }>;
    }>;
  };
};

const ONE_WEEK = 60 * 60 * 24 * 7;
const ONE_MONTH = 60 * 60 * 24 * 30;

function plainText(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, "").trim();
}

function validPhotoName(name: string) {
  return /^places\/[A-Za-z0-9_-]{8,200}\/photos\/[A-Za-z0-9_-]{8,500}$/.test(name);
}

async function redirectToGooglePhoto(photoName: string, apiKey: string) {
  const parameters = new URLSearchParams({
    key: apiKey,
    // 1920px preserves detail for desktop heroes and 2x-density displays.
    // The browser only downloads it for a live photo; curated images still go
    // through Next's responsive optimizer.
    maxWidthPx: "1920",
    skipHttpRedirect: "true",
  });
  const response = await fetch(`https://places.googleapis.com/v1/${photoName}/media?${parameters}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body = await response.json() as { photoUri?: string };
  if (!body.photoUri || !body.photoUri.startsWith("https://")) return null;
  return body.photoUri;
}

/**
 * Fetches a currently-listed Google Places photo when a Google key is present.
 * The image itself is never stored or cached by TravelAdvisor; this route only
 * redirects the browser to the short-lived media URL returned by Google.
 */
export async function GET(request: NextRequest) {
  const googlePhotoName = request.nextUrl.searchParams.get("googlePhoto");
  const skipGoogle = request.nextUrl.searchParams.get("skipGoogle") === "1";
  const googleApiKey = process.env.GOOGLE_MAPS_DEMO_API_KEY;

  if (googlePhotoName && googleApiKey && validPhotoName(googlePhotoName)) {
    try {
      const photoUri = await redirectToGooglePhoto(googlePhotoName, googleApiKey);
      if (photoUri) {
        return NextResponse.redirect(photoUri, {
          status: 307,
          headers: { "Cache-Control": "private, no-store" },
        });
      }
    } catch {
      // Continue to the regular fallback response below.
    }
    return NextResponse.json({ photo: null });
  }

  const query = request.nextUrl.searchParams.get("query")?.trim();
  if (!query || query.length > 160) return NextResponse.json({ photo: null });

  if (googleApiKey && !skipGoogle) {
    try {
      const matchedPlace = (await searchGooglePlaces(query, 1))[0];
      const place = matchedPlace ? await getGooglePlaceById(matchedPlace.id) : null;
      if (place?.photo?.name && validPhotoName(place.photo.name)) {
        return NextResponse.json({
          photo: {
            url: `/api/place-photo?googlePhoto=${encodeURIComponent(place.photo.name)}`,
            photographer: place.photo.authorName ?? "Google Maps contributor",
            source: "Google Maps",
          },
        }, { headers: { "Cache-Control": "private, no-store" } });
      }
    } catch {
      // Fall through to Unsplash only when Google is unavailable.
    }
  }

  // Wikimedia's broad file search can return a technically matching but
  // unrelated image (for example an animal photographed in a destination).
  // Prefer the place-specific Google result, then Unsplash's contextual
  // search. Wikimedia remains the last fallback when those providers have no
  // usable image.
  const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (unsplashAccessKey) {
    const parameters = new URLSearchParams({
      query: `${query} travel`,
      orientation: "landscape",
      content_filter: "high",
      per_page: "1",
    });

    try {
      const response = await fetch(`https://api.unsplash.com/search/photos?${parameters}`, {
        headers: {
          Authorization: `Client-ID ${unsplashAccessKey}`,
          "Accept-Version": "v1",
        },
        next: { revalidate: ONE_MONTH },
      });
      if (response.ok) {
        const body = await response.json() as { results?: UnsplashPhoto[] };
        const photo = body.results?.[0];
        const photoUrl = photo?.urls?.full ?? photo?.urls?.regular;
        if (photoUrl) {
          // Request an appropriately detailed original from Unsplash instead
          // of making a high-density hero download the full camera file.
          const optimizedPhotoUrl = new URL(photoUrl);
          optimizedPhotoUrl.searchParams.set("auto", "format");
          optimizedPhotoUrl.searchParams.set("fit", "crop");
          optimizedPhotoUrl.searchParams.set("w", "1920");
          optimizedPhotoUrl.searchParams.set("q", "85");
          return NextResponse.json({
            photo: {
              url: optimizedPhotoUrl.toString(),
              photographer: photo?.user?.name ?? "Unsplash contributor",
              source: "Unsplash",
            },
          }, { headers: { "Cache-Control": `public, s-maxage=${ONE_WEEK}, stale-while-revalidate=${ONE_MONTH}` } });
        }
      }
    } catch {
      // A clear no-photo state is safer than a broadly matched, unrelated file.
    }
    // Wikimedia's broad file search can return a geographically related but
    // visually unrelated file. If Unsplash is configured but has no relevant
    // result, let the UI show its explicit verification state instead.
    return NextResponse.json({ photo: null });
  }

  try {
    const parameters = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6",
      gsrlimit: "1",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "1400",
      origin: "*",
    });
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${parameters}`, {
      next: { revalidate: ONE_WEEK },
    });
    if (response.ok) {
      const body = await response.json() as WikimediaResponse;
      const image = Object.values(body.query?.pages ?? {})[0]?.imageinfo?.[0];
      if (image?.thumburl) {
        return NextResponse.json({
          photo: {
            url: image.thumburl,
            photographer: image.extmetadata?.Artist?.value ? plainText(image.extmetadata.Artist.value) : "Wikimedia Commons contributor",
            source: "Wikimedia Commons",
          },
        }, { headers: { "Cache-Control": `public, s-maxage=${ONE_WEEK}, stale-while-revalidate=${ONE_MONTH}` } });
      }
    }
  } catch {
    // Continue to the generic travel-photo fallback below.
  }

  return NextResponse.json({ photo: null });
}
