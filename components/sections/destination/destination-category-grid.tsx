import Link from "next/link";
import { Binoculars, Camera, Coffee, Gem, Landmark, Soup, TentTree, Waves } from "lucide-react";

import type { DestinationCategory, DestinationCategoryIcon } from "@/lib/mock-data/destinations";

const categoryIcons: Record<DestinationCategoryIcon, typeof Landmark> = {
  landmark: Landmark,
  viewpoint: Binoculars,
  gem: Gem,
  waterfall: Waves,
  cafe: Coffee,
  food: Soup,
  temple: TentTree,
  camera: Camera,
};

interface DestinationCategoryGridProps {
  categories: DestinationCategory[];
}

export function DestinationCategoryGrid({ categories }: DestinationCategoryGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category) => {
        const Icon = categoryIcons[category.icon];

        return (
          <Link
            key={category.id}
            href={category.href}
            className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon aria-hidden="true" className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{category.title}</h3>
              <p className="text-xs text-muted-foreground transition-colors group-hover:text-primary">{category.placeCount} places</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
