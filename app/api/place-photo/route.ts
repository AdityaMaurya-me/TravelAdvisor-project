import { NextRequest, NextResponse } from "next/server";

type UnsplashPhoto = {
  urls?: { regular?: string };
  user?: { name?: string };
};

const ONE_WEEK = 60 * 60 * 24 * 7;
const ONE_MONTH = 60 * 60 * 24 * 30;

/**
 * Searches Unsplash from the server so the access key is never exposed in
 * browser JavaScript. Responses are cached both by Next and by the CDN so a
 * card does not consume a new API request every time it is displayed.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!query || query.length > 120 || !accessKey) {
    return NextResponse.json({ photo: null });
  }

  const params = new URLSearchParams({
    query,
    orientation: "landscape",
    content_filter: "high",
    per_page: "1",
  });

  try {
    const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      next: { revalidate: ONE_MONTH },
    });

    if (!response.ok) {
      return NextResponse.json({ photo: null }, { status: 200 });
    }

    const data = await response.json() as { results?: UnsplashPhoto[] };
    const photo = data.results?.[0];
    const url = photo?.urls?.regular;

    return NextResponse.json(
      {
        photo: url
          ? {
              url,
              photographer: photo?.user?.name ?? "Unsplash contributor",
            }
          : null,
      },
      { headers: { "Cache-Control": `public, s-maxage=${ONE_WEEK}, stale-while-revalidate=${ONE_MONTH}` } }
    );
  } catch {
    // A missing network connection or exhausted Unsplash quota should never
    // prevent the place card from rendering its saved fallback image.
    return NextResponse.json({ photo: null }, { status: 200 });
  }
}
