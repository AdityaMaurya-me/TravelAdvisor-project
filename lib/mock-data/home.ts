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
    image: "https://images.unsplash.com/photo-1633037499870-d105eb8b1daf?auto=format&fit=crop&w=1080&q=80",
    href: "/categories/waterfalls",
  },
  {
    id: "forts",
    title: "Forts",
    subtitle: "Explore",
    image: "https://images.unsplash.com/photo-1717329162563-2f93e83cc717?auto=format&fit=crop&w=1080&q=80",
    href: "/categories/forts",
  },
  {
    id: "cafes",
    title: "Cafés",
    subtitle: "Explore",
    image: "https://images.unsplash.com/photo-1600765728673-7b4aa76cc3ce?auto=format&fit=crop&w=1080&q=80",
    href: "/categories/cafes",
  },
  {
    id: "viewpoints",
    title: "Viewpoints",
    subtitle: "Explore",
    image: "https://images.unsplash.com/photo-1638103243329-5c8be2dedad0?auto=format&fit=crop&w=1080&q=80",
    href: "/categories/viewpoints",
  },
  {
    id: "local-food",
    title: "Local Food",
    subtitle: "Explore",
    image: "https://images.unsplash.com/photo-1617692855027-33b14f061079?auto=format&fit=crop&w=1080&q=80",
    href: "/categories/local-food",
  },
  {
    id: "temples",
    title: "Temples",
    subtitle: "Explore",
    image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1080&q=80",
    href: "/categories/temples",
  },
  {
    id: "road-trips",
    title: "Road Trips",
    subtitle: "Explore",
    image: "https://images.unsplash.com/photo-1626002547082-f12bc6b7a72b?auto=format&fit=crop&w=1080&q=80",
    href: "/categories/road-trips",
  },
  {
    id: "camping",
    title: "Camping",
    subtitle: "Explore",
    image: "https://images.unsplash.com/photo-1618772446265-3f9f8e6f8487?auto=format&fit=crop&w=1080&q=80",
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
