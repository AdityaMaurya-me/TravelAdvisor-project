import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ReactNode } from "react";

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}

export function FeatureCard({
  title,
  description,
  href,
  icon,
}: FeatureCardProps) {
  return (
    <Link
      href={href}
      className="
        group
        flex
        min-h-65
        flex-col
        rounded-3xl
        border
        border-border/50
        bg-card
        p-8
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-primary/40
        hover:shadow-xl
      "
    >
      {/* Icon */}
      <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col">
        <h3 className="text-xl font-semibold tracking-tight">
          {title}
        </h3>

        <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>

        <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary">
          Learn more

          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}