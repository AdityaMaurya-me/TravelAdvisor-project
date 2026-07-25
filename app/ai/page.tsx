import { Compass, Sparkles } from "lucide-react";
import Link from "next/link";

export default function AiTravelAssistantPage() {
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-4xl px-5 py-12 sm:px-8">
      <Link href="/journey" className="text-sm text-muted-foreground transition-colors hover:text-cyan-400">← Back to journey tools</Link>
      <section className="mt-8 overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-2xl sm:p-12">
        <span className="inline-flex rounded-2xl bg-violet-400/10 p-4 text-violet-300"><Sparkles className="h-8 w-8" /></span>
        <p className="mt-6 text-sm font-medium text-violet-300">AI travel assistant</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Recommendations are not connected yet.</h1>
        <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">This feature is intentionally kept offline until the project has an approved AI service. No external API or paid service is being used in the meantime.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/categories" className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition-colors hover:bg-cyan-300"><Compass className="h-4 w-4" /> Explore categories</Link>
          <Link href="/destinations" className="rounded-lg border border-border px-5 py-3 font-medium transition-colors hover:bg-accent">Browse destinations</Link>
        </div>
      </section>
    </main>
  );
}
