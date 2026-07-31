const GUEST_SAVED_PLACES_KEY = "traveladvisor:guest-saved-place-slugs";
const SAVED_PLACES_EVENT = "traveladvisor:saved-places-updated";

function readStoredSlugs() {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(GUEST_SAVED_PLACES_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredSlugs(slugs: string[]) {
  window.localStorage.setItem(GUEST_SAVED_PLACES_KEY, JSON.stringify([...new Set(slugs)]));
  window.dispatchEvent(new Event(SAVED_PLACES_EVENT));
}

export function getGuestSavedPlaceSlugs() {
  return readStoredSlugs();
}

export function isGuestPlaceSaved(slug: string) {
  return readStoredSlugs().includes(slug);
}

export function toggleGuestSavedPlace(slug: string) {
  const slugs = readStoredSlugs();
  writeStoredSlugs(slugs.includes(slug) ? slugs.filter((item) => item !== slug) : [...slugs, slug]);
}

export function clearGuestSavedPlaces() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_SAVED_PLACES_KEY);
  window.dispatchEvent(new Event(SAVED_PLACES_EVENT));
}

export { SAVED_PLACES_EVENT };
