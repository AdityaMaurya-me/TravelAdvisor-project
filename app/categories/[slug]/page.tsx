import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryExplorerPage } from "@/components/sections/category/category-explorer-page";
import { getCategoryCardImage } from "@/lib/mock-data/home";
import { getCategoryExplorer, getCategoryExplorers } from "@/lib/mock-data/category-explorer";
import { conciseDescription } from "@/lib/seo/site";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ destination?: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { destination } = await searchParams;
  const category = await getCategoryExplorer(slug, destination);
  if (!category) return { title: "Category not found", robots: { index: false, follow: false } };

  const title = category.destination ? `${category.title} in ${category.destination.title}` : category.heading;
  const description = conciseDescription(category.description, `Explore ${category.title.toLowerCase()} across TravelAdvisor destinations.`);
  const query = destination ? `?destination=${encodeURIComponent(destination)}` : "";
  return {
    title,
    description,
    alternates: { canonical: `/categories/${category.slug}${query}` },
    openGraph: { title, description, type: "website" },
  };
}

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
