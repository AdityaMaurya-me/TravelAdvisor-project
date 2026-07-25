import Link from "next/link";
import { ArrowRight, Camera, Heart, Route, Sparkles } from "lucide-react";

import Navbar from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const tools = [
  { title: "Smart Journey Planner", description: "Build a trip around places, stops, and the time you have available.", href: "/planner", icon: Route },
  { title: "AI Travel Assistant", description: "A future planning companion. Kept as a placeholder until the travel data is complete.", href: "/ai", icon: Sparkles },
  { title: "Travel Community", description: "See practical tips and local recommendations from other travellers.", href: "/community", icon: Camera },
  { title: "Saved Collections", description: "Keep your favourite places and routes ready for the next trip.", href: "/collections", icon: Heart },
];

export default function JourneyPage() {
  return <main className="min-h-screen bg-background"><Navbar /><section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><p className="text-sm font-medium text-cyan-300">Plan with confidence</p><h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Everything you need for your journey</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Discover places, build an itinerary, and keep travel ideas organized in one calm workspace.</p><div className="mt-10 grid gap-5 md:grid-cols-2">{tools.map((tool) => { const Icon = tool.icon; return <Link key={tool.href} href={tool.href} className="group rounded-2xl border border-border bg-card p-7 transition hover:-translate-y-1 hover:border-cyan-400/60"><Icon className="h-7 w-7 text-cyan-300" /><h2 className="mt-5 text-xl font-semibold">{tool.title}</h2><p className="mt-2 leading-6 text-muted-foreground">{tool.description}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-cyan-300">Open tool <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>})}</div></section><Footer /></main>;
}
