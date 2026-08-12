export type GooglePlace = {
  id: string;
  name: string;
  address: string;
  primaryType?: string;
  types?: string[];
  photo?: { name: string; authorName?: string };
  latitude: number;
  longitude: number;
  googleMapsUri?: string;
};

export type GooglePlaceDetail = GooglePlace & {
  rating?: number;
  userRatingCount?: number;
  openingHours?: string[];
  websiteUri?: string;
  phoneNumber?: string;
  priceLevel?: string;
  businessStatus?: string;
};

export type GooglePlaceSearchResponse = {
  places: GooglePlace[];
  unavailableReason?: "not_configured" | "quota_exhausted" | "provider_error";
};

const fields = "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.photos,places.googleMapsUri";
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const searchCache = new Map<string, { expiresAt: number; result: GooglePlaceSearchResponse }>();
const DETAIL_CACHE_TTL_MS = 10 * 60 * 1000;
const detailCache = new Map<string, { expiresAt: number; place: GooglePlaceDetail | null }>();

function toGooglePlace(place: any): GooglePlace | null {
  const latitude = Number(place?.location?.latitude);
  const longitude = Number(place?.location?.longitude);
  if (!place?.id || !place?.displayName?.text || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const photo = Array.isArray(place?.photos) ? place.photos[0] : null;
  return {
    id: place.id,
    name: place.displayName.text,
    address: place.formattedAddress || "",
    primaryType: place.primaryType || undefined,
    types: Array.isArray(place.types) ? place.types.filter((type: unknown): type is string => typeof type === "string") : undefined,
    photo: typeof photo?.name === "string" ? { name: photo.name, authorName: typeof photo.authorAttributions?.[0]?.displayName === "string" ? photo.authorAttributions[0].displayName : undefined } : undefined,
    latitude,
    longitude,
    googleMapsUri: place.googleMapsUri || undefined,
  };
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
    websiteUri: typeof place?.websiteUri === "string" ? place.websiteUri : undefined,
    phoneNumber: typeof place?.nationalPhoneNumber === "string" ? place.nationalPhoneNumber : undefined,
    priceLevel: typeof place?.priceLevel === "string" ? place.priceLevel : undefined,
    businessStatus: typeof place?.businessStatus === "string" ? place.businessStatus : undefined,
  };
}

const DESTINATION_TYPES = new Set([
  "administrative_area_level_1",
  "administrative_area_level_2",
  "country",
  "locality",
  "postal_town",
  "sublocality",
  "neighborhood",
]);

/** True for a geographic area that should open an explorer page, not a single venue. */
export function isGoogleDestinationPlace(place: Pick<GooglePlace, "primaryType" | "types">) {
  return [place.primaryType, ...(place.types ?? [])].some((type) => type ? DESTINATION_TYPES.has(type) : false);
}

export const LIVE_DESTINATION_CATEGORIES = [
  { id: "attractions", title: "Attractions", query: "attractions" },
  { id: "cafes", title: "Cafés", query: "cafes" },
  { id: "local-food", title: "Local food", query: "local food" },
  { id: "nature", title: "Nature", query: "nature spots" },
] as const;

export function countLiveDestinationCategories(places: GooglePlace[]) {
  return LIVE_DESTINATION_CATEGORIES.map((category) => ({
    ...category,
    count: places.filter((place) => {
      const searchable = `${place.name} ${place.primaryType ?? ""} ${(place.types ?? []).join(" ")}`.toLowerCase();
      if (category.id === "cafes") return /cafe|coffee|bakery|tea|restaurant/.test(searchable);
      if (category.id === "local-food") return /restaurant|food|meal|market|bakery|tea/.test(searchable);
      if (category.id === "nature") return /waterfall|park|beach|lake|garden|mountain|forest|nature|viewpoint/.test(searchable);
      return !/cafe|coffee|bakery|tea|restaurant|food|meal|market/.test(searchable);
    }).length,
  }));
}

/** One contextual request keeps a live destination page useful without making a request per category. */
export async function getGoogleDestinationPlaces(destinationName: string, limit = 12) {
  return searchGooglePlaces(`places to visit in ${destinationName}`, limit);
}

export function hasGooglePlaces() {
  return Boolean(process.env.GOOGLE_MAPS_DEMO_API_KEY);
}

export async function searchGooglePlaces(textQuery: string, limit = 8): Promise<GooglePlace[]> {
  return (await searchGooglePlacesWithStatus(textQuery, limit)).places;
}

export async function searchGooglePlacesWithStatus(textQuery: string, limit = 8): Promise<GooglePlaceSearchResponse> {
  const apiKey = process.env.GOOGLE_MAPS_DEMO_API_KEY;
  const query = textQuery.trim();
  if (!apiKey) return { places: [], unavailableReason: "not_configured" };
  if (query.length < 2) return { places: [] };
  const cacheKey = `${query.toLocaleLowerCase()}::${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": fields, "Content-Type": "application/json" },
      body: JSON.stringify({ textQuery: query, languageCode: "en", pageSize: Math.min(Math.max(limit, 1), 20) }),
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: { status?: string } } | null;
      const result: GooglePlaceSearchResponse = {
        places: [],
        unavailableReason: response.status === 429 || body?.error?.status === "RESOURCE_EXHAUSTED" ? "quota_exhausted" : "provider_error",
      };
      searchCache.set(cacheKey, { expiresAt: Date.now() + 30_000, result });
      return result;
    }
    const body = await response.json() as { places?: unknown[] };
    const result: GooglePlaceSearchResponse = { places: (body.places ?? []).flatMap((place) => {
      const parsedPlace = toGooglePlace(place);
      return parsedPlace ? [parsedPlace] : [];
    }) };
    searchCache.set(cacheKey, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, result });
    return result;
  } catch {
    return { places: [], unavailableReason: "provider_error" };
  }
}

export async function getGooglePlaceById(placeId: string): Promise<GooglePlaceDetail | null> {
  const apiKey = process.env.GOOGLE_MAPS_DEMO_API_KEY;
  if (!apiKey || !/^[A-Za-z0-9_-]{8,200}$/.test(placeId)) return null;

  const cached = detailCache.get(placeId);
  if (cached && cached.expiresAt > Date.now()) return cached.place;

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,primaryType,types,googleMapsUri,rating,userRatingCount,regularOpeningHours,photos,websiteUri,nationalPhoneNumber,priceLevel,businessStatus",
      },
      cache: "no-store",
    });
    const place = response.ok ? toGooglePlaceDetail(await response.json()) : null;
    detailCache.set(placeId, { expiresAt: Date.now() + (place ? DETAIL_CACHE_TTL_MS : 30_000), place });
    return place;
  } catch {
    detailCache.set(placeId, { expiresAt: Date.now() + 30_000, place: null });
    return null;
  }
}
