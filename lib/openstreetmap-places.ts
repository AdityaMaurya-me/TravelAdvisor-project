export type OpenStreetMapPlace = {
  id: string;
  name: string;
  address: string;
  primaryType?: string;
  latitude: number;
  longitude: number;
  openStreetMapUri: string;
};

type NominatimResult = {
  osm_type?: "node" | "way" | "relation";
  osm_id?: number;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  type?: string;
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; places: OpenStreetMapPlace[] }>();
let lastRequestAt = 0;

function parseResult(result: NominatimResult): OpenStreetMapPlace | null {
  if (!result.osm_type || !Number.isInteger(result.osm_id) || !result.display_name) return null;
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const typeCode = result.osm_type[0]?.toUpperCase();
  const id = `osm-${typeCode}-${result.osm_id}`;
  const name = result.name?.trim() || result.display_name.split(",")[0]?.trim() || "OpenStreetMap location";
  return {
    id,
    name,
    address: result.display_name,
    primaryType: result.type,
    latitude,
    longitude,
    openStreetMapUri: `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`,
  };
}

async function respectPublicRateLimit() {
  const remaining = 1100 - (Date.now() - lastRequestAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  lastRequestAt = Date.now();
}

/**
 * Lightweight fallback only. The public Nominatim service permits at most one
 * request per second, so calls are server-side, cached, and never used for
 * autocomplete when Google is healthy.
 */
export async function searchOpenStreetMapPlaces(query: string, limit = 6): Promise<OpenStreetMapPlace[]> {
  const normalized = query.trim();
  if (normalized.length < 3) return [];
  const cacheKey = `${normalized.toLocaleLowerCase()}::${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.places;
  await respectPublicRateLimit();
  try {
    const params = new URLSearchParams({ q: normalized, format: "jsonv2", addressdetails: "1", limit: String(Math.min(Math.max(limit, 1), 10)) });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "TravelAdvisor/1.0 (https://github.com/AdityaMaurya-me/TravelAdvisor-project)", Accept: "application/json" },
      next: { revalidate: 1800 },
    });
    if (!response.ok) return [];
    const places = (await response.json() as NominatimResult[]).flatMap((result) => {
      const parsed = parseResult(result);
      return parsed ? [parsed] : [];
    });
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, places });
    return places;
  } catch (error) {
    console.warn("OpenStreetMap fallback search failed", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getOpenStreetMapPlaceById(id: string): Promise<OpenStreetMapPlace | null> {
  const match = /^osm-([NWR])-(\d+)$/.exec(id);
  if (!match) return null;
  const osmType = { N: "node", W: "way", R: "relation" }[match[1] as "N" | "W" | "R"];
  await respectPublicRateLimit();
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/lookup?format=jsonv2&addressdetails=1&osm_ids=${osmType[0].toUpperCase()}${match[2]}`, {
      headers: { "User-Agent": "TravelAdvisor/1.0 (https://github.com/AdityaMaurya-me/TravelAdvisor-project)", Accept: "application/json" },
      next: { revalidate: 1800 },
    });
    if (!response.ok) return null;
    return parseResult((await response.json() as NominatimResult[])[0] ?? {});
  } catch (error) {
    console.warn("OpenStreetMap fallback lookup failed", error instanceof Error ? error.message : error);
    return null;
  }
}
