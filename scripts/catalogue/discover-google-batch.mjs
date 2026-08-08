import { readFile } from "node:fs/promises";

const argumentsList = process.argv.slice(2);
const format = argumentsList.find((argument) => argument.startsWith("--format="))?.split("=", 2)[1] ?? "json";
const radiusKm = Number(argumentsList.find((argument) => argument.startsWith("--radius-km="))?.split("=", 2)[1] ?? "35");
const requestedThemes = (argumentsList.find((argument) => argument.startsWith("--themes="))?.split("=", 2)[1] ?? "attractions,cafes")
  .split(",").map((value) => value.trim()).filter(Boolean);
const destinationSlugs = argumentsList.filter((argument) => !argument.startsWith("--"));
const requestedDestinations = destinationSlugs.length ? destinationSlugs : ["pune", "delhi"];
const destinationNames = new Map([
  ["pune", "Pune"], ["delhi", "Delhi"], ["jaipur", "Jaipur"], ["bengaluru", "Bengaluru"],
  ["hyderabad", "Hyderabad"], ["kolkata", "Kolkata"], ["ahmedabad", "Ahmedabad"], ["chandigarh", "Chandigarh"],
  ["rishikesh", "Rishikesh"], ["varanasi", "Varanasi"], ["darjeeling", "Darjeeling"], ["srinagar", "Srinagar"],
  ["ooty", "Ooty"], ["puducherry", "Puducherry"], ["mumbai", "Mumbai"], ["goa", "Goa"],
  ["lonavala", "Lonavala"], ["manali", "Manali"], ["munnar", "Munnar"], ["udaipur", "Udaipur"],
]);
const destinationCoordinates = new Map([
  ["pune", [18.5204, 73.8567]], ["delhi", [28.7041, 77.1025]], ["jaipur", [26.9124, 75.7873]], ["bengaluru", [12.9716, 77.5946]],
  ["hyderabad", [17.3850, 78.4867]], ["kolkata", [22.5726, 88.3639]], ["ahmedabad", [23.0225, 72.5714]], ["chandigarh", [30.7333, 76.7794]],
  ["rishikesh", [30.0869, 78.2676]], ["varanasi", [25.3176, 82.9739]], ["darjeeling", [27.0360, 88.2627]], ["srinagar", [34.0837, 74.7973]],
  ["ooty", [11.4064, 76.6950]], ["puducherry", [11.9416, 79.8083]], ["mumbai", [19.0760, 72.8777]], ["goa", [15.2993, 74.1240]],
  ["lonavala", [18.7546, 73.4090]], ["manali", [32.2432, 77.1892]], ["munnar", [10.0889, 77.0595]], ["udaipur", [24.5854, 73.7125]],
]);

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
  }));
}

const env = parseEnv(await readFile(".env.local", "utf8"));
const apiKey = env.GOOGLE_MAPS_DEMO_API_KEY;
if (!apiKey) throw new Error("GOOGLE_MAPS_DEMO_API_KEY is required in .env.local.");
if (requestedDestinations.some((slug) => !destinationNames.has(slug))) {
  throw new Error(`Unknown destination. Use one of: ${[...destinationNames.keys()].join(", ")}`);
}
if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 150) throw new Error("--radius-km must be between 1 and 150.");

const themeQueries = [
  { category: "attractions", prefix: "tourist attractions in" },
  { category: "cafes", prefix: "cafes in" },
  { category: "local-food", prefix: "local food in" },
  { category: "temples", prefix: "temples in" },
  { category: "forts", prefix: "forts in" },
  { category: "viewpoints", prefix: "viewpoints in" },
  { category: "waterfalls", prefix: "waterfalls in" },
  { category: "photo-spots", prefix: "photography spots in" },
];
const queries = requestedThemes.map((theme) => themeQueries.find((candidate) => candidate.category === theme)).filter(Boolean);
if (!queries.length) throw new Error(`No valid themes. Use: ${themeQueries.map((query) => query.category).join(", ")}`);
const fieldMask = "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.googleMapsUri,places.photos";
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const seen = new Set();
const seenNames = new Set();
const places = [];
const distanceKm = (first, second) => {
  const radians = (value) => value * Math.PI / 180;
  const [firstLat, firstLng] = first;
  const [secondLat, secondLng] = second;
  const a = Math.sin(radians(secondLat - firstLat) / 2) ** 2 + Math.cos(radians(firstLat)) * Math.cos(radians(secondLat)) * Math.sin(radians(secondLng - firstLng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
};

for (const slug of requestedDestinations) {
  const destination = destinationNames.get(slug);
  for (const query of queries) {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": fieldMask, "Content-Type": "application/json" },
      body: JSON.stringify({ textQuery: `${query.prefix} ${destination}`, languageCode: "en", pageSize: 5 }),
    });
    if (!response.ok) throw new Error(`Google Places search failed for ${destination}: ${response.status} ${await response.text()}`);
    const body = await response.json();
    for (const place of body.places ?? []) {
      const latitude = Number(place.location?.latitude);
      const longitude = Number(place.location?.longitude);
      const normalizedName = typeof place.displayName?.text === "string" ? `${slug}:${place.displayName.text}`.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : "";
      if (!place.id || !place.displayName?.text || !Number.isFinite(latitude) || !Number.isFinite(longitude) || seen.has(place.id) || seenNames.has(normalizedName)) continue;
      if (distanceKm(destinationCoordinates.get(slug), [latitude, longitude]) > radiusKm) continue;
      if (query.category === "photo-spots" && /\b(?:studio|office|photographer|photography service)\b/i.test(place.displayName.text)) continue;
      seen.add(place.id);
      seenNames.add(normalizedName);
      places.push({
        destinationSlug: slug,
        category: query.category,
        googlePlaceId: place.id,
        name: place.displayName.text,
        address: place.formattedAddress ?? "",
        latitude,
        longitude,
        primaryType: place.primaryType ?? null,
        types: Array.isArray(place.types) ? place.types : [],
        googleMapsUri: place.googleMapsUri ?? null,
        photoName: place.photos?.[0]?.name ?? null,
      });
    }
    // The batch deliberately uses only four requests and spaces them out.
    await wait(1250);
  }
}

if (format === "json") {
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), destinations: requestedDestinations, requestCount: requestedDestinations.length * queries.length, places }, null, 2));
} else if (format === "sql") {
  const escapeSql = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;
  const slugify = (value) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72);
  const rows = places.map((place) => `(${escapeSql(`${slugify(place.name)}-${place.destinationSlug}`)}, ${escapeSql(place.destinationSlug)}, ${escapeSql(place.category)}, ${escapeSql(place.name)}, ${escapeSql(place.address)}, ${place.latitude}, ${place.longitude}, ${escapeSql(place.googlePlaceId)}, ${escapeSql(place.googleMapsUri ?? "")}, ${escapeSql(`${place.name} is a Google Places sourced ${place.category === "cafes" ? "cafe or food venue" : "visitor location"} in ${destinationNames.get(place.destinationSlug)}.`)})`).join(",\n    ");
  const categories = places.map((place) => `(${escapeSql(`${slugify(place.name)}-${place.destinationSlug}`)}, ${escapeSql(place.category)})`).join(", ");
  console.log(`-- Generated from ${requestedDestinations.join(", ")} using ${requestedDestinations.length * queries.length} throttled Google Places requests.\nwith seed (slug, destination_slug, category_slug, name, address, latitude, longitude, google_place_id, source_url, description) as (\n  values\n    ${rows}\n)\ninsert into public.places (slug, name, level, parent_id, city, state, country, location, address, description, google_place_id, source_url, source_reference, last_verified_at, is_published, is_external, external_source, external_details)\nselect seed.slug, seed.name, 'attraction'::public.place_level, destination.id, destination.name, destination.state, destination.country, st_setsrid(st_makepoint(seed.longitude, seed.latitude), 4326)::geography, seed.address, seed.description, seed.google_place_id, nullif(seed.source_url, ''), 'Google Places Text Search - controlled catalogue batch', now(), true, false, 'google_places', jsonb_build_object('catalogue_batch', 'generated-google')\nfrom seed join public.places destination on destination.slug = seed.destination_slug\non conflict (slug) do update set parent_id = excluded.parent_id, city = excluded.city, state = excluded.state, country = excluded.country, location = excluded.location, address = excluded.address, description = excluded.description, google_place_id = excluded.google_place_id, source_url = excluded.source_url, source_reference = excluded.source_reference, last_verified_at = excluded.last_verified_at, is_published = true, is_external = false, external_source = excluded.external_source, external_details = excluded.external_details, updated_at = now();\n\nwith seed (slug, category_slug) as (values ${categories})\ninsert into public.place_categories (place_id, category_id)\nselect place.id, category.id from seed join public.places place on place.slug = seed.slug join public.categories category on category.slug = seed.category_slug\non conflict do nothing;`);
} else {
  throw new Error("Use --format=json or --format=sql.");
}
