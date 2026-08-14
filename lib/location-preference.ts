const locationPreferenceKey = "traveladvisor:location-enabled";

/**
 * This is an app-level privacy switch. Browser geolocation permissions can
 * only be revoked by the visitor in browser site settings; JavaScript cannot
 * revoke them on their behalf. Keeping this separate lets TravelAdvisor stop
 * requesting or using GPS immediately.
 */
export function isLocationEnabled() {
  try {
    return window.localStorage.getItem(locationPreferenceKey) !== "false";
  } catch {
    return true;
  }
}

export function setLocationEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(locationPreferenceKey, String(enabled));
    if (!enabled) {
      window.localStorage.removeItem("traveladvisor:nearby-places");
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith("traveladvisor:route-draft:"))
        .forEach((key) => window.localStorage.removeItem(key));
    }
  } catch { /* Storage is optional. */ }
  window.dispatchEvent(new CustomEvent("traveladvisor:location-preference", { detail: { enabled } }));
}
