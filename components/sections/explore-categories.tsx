import { CategoryCard } from "@/components/cards/category-card";
import { SectionHeader } from "@/components/layout/section-header";

interface ExploreCategory {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
}

interface ExploreCategoriesProps {
  categories: ExploreCategory[];
  actionHref?: string;
  actionLabel?: string;
}

export default function ExploreCategories({
  categories,
  actionHref = "/categories",
  actionLabel = "View all",
}: ExploreCategoriesProps) {
  return (
    <section className="py-14">
      <SectionHeader
        title="Explore by Category"
        description="Find places that match your mood."
        href={actionHref}
        actionLabel={actionLabel}
      />

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {categories.map((category) => (
          <CategoryCard key={category.id} {...category} />
        ))}
      </div>
    </section>
  );
}
