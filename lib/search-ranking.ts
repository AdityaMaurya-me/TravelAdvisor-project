export function compactSearchText(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Keeps exact and prefix matches ahead of broad address matches while giving
 * verified TravelAdvisor records a small, deterministic preference.
 */
export function scoreSearchMatch(query: string, name: string, address = "", curated = false) {
  const needle = compactSearchText(query);
  const title = compactSearchText(name);
  const location = compactSearchText(address);
  if (!needle) return 0;

  let score = curated ? 20 : 0;
  if (title === needle) score += 1000;
  else if (title.startsWith(needle)) score += 800;
  else if (title.includes(needle)) score += 620;
  else if (location.startsWith(needle)) score += 360;
  else if (location.includes(needle)) score += 180;

  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return score + words.reduce(
    (total, word) => total + (name.toLocaleLowerCase().includes(word) ? 40 : address.toLocaleLowerCase().includes(word) ? 12 : 0),
    0,
  );
}
