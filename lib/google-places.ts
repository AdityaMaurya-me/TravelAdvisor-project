export type GooglePlace = {
  id: string;
  name: string;
  address: string;
  primaryType?: string;
  latitude: number;
  longitude: number;
  googleMapsUri?: string;
};

const fields = "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.googleMapsUri";

function toGooglePlace(place: any): GooglePlace | null {
  const latitude = Number(place?.location?.latitude);
  const longitude = Number(place?.location?.longitude);
  if (!place?.id || !place?.displayName?.text || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { id: place.id, name: place.displayName.text, address: place.formattedAddress || "", primaryType: place.primaryType || undefined, latitude, longitude, googleMapsUri: place.googleMapsUri || undefined };
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
