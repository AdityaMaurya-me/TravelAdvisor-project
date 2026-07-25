import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-background px-6 text-center"><div><Compass className="mx-auto h-10 w-10 text-cyan-300" /><p className="mt-6 text-sm font-medium text-cyan-300">Lost on the way?</p><h1 className="mt-2 text-4xl font-bold">This place is not on the map yet.</h1><p className="mt-4 text-muted-foreground">Try searching for another destination, category, or route.</p><Link href="/" className="mt-7 inline-block rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">Return home</Link></div></main>;
}
