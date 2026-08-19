import Link from "next/link";
import { Compass, MapPinned, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground sm:px-10">
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center rounded-3xl border border-border/70 bg-card/70 p-8 text-center shadow-2xl shadow-cyan-950/10">
        <div className="mb-6 flex size-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
          <Compass className="size-8" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Lost on the way?</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">This place is not on the map yet.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          The link may have changed, or this destination is not published yet. Search the catalogue or return to the home page to keep exploring.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition hover:brightness-110">
            <Search className="size-4" aria-hidden="true" />
            Search places
          </Link>
          <Link href="/destinations" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 font-semibold transition hover:border-primary/60 hover:text-primary">
            <MapPinned className="size-4" aria-hidden="true" />
            Browse destinations
          </Link>
        </div>
      </section>
    </main>
  );
}
