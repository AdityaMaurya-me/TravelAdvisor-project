export type JourneyPlannerFilter = "all" | "pet" | "ev" | "quick";
export type JourneyPlannerBudgetFilter = "all" | "free" | "under-200" | "200-plus";

export type JourneyPlannerDraft = {
  originSlug: string | null;
  destinationSlug: string | null;
  bufferKm: number;
  filter: JourneyPlannerFilter;
  budgetFilter: JourneyPlannerBudgetFilter;
  planned: boolean;
  candidateSlugs: string[];
  savedAt: number;
};

export const JOURNEY_PLANNER_DRAFT_KEY = "traveladvisor:journey-planner-draft";

const validFilters = new Set<JourneyPlannerFilter>(["all", "pet", "ev", "quick"]);
const validBudgetFilters = new Set<JourneyPlannerBudgetFilter>(["all", "free", "under-200", "200-plus"]);

export function readJourneyPlannerDraft(): JourneyPlannerDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(JOURNEY_PLANNER_DRAFT_KEY) ?? "{}") as Partial<JourneyPlannerDraft>;
    if (
      typeof value.originSlug !== "string" && value.originSlug !== null
      || typeof value.destinationSlug !== "string" && value.destinationSlug !== null
      || !Number.isFinite(value.bufferKm)
      || !validFilters.has(value.filter as JourneyPlannerFilter)
      || !validBudgetFilters.has(value.budgetFilter as JourneyPlannerBudgetFilter)
      || typeof value.planned !== "boolean"
      || !Array.isArray(value.candidateSlugs)
    ) return null;

    return {
      originSlug: value.originSlug,
      destinationSlug: value.destinationSlug,
      bufferKm: Math.min(25, Math.max(2, Number(value.bufferKm))),
      filter: value.filter as JourneyPlannerFilter,
      budgetFilter: value.budgetFilter as JourneyPlannerBudgetFilter,
      planned: value.planned,
      candidateSlugs: value.candidateSlugs.filter((slug): slug is string => typeof slug === "string").slice(0, 100),
      savedAt: typeof value.savedAt === "number" ? value.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeJourneyPlannerDraft(draft: JourneyPlannerDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(JOURNEY_PLANNER_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Private browsing or restrictive browser settings can disable storage.
  }
}
