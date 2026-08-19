import { Globe } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/"
      className="group flex items-center gap-3"
      aria-label="TravelAdvisor Home"
    >
      <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-400/60 sm:flex">
        <Globe className="h-5 w-5 text-cyan-400" />
      </div>

      <span className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
        TravelAdvisor
      </span>
    </Link>
  );
}
