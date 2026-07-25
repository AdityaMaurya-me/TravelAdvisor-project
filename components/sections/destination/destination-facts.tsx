import { CalendarDays, Route, WalletCards } from "lucide-react";

import type { DestinationFact, DestinationFactIcon } from "@/lib/mock-data/destinations";

const factIcons: Record<DestinationFactIcon, typeof Route> = {
  route: Route,
  calendar: CalendarDays,
  wallet: WalletCards,
};

interface DestinationFactsProps {
  facts: DestinationFact[];
}

export function DestinationFacts({ facts }: DestinationFactsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {facts.map((fact) => {
        const Icon = factIcons[fact.icon];

        return (
          <div
            key={fact.label}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon aria-hidden="true" className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{fact.value}</p>
              <p className="text-xs text-muted-foreground transition-colors group-hover:text-primary">{fact.label} · {fact.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
