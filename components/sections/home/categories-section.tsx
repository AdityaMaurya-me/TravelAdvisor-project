import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CategoryCard } from "@/components/cards/category-card";
import { HOME_CATEGORIES } from "@/lib/mock-data/home";

export function CategoriesSection() {
  return (
    <section className="py-14">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight px-10">
            Explore by Category
          </h2>

          <p className="mt-2 text-muted-foreground px-10">
            Find places that match your mood
          </p>
        </div>

        <Link
          href="/categories"
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
          "
        >
          View all

          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 px-10">
        {HOME_CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            title={category.title}
            subtitle={category.subtitle}
            image={category.image}
            href={category.href}
          />
        ))}
      </div>
    </section>
  );
}