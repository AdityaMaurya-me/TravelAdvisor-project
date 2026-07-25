export interface Category {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
}

export const HOME_CATEGORIES: Category[] = [
  {
    id: "waterfalls",
    title: "Waterfalls",
    subtitle: "Explore",
    image: "/attraction-1.png",
    href: "/categories/waterfalls",
  },
  {
    id: "forts",
    title: "Forts",
    subtitle: "Explore",
    image: "/attraction-2.png",
    href: "/categories/forts",
  },
  {
    id: "cafes",
    title: "Cafés",
    subtitle: "Explore",
    image: "/attraction-3.png",
    href: "/categories/cafes",
  },
  {
    id: "viewpoints",
    title: "Viewpoints",
    subtitle: "Explore",
    image: "/attraction-4.png",
    href: "/categories/viewpoints",
  },
  {
    id: "local-food",
    title: "Local Food",
    subtitle: "Explore",
    image: "/attraction-1.png",
    href: "/categories/local-food",
  },
  {
    id: "temples",
    title: "Temples",
    subtitle: "Explore",
    image: "/attraction-2.png",
    href: "/categories/temples",
  },
  {
    id: "road-trips",
    title: "Road Trips",
    subtitle: "Explore",
    image: "/attraction-3.png",
    href: "/categories/road-trips",
  },
  {
    id: "camping",
    title: "Camping",
    subtitle: "Explore",
    image: "/attraction-4.png",
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
