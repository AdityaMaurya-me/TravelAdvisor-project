import Link from "next/link";
import { ReactNode } from "react";

import { PlacePhoto } from "@/components/ui/place-photo";

interface ImageCardProps {
  href: string;
  image: string;
  alt: string;
  children: ReactNode;
  aspectRatio?: "portrait" | "landscape" | "square";
  query?: string;
  googlePhotoName?: string;
  googlePhotoAuthor?: string;
}

const aspectRatioClasses = {
  portrait: "aspect-[4/5]",
  landscape: "aspect-[16/10]",
  square: "aspect-square",
};

export function ImageCard({
  href,
  image,
  alt,
  children,
  aspectRatio = "portrait",
  query,
  googlePhotoName,
  googlePhotoAuthor,
}: ImageCardProps) {
  return (
    <Link
      href={href}
      className="
        group
        block
        overflow-hidden
        rounded-2xl
        border
        border-border/60
        bg-card
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-primary/40
        hover:shadow-xl
      "
    >
      <div
        className={`relative overflow-hidden ${aspectRatioClasses[aspectRatio]}`}
      >
        <PlacePhoto
          src={image}
          alt={alt}
          query={query ?? alt}
          googlePhotoName={googlePhotoName}
          googlePhotoAuthor={googlePhotoAuthor}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="
            object-cover
            transition-transform
            duration-500
            group-hover:scale-110
          "
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      {children}
    </Link>
  );
}
