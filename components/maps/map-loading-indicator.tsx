import { MapPin } from "lucide-react";

type MapLoadingIndicatorProps = {
  label?: string;
  className?: string;
};

/**
 * Map-only loading treatment, adapted from the MIT-licensed bright-fox-47
 * Uiverse location-pin loader and recoloured for TravelAdvisor.
 */
export function MapLoadingIndicator({ label = "Loading map", className = "" }: MapLoadingIndicatorProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`} role="status" aria-live="polite">
      <span aria-hidden="true" className="travel-map-loader">
        <span className="travel-map-loader__pulse" />
        <span className="travel-map-loader__pin"><MapPin className="h-5 w-5" /></span>
      </span>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
