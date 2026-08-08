"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type PhotoResult = {
  photo: { url: string; photographer: string; source: "Google Maps" | "Wikimedia Commons" | "Unsplash" } | null;
};

const PLACEHOLDER_IMAGE = /\/(?:attraction-\d+|placeholder|travel-hero|hero-bg)\.(?:png|jpe?g|webp)$/i;

function needsPhotoLookup(source: string) {
  return PLACEHOLDER_IMAGE.test(source);
}

interface PlacePhotoProps {
  src: string;
  alt: string;
  query?: string;
  googlePhotoName?: string;
  googlePhotoAuthor?: string;
  className?: string;
  sizes?: string;
}

/**
 * Replaces only bundled demo assets. Approved database images and images
 * uploaded by contributors remain the source of truth and are never replaced.
 */
export function PlacePhoto({ src, alt, query = alt, googlePhotoName, googlePhotoAuthor, className, sizes }: PlacePhotoProps) {
  const [photo, setPhoto] = useState<PhotoResult["photo"]>(null);
  const [googlePhotoFailed, setGooglePhotoFailed] = useState(false);

  useEffect(() => {
    if (googlePhotoName && !googlePhotoFailed) {
      setPhoto({ url: `/api/place-photo?googlePhoto=${encodeURIComponent(googlePhotoName)}`, photographer: googlePhotoAuthor ?? "Google Maps contributor", source: "Google Maps" });
      return;
    }
    if (!needsPhotoLookup(src) || !query.trim()) {
      setPhoto(null);
      return;
    }

    const controller = new AbortController();
    // If Google rejected one individual photo URL, still give the traveller a
    // useful visual from our public-image fallback instead of a broken tile.
    const url = `/api/place-photo?query=${encodeURIComponent(query)}${googlePhotoFailed ? "&skipGoogle=1" : ""}`;

    void fetch(url, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<PhotoResult> : { photo: null })
      .then((result) => setPhoto(result.photo))
      .catch(() => undefined);

    return () => controller.abort();
  }, [googlePhotoAuthor, googlePhotoFailed, googlePhotoName, query, src]);

  useEffect(() => {
    setGooglePhotoFailed(false);
  }, [googlePhotoName]);

  return (
    <>
      <Image
        src={photo?.url ?? src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        unoptimized={Boolean(photo)}
        onError={() => {
          if (googlePhotoName && !googlePhotoFailed) {
            setPhoto(null);
            setGooglePhotoFailed(true);
          }
        }}
      />
      {photo && (
        <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-slate-950/75 px-2 py-1 text-[10px] text-slate-200 backdrop-blur-sm">
          Photo from {photo.source} · {photo.photographer}
        </span>
      )}
    </>
  );
}
