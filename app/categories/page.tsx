import Link from "next/link";

import Navbar from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getCategoryExplorers } from "@/lib/mock-data/category-explorer";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategoryExplorers();
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-cyan-300">Find your next kind of stop</p>
        <h1 className="mt-2 text-4xl font-bold">Explore by category</h1>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => <Link key={category.slug} href={`/categories/${category.slug}`} className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-cyan-400/60"><p className="text-sm text-cyan-300">{category.placeCount} places</p><h2 className="mt-2 text-2xl font-semibold">{category.title}</h2><p className="mt-2 text-sm text-muted-foreground">{category.description}</p></Link>)}
        </div>
      </section>
      <Footer />
    </main>
  );
}
