import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

import Navbar from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return <main className="min-h-screen bg-background"><Navbar /><section className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-3xl flex-col justify-center px-4 py-16 sm:px-6"><Compass className="h-10 w-10 text-cyan-300" /><p className="mt-6 text-sm font-medium text-cyan-300">TravelAdvisor</p><h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1><p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">{description}</p><Link href="/" className="mt-8 inline-flex w-fit items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition hover:border-cyan-400/60"><ArrowLeft className="h-4 w-4" />Back to discovery</Link></section><Footer /></main>;
}
