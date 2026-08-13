export type CachedProfile = {
  userId: string;
  email: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
};

const PROFILE_CACHE_KEY = "traveladvisor:profile";

export function readCachedProfile(): CachedProfile | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as CachedProfile;
    return profile?.userId && profile.email ? profile : null;
  } catch {
    return null;
  }
}

export function writeCachedProfile(profile: CachedProfile) {
  try { sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile)); } catch { /* storage is optional */ }
}

export function clearCachedProfile() {
  try { sessionStorage.removeItem(PROFILE_CACHE_KEY); } catch { /* storage is optional */ }
}
