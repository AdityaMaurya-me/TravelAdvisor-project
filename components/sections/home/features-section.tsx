import {
  ArrowRight,
  Camera,
  Heart,
  Route,
  Sparkles,
} from "lucide-react";

import { FeatureCard } from "@/components/cards/feature-card";
import { HOME_FEATURES } from "@/lib/mock-data/home";
import Link from "next/link";

const icons: Record<string, typeof Route> = {
  route: Route,
  sparkles: Sparkles,
  camera: Camera,
  heart: Heart,
};

export function FeaturesSection() {
  return (
    <section className="py-20">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight px-10">
            Everything You Need for Your Journey
          </h2>

          <p className="mt-2 text-muted-foreground px-10">
            Discover, plan and experience travel with powerful tools built for modern explorers.
          </p>
        </div>

        <Link
          href="/journey"
          className="
            flex
            items-center
            gap-1
            text-sm
            font-medium
            text-cyan-400
            transition-colors
            hover:text-cyan-100
            pr-10
            mt-8
          "
        >
          Explore

          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2 px-10">
        {HOME_FEATURES.map((feature) => {
          const Icon = icons[feature.icon];

          return (
            <FeatureCard
              key={feature.id}
              title={feature.title}
              description={feature.description}
              href={feature.href}
              icon={<Icon className="h-6 w-6" />}
            />
          );
        })}
      </div>
    </section>
  );
}
