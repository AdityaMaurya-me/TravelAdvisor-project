import { notFound } from "next/navigation";

import { CategoryExplorerPage } from "@/components/sections/category/category-explorer-page";
import { getCategoryCardImage } from "@/lib/mock-data/home";
import { getCategoryExplorer, getCategoryExplorers } from "@/lib/mock-data/category-explorer";

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ destination?: string }> }) {
  const { slug } = await params;
  const { destination } = await searchParams;
  const [category, destinationCategories] = await Promise.all([
    getCategoryExplorer(slug, destination),
    getCategoryExplorers(destination),
  ]);

  if (!category) notFound();

  const similarCategories = destinationCategories
    .filter((item) => item.slug !== category.slug)
    .map((item) => ({
      slug: item.slug,
      title: item.title,
      image: getCategoryCardImage(item.slug),
    }));

  return <CategoryExplorerPage category={category} similarCategories={similarCategories} />;
}
