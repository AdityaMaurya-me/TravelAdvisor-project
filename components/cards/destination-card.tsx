// components/cards/destination-card.tsx

import { MapPin, Star } from "lucide-react";

import { ImageCard } from "@/components/ui/image-card";

export interface Destination {
  id: string;
  title: string;
  location: string;
  image: string;
  rating: number;
  reviewCount: number;
  href: string;
}

interface DestinationCardProps {
  destination: Destination;
  backHref?: string;
  backLabel?: string;
}

export function DestinationCard({
  destination,
  backHref,
  backLabel,
}: DestinationCardProps) {
  const href = backHref ? `${destination.href}?from=${encodeURIComponent(backHref)}&fromLabel=${encodeURIComponent(backLabel ?? "Back")}` : destination.href;

  return (
    <article className="space-y-4">
      <ImageCard
        image={destination.image}
        alt={destination.title}
        href={href} children={undefined} />

      <div className="space-y-2">
        <h3 className="line-clamp-1 text-lg font-semibold">
          {destination.title}
        </h3>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="line-clamp-1">
            {destination.location}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">
              {destination.rating.toFixed(1)}
            </span>
          </div>

          <span className="text-muted-foreground">
            ({destination.reviewCount.toLocaleString()})
          </span>
        </div>
      </div>
    </article>
  );
}
