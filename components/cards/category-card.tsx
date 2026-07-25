import { ImageCard } from "@/components/ui/image-card";

interface CategoryCardProps {
  title: string;
  subtitle: string;
  image: string;
  href: string;
}

export function CategoryCard({
  title,
  subtitle,
  image,
  href,
}: CategoryCardProps) {
  return (
    <ImageCard
      href={href}
      image={image}
      alt={title}
      aspectRatio="portrait"
    >
      <div className="space-y-1 p-4">
        <h3 className="text-sm font-semibold text-white">
          {title}
        </h3>

        <p className="text-xs text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </ImageCard>
  );
}