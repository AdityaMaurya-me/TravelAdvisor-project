import { notFound } from "next/navigation";

import { CategoryExplorerPage } from "@/components/sections/category/category-explorer-page";
import { getCategoryExplorer } from "@/lib/mock-data/category-explorer";

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ destination?: string }> }) {
  const { slug } = await params;
  const { destination } = await searchParams;
  const category = await getCategoryExplorer(slug, destination);

  if (!category) notFound();

  return <CategoryExplorerPage category={category} />;
}
