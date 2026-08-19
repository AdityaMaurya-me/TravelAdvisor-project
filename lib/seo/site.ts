const FALLBACK_SITE_URL = "https://travel-advisor-project-inky.vercel.app";

/**
 * The public canonical origin. Set NEXT_PUBLIC_SITE_URL to the final custom
 * domain once one is connected; the Vercel production URL is a safe fallback
 * while the project is still using its hosted subdomain.
 */
export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const deployedUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const rawUrl = configuredUrl || deployedUrl || FALLBACK_SITE_URL;
  const normalizedUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

  return new URL(normalizedUrl);
}

export function siteUrlFor(pathname = "/") {
  return new URL(pathname, getSiteUrl()).toString();
}

export function conciseDescription(value: string | null | undefined, fallback: string) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return normalized.length > 155 ? `${normalized.slice(0, 152).trimEnd()}...` : normalized;
}

export const defaultShareImage = "/opengraph-image";
