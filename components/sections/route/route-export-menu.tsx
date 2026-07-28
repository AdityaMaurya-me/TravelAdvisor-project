"use client";

import { Download } from "lucide-react";

import type { JourneyRoute } from "@/lib/mock-data/routes";

type ExportFormat = "geojson" | "gpx" | "kml";

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}

function createGeoJson(route: JourneyRoute) {
  const coordinates = route.waypoints.map((point) => [point.longitude, point.latitude]);
  return JSON.stringify({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: route.title, note: "Planning waypoints only. This is not turn-by-turn driving geometry." },
        geometry: { type: "LineString", coordinates },
      },
      ...route.waypoints.map((point) => ({
        type: "Feature",
        properties: { name: point.name, kind: point.kind },
        geometry: { type: "Point", coordinates: [point.longitude, point.latitude] },
      })),
    ],
  }, null, 2);
}

function createGpx(route: JourneyRoute) {
  const points = route.waypoints.map((point) => `<rtept lat="${point.latitude}" lon="${point.longitude}"><name>${escapeXml(point.name)}</name><type>${point.kind}</type></rtept>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="TravelAdvisor" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${escapeXml(route.title)}</name><desc>Planning waypoints only; not turn-by-turn driving geometry.</desc></metadata><rte><name>${escapeXml(route.title)}</name>${points}</rte></gpx>`;
}

function createKml(route: JourneyRoute) {
  const coordinates = route.waypoints.map((point) => `${point.longitude},${point.latitude},0`).join(" ");
  const placemarks = route.waypoints.map((point) => `<Placemark><name>${escapeXml(point.name)}</name><description>${point.kind}</description><Point><coordinates>${point.longitude},${point.latitude},0</coordinates></Point></Placemark>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${escapeXml(route.title)}</name><description>Planning waypoints only; not turn-by-turn driving geometry.</description><Placemark><name>${escapeXml(route.title)}</name><LineString><coordinates>${coordinates}</coordinates></LineString></Placemark>${placemarks}</Document></kml>`;
}

const exporters: Record<ExportFormat, { label: string; mime: string; create: (route: JourneyRoute) => string }> = {
  geojson: { label: "GeoJSON", mime: "application/geo+json", create: createGeoJson },
  gpx: { label: "GPX", mime: "application/gpx+xml", create: createGpx },
  kml: { label: "KML", mime: "application/vnd.google-earth.kml+xml", create: createKml },
};

export function RouteExportMenu({ route }: { route: JourneyRoute }) {
  const download = (format: ExportFormat) => {
    if (route.waypoints.length < 2) return;
    const exporter = exporters[format];
    const url = URL.createObjectURL(new Blob([exporter.create(route)], { type: exporter.mime }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${route.slug}-waypoints.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (route.waypoints.length < 2) return null;
  return <div className="flex flex-wrap items-center gap-2"><span className="mr-1 inline-flex items-center gap-1 text-xs text-slate-400"><Download className="h-3.5 w-3.5" />Offline waypoints</span>{(Object.keys(exporters) as ExportFormat[]).map((format) => <button key={format} type="button" onClick={() => download(format)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100">{exporters[format].label}</button>)}</div>;
}
