"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

type PhotoResult = {
  photo: { url: string; photographer: string; source: "Google Maps" | "Wikimedia Commons" | "Unsplash" } | null;
};

const PLACEHOLDER_IMAGE = /\/(?:attraction-\d+|placeholder|travel-hero|hero-bg)\.(?:png|jpe?g|webp)$/i;

function photoCacheKey(query: string) {
  return `traveladvisor:place-photo:${query.trim().toLocaleLowerCase()}`;
}

function readCachedPhoto(query: string, alt: string): PhotoResult["photo"] {
  if (typeof window === "undefined") return null;
  try {
    const stored = [query, alt]
      .filter((key, index, keys) => key.trim() && keys.indexOf(key) === index)
      .map((key) => window.sessionStorage.getItem(photoCacheKey(key)))
      .find(Boolean);
    const photo = stored ? JSON.parse(stored) as PhotoResult["photo"] : null;
    return photo?.url && photo.photographer && photo.source ? photo : null;
  } catch {
    return null;
  }
}

function cachePhoto(query: string, alt: string, photo: PhotoResult["photo"]) {
  if (typeof window === "undefined" || !photo) return;
  try {
    [query, alt]
      .filter((key, index, keys) => key.trim() && keys.indexOf(key) === index)
      .forEach((key) => window.sessionStorage.setItem(photoCacheKey(key), JSON.stringify(photo)));
  } catch { /* Storage can be unavailable in private browsing. */ }
}

function needsPhotoLookup(source: string) {
  return !source.trim() || PLACEHOLDER_IMAGE.test(source);
}

function isSupabaseStoragePhoto(source: string) {
  try {
    const url = new URL(source);
    return url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/");
  } catch {
    return false;
  }
}

interface PlacePhotoProps {
  src: string;
  alt: string;
  query?: string;
  googlePhotoName?: string;
  googlePhotoAuthor?: string;
  className?: string;
  sizes?: string;
  /** Must be one of the image qualities allowed in next.config.mjs. */
  quality?: number;
  /** Live, uncurated listings may use a query fallback. Curated cards never do. */
  allowFallbackSearch?: boolean;
  /** Optional editorial override; otherwise the crop is inferred from the subject query. */
  focalPoint?: string;
}

function inferFocalPoint(query: string) {
  const normalized = query.toLowerCase();
  if (/waterfall|mountain|hill|valley|viewpoint|sunrise|sunset|beach|lake|forest|garden|fort|temple|heritage|monument/.test(normalized)) return "50% 38%";
  if (/cafe|coffee|bakery|restaurant|food|market/.test(normalized)) return "50% 48%";
  return "50% 42%";
}

/**
 * A stored place cover is the canonical image across cards and details. When
 * the catalogue has no chosen cover, the exact Google Place photo is loaded
 * on demand with its attribution instead of showing a generic placeholder.
 */
export function PlacePhoto({ src, alt, query = alt, googlePhotoName, googlePhotoAuthor, className, sizes, quality = 75, focalPoint, allowFallbackSearch = false }: PlacePhotoProps) {
  const [photo, setPhoto] = useState<PhotoResult["photo"]>(() => readCachedPhoto(query, alt));
  const [googlePhotoFailed, setGooglePhotoFailed] = useState(false);
  const requiresLookup = needsPhotoLookup(src);
  const directGooglePhoto = requiresLookup && googlePhotoName && !googlePhotoFailed
    ? {
      url: `/api/place-photo?googlePhoto=${encodeURIComponent(googlePhotoName)}`,
      photographer: googlePhotoAuthor ?? "Google Maps contributor",
      source: "Google Maps" as const,
    }
    : null;
  const resolvedPhoto = requiresLookup ? photo ?? directGooglePhoto : null;
  const showSemanticFallback = requiresLookup && !resolvedPhoto;
  // Moderator uploads already come from a trusted public Storage URL. Direct
  // delivery avoids a second optimizer request failing on a newly added file,
  // while retaining the original uploaded resolution.
  const displayedSource = resolvedPhoto?.url ?? src;

  useEffect(() => {
    if (!requiresLookup || !query.trim()) {
      setPhoto(null);
      return;
    }
    if (googlePhotoName && !googlePhotoFailed) {
      setPhoto({ url: `/api/place-photo?googlePhoto=${encodeURIComponent(googlePhotoName)}`, photographer: googlePhotoAuthor ?? "Google Maps contributor", source: "Google Maps" });
      return;
    }
    if (!allowFallbackSearch) {
      setPhoto(null);
      return;
    }

    const controller = new AbortController();
    // If Google rejected one individual photo URL, still give the traveller a
    // useful visual from our public-image fallback instead of a broken tile.
    const url = `/api/place-photo?query=${encodeURIComponent(query)}${googlePhotoFailed ? "&skipGoogle=1" : ""}`;

    void fetch(url, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<PhotoResult> : { photo: null })
      .then((result) => { setPhoto(result.photo); cachePhoto(query, alt, result.photo); })
      .catch(() => undefined);

    return () => controller.abort();
  }, [allowFallbackSearch, googlePhotoAuthor, googlePhotoFailed, googlePhotoName, query, requiresLookup]);

  useEffect(() => {
    setGooglePhotoFailed(false);
  }, [googlePhotoName]);

  useEffect(() => {
    setPhoto(readCachedPhoto(query, alt));
  }, [alt, query]);

  return (
    <>
      {showSemanticFallback ? (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_25%_20%,rgba(6,182,212,.22),transparent_35%),linear-gradient(135deg,#10253a,#07111e)] p-3 text-center text-cyan-100">
          <span className="flex max-w-full flex-col items-center gap-1.5 text-[10px] font-medium leading-tight">
            <ImageOff className="h-4 w-4 text-cyan-300" />
            <span className="line-clamp-2">Photo being verified for {alt}</span>
          </span>
        </div>
      ) : (
        <Image
          src={displayedSource}
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          className={className}
          style={{ objectPosition: focalPoint ?? inferFocalPoint(query) }}
          unoptimized={Boolean(resolvedPhoto) || isSupabaseStoragePhoto(displayedSource)}
          onError={() => {
            if (googlePhotoName && !googlePhotoFailed) {
              setPhoto(null);
              setGooglePhotoFailed(true);
            }
          }}
        />
      )}
      {photo && (
        <span title={`Photo from ${photo.source} by ${photo.photographer}`} className="pointer-events-auto absolute bottom-0.5 right-0.5 max-w-[calc(100%-0.5rem)] truncate rounded-sm bg-slate-950/60 px-1 py-0.5 text-[7px] leading-none text-slate-200/90 backdrop-blur-sm">
          Photo from {photo.source} · {photo.photographer}
        </span>
      )}
    </>
  );
}
