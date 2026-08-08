import type { StyleSpecification } from "maplibre-gl";

/**
 * A no-key fallback for when the configured MapTiler browser key cannot load.
 * The source attribution is intentionally included in the style so MapLibre's
 * built-in attribution control remains visible.
 */
export const OPEN_STREET_MAP_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "openstreetmap-raster": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>',
    },
  },
  layers: [
    {
      id: "openstreetmap-raster",
      type: "raster",
      source: "openstreetmap-raster",
    },
  ],
};

export function mapTilerStyle(key: string) {
  return `https://api.maptiler.com/maps/streets-v4-dark/style.json?key=${encodeURIComponent(key)}`;
}

export function isMapTilerFailure(error: unknown) {
  const record = error as { status?: unknown; message?: unknown } | undefined;
  const status = typeof record?.status === "number" ? record.status : 0;
  const message = typeof record?.message === "string" ? record.message.toLowerCase() : "";
  return status === 401 || status === 403 || /maptiler|style|tile|unauthori[sz]ed|forbidden/.test(message);
}
