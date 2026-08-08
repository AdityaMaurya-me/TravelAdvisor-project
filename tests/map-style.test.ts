import { describe, expect, it } from "vitest";

import { isMapTilerFailure, mapTilerStyle, OPEN_STREET_MAP_FALLBACK_STYLE } from "@/lib/maps/map-style";

describe("map styles", () => {
  it("creates an encoded MapTiler style URL", () => {
    expect(mapTilerStyle("key with spaces")).toContain("key=key%20with%20spaces");
  });

  it("identifies authentication and style failures that need a fallback", () => {
    expect(isMapTilerFailure({ status: 403 })).toBe(true);
    expect(isMapTilerFailure(new Error("Map style request failed"))).toBe(true);
    expect(isMapTilerFailure({ status: 500, message: "temporary outage" })).toBe(false);
  });

  it("ships a valid no-key raster fallback", () => {
    expect(OPEN_STREET_MAP_FALLBACK_STYLE.version).toBe(8);
    expect(OPEN_STREET_MAP_FALLBACK_STYLE.layers).toHaveLength(1);
  });
});
