import Navbar from "@/components/layout/navbar";

import { Hero } from "@/components/sections/home/hero";
import { CategoriesSection } from "@/components/sections/home/categories-section";
import { TrendingDestinations } from "@/components/sections/home/trending-destinations";
import { FeaturesSection } from "@/components/sections/home/features-section";
import { NearbyExplorerMap } from "@/components/maps/nearby-explorer-map";
import { Footer } from "@/components/layout/footer";
// import Newsletter from "@/components/sections/home/newsletter";

// Homepage content comes from Supabase and must stay fresh after publishing.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <Hero />

      <NearbyExplorerMap />

      <CategoriesSection />

      <TrendingDestinations />

      <FeaturesSection />

      {/* <CommunityPicks />

      <FeaturePointers /> */}

      <Footer />
    </main>
  );
}
