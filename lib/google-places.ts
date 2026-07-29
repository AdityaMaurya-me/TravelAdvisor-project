export type GooglePlace = {
  id: string;
  name: string;
  address: string;
  primaryType?: string;
  latitude: number;
  longitude: number;
  googleMapsUri?: string;
};

export type GooglePlaceDetail = GooglePlace & {
  rating?: number;
  userRatingCount?: number;
  openingHours?: string[];
};

const fields = "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.googleMapsUri";

function toGooglePlace(place: any): GooglePlace | null {
  const latitude = Number(place?.location?.latitude);
  const longitude = Number(place?.location?.longitude);
  if (!place?.id || !place?.displayName?.text || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { id: place.id, name: place.displayName.text, address: place.formattedAddress || "", primaryType: place.primaryType || undefined, latitude, longitude, googleMapsUri: place.googleMapsUri || undefined };
}

function toGooglePlaceDetail(place: any): GooglePlaceDetail | null {
  const base = toGooglePlace(place);
  if (!base) return null;
  const rating = Number(place?.rating);
  return {
    ...base,
    rating: Number.isFinite(rating) ? rating : undefined,
    userRatingCount: Number.isFinite(Number(place?.userRatingCount)) ? Number(place.userRatingCount) : undefined,
    openingHours: Array.isArray(place?.regularOpeningHours?.weekdayDescriptions)
      ? place.regularOpeningHours.weekdayDescriptions.filter((item: unknown): item is string => typeof item === "string")
      : undefined,
  };
}

export function hasGooglePlaces() {
  return Boolean(process.env.GOOGLE_MAPS_DEMO_API_KEY);
}

export async function searchGooglePlaces(textQuery: string, limit = 8): Promise<GooglePlace[]> {
  const apiKey = process.env.GOOGLE_MAPS_DEMO_API_KEY;
  const query = textQuery.trim();
  if (!apiKey || query.length < 2) return [];
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": fields, "Content-Type": "application/json" },
      body: JSON.stringify({ textQuery: query, languageCode: "en", pageSize: Math.min(Math.max(limit, 1), 20) }),
      cache: "no-store",
    });
    if (!response.ok) return [];
    const body = await response.json() as { places?: unknown[] };
    return (body.places ?? []).flatMap((place) => {
      const parsedPlace = toGooglePlace(place);
      return parsedPlace ? [parsedPlace] : [];
    });
  } catch {
    return [];
  }
}

export async function getGooglePlaceById(placeId: string): Promise<GooglePlaceDetail | null> {
  const apiKey = process.env.GOOGLE_MAPS_DEMO_API_KEY;
  if (!apiKey || !/^[A-Za-z0-9_-]{8,200}$/.test(placeId)) return null;

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,primaryType,googleMapsUri,rating,userRatingCount,regularOpeningHours",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return toGooglePlaceDetail(await response.json());
  } catch {
    return null;
  }
}
