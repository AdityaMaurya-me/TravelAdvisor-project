import { ExternalLink, MapPinned } from "lucide-react";

type OpenGoogleMapsButtonProps = {
  href: string;
  className?: string;
};

/**
 * Shared external-map action for both curated and live Google place cards.
 * The treatment adapts dexter-st's MIT-licensed Uiverse map action with a
 * moving route line instead of a whole-button flash.
 */
export function OpenGoogleMapsButton({ href, className = "" }: OpenGoogleMapsButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`travel-button-skin travel-google-map-action group relative isolate inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-cyan-400/45 bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 ${className}`}
      aria-label="Open this exact location in Google Maps"
    >
      <span aria-hidden="true" className="travel-google-map-action__route" />
      <span aria-hidden="true" className="travel-google-map-action__glow" />
      <MapPinned className="relative h-4 w-4 shrink-0 text-cyan-500 transition-transform duration-200 group-hover:scale-110 dark:text-cyan-300" />
      <span className="relative">Open in Google Maps</span>
      <ExternalLink className="relative h-3.5 w-3.5 shrink-0 text-cyan-700 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-cyan-200" />
    </a>
  );
}
