import { notFound, redirect } from "next/navigation";

import { ComingSoonPage } from "@/components/common/coming-soon-page";

const pages: Record<string, { title: string; description: string }> = {
  collections: { title: "Saved Collections", description: "Organize the places and journeys you want to return to. Personal collections will arrive with the account experience." },
  community: { title: "Travel Community", description: "Local tips, photographs, and honest recommendations from fellow travellers are on the way." },
  about: { title: "About TravelAdvisor", description: "We are building a calmer way to find the places worth stopping for." },
  "sign-up": { title: "Create your account", description: "Account creation will be available alongside saved places and personal collections." },
  planner: { title: "Journey Planner", description: "Build a route around the places, food stops, and views that matter to you." },
  ai: { title: "AI Travel Assistant", description: "A thoughtful trip companion is being prepared for your next journey." },
  journal: { title: "Travel Journal", description: "Stories, routes, and useful ideas for curious travellers." },
  careers: { title: "Careers", description: "We will share opportunities to build the future of travel discovery here." },
  contact: { title: "Contact", description: "A direct way to reach the TravelAdvisor team is coming soon." },
  help: { title: "Help Center", description: "Guidance for planning, saving, and exploring will live here." },
  accessibility: { title: "Accessibility", description: "We are working to make TravelAdvisor useful to every traveller." },
  privacy: { title: "Privacy", description: "Our privacy policy will be published before account features launch." },
  terms: { title: "Terms of Use", description: "Our terms of use will be published before account features launch." },
};

export default async function SupportingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "sign-up") redirect("/sign-in?mode=sign-up");
  const page = pages[slug];
  if (!page) notFound();
  return <ComingSoonPage {...page} />;
}
