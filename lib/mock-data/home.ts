export interface Category {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
}

/**
 * Fixed visual language for category navigation. These images describe the
 * category itself, rather than changing with a specific place record.
 */
export const CATEGORY_CARD_IMAGES: Record<string, string> = {
  waterfalls: "https://images.unsplash.com/photo-1633037499870-d105eb8b1daf?auto=format&fit=crop&w=1080&q=80",
  forts: "https://images.unsplash.com/photo-1717329162563-2f93e83cc717?auto=format&fit=crop&w=1080&q=80",
  cafes: "https://images.unsplash.com/photo-1600765728673-7b4aa76cc3ce?auto=format&fit=crop&w=1080&q=80",
  viewpoints: "https://images.unsplash.com/photo-1638103243329-5c8be2dedad0?auto=format&fit=crop&w=1080&q=80",
  "local-food": "https://images.unsplash.com/photo-1617692855027-33b14f061079?auto=format&fit=crop&w=1080&q=80",
  temples: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1080&q=80",
  "road-trips": "https://images.unsplash.com/photo-1626002547082-f12bc6b7a72b?auto=format&fit=crop&w=1080&q=80",
  camping: "https://images.unsplash.com/photo-1618772446265-3f9f8e6f8487?auto=format&fit=crop&w=1080&q=80",
  attractions: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=1080&q=80",
  "hidden-gems": "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1080&q=80",
  "photo-spots": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1080&q=80",
};

export function getCategoryCardImage(slug: string) {
  return CATEGORY_CARD_IMAGES[slug] ?? CATEGORY_CARD_IMAGES.attractions;
}

export const HOME_CATEGORIES: Category[] = [
  {
    id: "waterfalls",
    title: "Waterfalls",
    subtitle: "Explore",
    image: getCategoryCardImage("waterfalls"),
    href: "/categories/waterfalls",
  },
  {
    id: "forts",
    title: "Forts",
    subtitle: "Explore",
    image: getCategoryCardImage("forts"),
    href: "/categories/forts",
  },
  {
    id: "cafes",
    title: "Cafés",
    subtitle: "Explore",
    image: getCategoryCardImage("cafes"),
    href: "/categories/cafes",
  },
  {
    id: "viewpoints",
    title: "Viewpoints",
    subtitle: "Explore",
    image: getCategoryCardImage("viewpoints"),
    href: "/categories/viewpoints",
  },
  {
    id: "local-food",
    title: "Local Food",
    subtitle: "Explore",
    image: getCategoryCardImage("local-food"),
    href: "/categories/local-food",
  },
  {
    id: "temples",
    title: "Temples",
    subtitle: "Explore",
    image: getCategoryCardImage("temples"),
    href: "/categories/temples",
  },
  {
    id: "road-trips",
    title: "Road Trips",
    subtitle: "Explore",
    image: getCategoryCardImage("road-trips"),
    href: "/categories/road-trips",
  },
  {
    id: "camping",
    title: "Camping",
    subtitle: "Explore",
    image: getCategoryCardImage("camping"),
    href: "/categories/camping",
  },
];

export { getDestinationSummaries } from "./destinations";

export const HOME_FEATURES = [
  {
    id: "planner",
    title: "Smart Journey Planner",
    description:
      "Create personalized routes with multiple destinations and optimized travel plans.",
    icon: "route",
    href: "/planner",
  },
  {
    id: "ai",
    title: "AI Travel Assistant",
    description:
      "Receive intelligent destination recommendations tailored to your interests.",
    icon: "sparkles",
    href: "/ai",
  },
  {
    id: "community",
    title: "Travel Community",
    description:
      "Explore real experiences, photography and recommendations from fellow travelers.",
    icon: "camera",
    href: "/community",
  },
  {
    id: "collections",
    title: "Saved Collections",
    description:
      "Bookmark destinations and organize trips into beautiful personal collections.",
    icon: "heart",
    href: "/collections",
  },
];
