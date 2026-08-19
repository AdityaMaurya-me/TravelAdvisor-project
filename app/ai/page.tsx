import Link from "next/link";

import Navbar from "@/components/layout/navbar";
import { TravelAssistant } from "@/components/sections/ai/travel-assistant";

export default function AiTravelAssistantPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto flex w-full max-w-5xl flex-col px-5 py-5 sm:px-8 sm:py-7 lg:h-[calc(100dvh-4rem)] lg:py-5">
        <Link href="/journey" className="text-sm text-muted-foreground transition-colors hover:text-primary">← Back to journey tools</Link>
        <div className="mt-4 min-h-0 flex-1"><TravelAssistant /></div>
      </div>
    </main>
  );
}
