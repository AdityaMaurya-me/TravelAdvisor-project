import Link from "next/link";

import Navbar from "@/components/layout/navbar";
import { TravelAssistant } from "@/components/sections/ai/travel-assistant";

export default function AiTravelAssistantPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <Link href="/journey" className="text-sm text-muted-foreground transition-colors hover:text-primary">← Back to journey tools</Link>
        <div className="mt-7"><TravelAssistant /></div>
      </div>
    </main>
  );
}
