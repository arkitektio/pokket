/**
 * The bank's transaction lists as names only — no GraphQL — so navigation and
 * search can list them without loading the bank client. `views.ts` adds what
 * each one queries.
 */
export const VIEW_META = [
  { key: "recent", label: "Recent", description: "Latest transactions", keywords: ["latest", "statement"] },
  {
    key: "spends",
    label: "Top spends",
    description: "This month's largest payments",
    keywords: ["expenses", "biggest", "outgoing", "spending"],
  },
  {
    key: "income",
    label: "Top income",
    description: "This month's largest incoming",
    keywords: ["salary", "incoming", "earnings"],
  },
] as const;

export type ViewKey = (typeof VIEW_META)[number]["key"];
