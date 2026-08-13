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
  waterfalls: "https://images.unsplash.com/photo-1637354895470-f36402ad275d?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  forts: "https://images.unsplash.com/photo-1643269877099-ea5393b80320?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  cafes: "https://images.unsplash.com/photo-1542372147193-a7aca54189cd?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  viewpoints: "https://images.unsplash.com/photo-1695211564991-9cf8f7a1d799?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGZvcnRzfGVufDB8fDB8fHww",
  "local-food": "https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  temples: "https://images.unsplash.com/photo-1665003725647-3ae0f01140b1?q=80&w=736&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "road-trips": "https://images.unsplash.com/photo-1669437923990-0160340d4d06?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
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
