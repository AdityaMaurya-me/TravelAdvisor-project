import { LocationCurationPage } from "@/components/sections/curation/location-curation-page";
import { Suspense } from "react";

export default function CurationLocationsPage() {
  return <Suspense fallback={<main className="min-h-screen bg-background" />}><LocationCurationPage /></Suspense>;
}
