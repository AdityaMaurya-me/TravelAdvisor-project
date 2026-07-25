import { createClient } from "@/lib/supabase/server";
import type { PlacePreview } from "@/lib/mock-data/destinations";

export interface CategoryResult {
    slug: string;
    title: string;
    places: PlacePreview[];
}

/**
 * Looks up a category by slug and returns every published place tagged
 * with it. Returns null only if the category itself doesn't exist —
 * a category with zero places yet still returns a valid result with an
 * empty places array, so the page can show "no places yet" instead of 404.
 */
export async function getCategoryBySlug(slug: string): Promise<CategoryResult | null> {
    const supabase = await createClient();
    const { data: category, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .single();

    if (error || !category) return null;

    const { data: rows } = await supabase
        .from("place_categories")
        .select("places(slug, name, city, state, cover_image)")
        .eq("category_id", category.id);

    const places: PlacePreview[] = (rows ?? [])
        .map((row: any) => row.places)
        .filter(Boolean)
        .map((p: any) => ({
            id: p.slug,
            title: p.name,
            location: [p.city, p.state].filter(Boolean).join(", "),
            image: p.cover_image,
            href: `/place/${p.slug}`,
        }));

    return {
        slug: category.slug,
        title: category.name,
        places,
    };
}
