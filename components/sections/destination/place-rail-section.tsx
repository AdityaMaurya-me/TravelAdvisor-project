import { PlaceCard } from "@/components/cards/place-card";
import { SectionHeader } from "@/components/layout/section-header";
import type { PlacePreview } from "@/lib/mock-data/destinations";

interface PlaceRailSectionProps {
  title: string;
  description?: string;
  href: string;
  actionLabel: string;
  places: PlacePreview[];
}

export function PlaceRailSection({
  title,
  description,
  href,
  actionLabel,
  places,
}: PlaceRailSectionProps) {
  return (
    <section>
      <SectionHeader
        title={title}
        description={description}
        href={href}
        actionLabel={actionLabel}
      />
      <div className="mt-6 grid grid-flow-col auto-cols-[minmax(15rem,1fr)] gap-4 overflow-x-auto pb-3 sm:auto-cols-[minmax(17rem,1fr)] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible">
        {places.map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </div>
    </section>
  );
}
