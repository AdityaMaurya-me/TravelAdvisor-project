import { Camera, Clock, Sunrise, Ticket, Timer } from "lucide-react";

import type { PlaceFact, PlaceFactIcon } from "@/lib/mock-data/places";

const factIcons: Record<PlaceFactIcon, typeof Sunrise> = {
  sunrise: Sunrise,
  ticket: Ticket,
  clock: Clock,
  timer: Timer,
  camera: Camera,
};

interface PlaceFactsProps {
  facts: PlaceFact[];
  /** Compact sidebar variant used on the location detail page. */
  compact?: boolean;
}

export function PlaceFacts({ facts, compact = false }: PlaceFactsProps) {
  return (
    <div
      className={
        compact
          ? "grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border border-border/60 bg-card/60 p-5"
          : "grid grid-cols-1 gap-x-8 gap-y-4 rounded-2xl border border-border/60 bg-card/60 p-5 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {facts.map((fact) => {
        const Icon = factIcons[fact.icon];

        return (
          <div key={fact.label} className="flex items-start gap-2">
            <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{fact.label}</p>
              <p className="text-sm font-medium text-foreground">{fact.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
