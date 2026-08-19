import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";
import { siteUrlFor } from "@/lib/seo/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrlFor("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrlFor("/destinations"), changeFrequency: "daily", priority: 0.9 },
    { url: siteUrlFor("/categories"), changeFrequency: "weekly", priority: 0.8 },
    { url: siteUrlFor("/community"), changeFrequency: "daily", priority: 0.7 },
    { url: siteUrlFor("/planner"), changeFrequency: "weekly", priority: 0.7 },
    { url: siteUrlFor("/journey"), changeFrequency: "weekly", priority: 0.7 },
    { url: siteUrlFor("/ai"), changeFrequency: "weekly", priority: 0.6 },
    { url: siteUrlFor("/about"), changeFrequency: "monthly", priority: 0.4 },
    { url: siteUrlFor("/privacy"), changeFrequency: "monthly", priority: 0.3 },
  ];

  const supabase = await createClient();
  const [{ data: places, error: placesError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase
      .from("places")
      .select("slug, level, updated_at")
      .eq("is_published", true)
      .eq("is_external", false),
    supabase.from("categories").select("slug"),
  ]);

  // A sitemap should never make the public site unavailable if a database
  // connection is temporarily down. Static discoverability remains useful.
  if (placesError || categoriesError) return staticPages;

  const cataloguePages: MetadataRoute.Sitemap = (places ?? []).flatMap((place) => {
    const pathname = place.level === "city" ? `/destination/${place.slug}` : `/place/${place.slug}`;
    return [{
      url: siteUrlFor(pathname),
      lastModified: place.updated_at ? new Date(place.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: place.level === "city" ? 0.8 : 0.7,
    }];
  });

  const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map((category) => ({
    url: siteUrlFor(`/categories/${category.slug}`),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...cataloguePages, ...categoryPages];
}
