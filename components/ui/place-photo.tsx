"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type PhotoResult = {
  photo: { url: string; photographer: string } | null;
};

const PLACEHOLDER_IMAGE = /\/(?:attraction-\d+|placeholder|travel-hero|hero-bg)\.(?:png|jpe?g|webp)$/i;

function needsPhotoLookup(source: string) {
  return PLACEHOLDER_IMAGE.test(source);
}

interface PlacePhotoProps {
  src: string;
  alt: string;
  query?: string;
  className?: string;
  sizes?: string;
}

/**
 * Replaces only bundled demo assets. Approved database images and images
 * uploaded by contributors remain the source of truth and are never replaced.
 */
export function PlacePhoto({ src, alt, query = alt, className, sizes }: PlacePhotoProps) {
  const [photo, setPhoto] = useState<PhotoResult["photo"]>(null);

  useEffect(() => {
    if (!needsPhotoLookup(src) || !query.trim()) {
      setPhoto(null);
      return;
    }

    const controller = new AbortController();
    const url = `/api/place-photo?query=${encodeURIComponent(`${query} India travel`)}`;

    void fetch(url, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<PhotoResult> : { photo: null })
      .then((result) => setPhoto(result.photo))
      .catch(() => undefined);

    return () => controller.abort();
  }, [query, src]);

  return (
    <>
      <Image
        src={photo?.url ?? src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
      />
      {photo && (
        <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-slate-950/75 px-2 py-1 text-[10px] text-slate-200 backdrop-blur-sm">
          Photo by {photo.photographer} on Unsplash
        </span>
      )}
    </>
  );
}
