import { MapPin } from "lucide-react";

import { ImageCard } from "@/components/ui/image-card";
import type { PlacePreview } from "@/lib/mock-data/destinations";

interface PlaceCardProps {
  place: PlacePreview;
  backHref?: string;
  backLabel?: string;
}

export function PlaceCard({ place, backHref, backLabel }: PlaceCardProps) {
  const href = backHref ? `${place.href}?from=${encodeURIComponent(backHref)}&fromLabel=${encodeURIComponent(backLabel ?? "Back to results")}` : place.href;

  return (
    <ImageCard
      href={href}
      image={place.image}
      alt={place.title}
      aspectRatio="landscape"
    >
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
          {place.title}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">{place.location}</span>
        </div>
        {(place.distance ?? place.description) && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {place.distance ?? place.description}
          </p>
        )}
      </div>
    </ImageCard>
  );
}
