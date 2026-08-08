import { describe, expect, it } from "vitest";

import { compactSearchText, scoreSearchMatch } from "@/lib/search-ranking";

describe("search ranking", () => {
  it("normalizes spacing and punctuation without losing Unicode text", () => {
    expect(compactSearchText("Kune — Waterfalls!")).toBe("kunewaterfalls");
    expect(compactSearchText("Café 24")).toBe("café24");
  });

  it("ranks an exact place above a partial name and address match", () => {
    const exact = scoreSearchMatch("kune waterfalls", "Kune Waterfalls", "Lonavala");
    const address = scoreSearchMatch("kune waterfalls", "Waterfall Cafe", "Near Kune Waterfalls, Lonavala");

    expect(exact).toBeGreaterThan(address);
  });

  it("uses the curated preference only as a tie-breaker", () => {
    const curatedPrefix = scoreSearchMatch("goa", "Goa Beach", "Goa", true);
    const externalExact = scoreSearchMatch("goa", "Goa", "India", false);

    expect(externalExact).toBeGreaterThan(curatedPrefix);
  });
});
