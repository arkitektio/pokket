import { Direction, ListTransactionsQueryVariables, Ordering } from "./api/graphql";
import { firstOfMonth } from "./format";
import { ViewKey } from "./viewMeta";

/**
 * The transaction lists the bank screen offers: the latest, and this month's
 * top movements either way. Amounts are signed (money out is negative), so
 * the biggest spends sort ascending and the biggest income descending.
 */
export type TransactionView = {
  key: ViewKey;
  label: string;
  variables: () => Pick<ListTransactionsQueryVariables, "filters" | "ordering">;
  empty: { title: string; description: string };
};

export const TRANSACTION_VIEWS: TransactionView[] = [
  {
    key: "recent",
    label: "Recent",
    variables: () => ({ ordering: [{ bookingDate: Ordering.Desc }] }),
    empty: { title: "No transactions", description: "Nothing has been synced from your accounts yet." },
  },
  {
    key: "spends",
    label: "Top spends",
    variables: () => ({
      filters: { direction: Direction.Out, dateFrom: firstOfMonth(), isTransfer: false },
      ordering: [{ amount: Ordering.Asc }],
    }),
    empty: { title: "Nothing spent", description: "No money went out this month." },
  },
  {
    key: "income",
    label: "Top income",
    variables: () => ({
      filters: { direction: Direction.In, dateFrom: firstOfMonth(), isTransfer: false },
      ordering: [{ amount: Ordering.Desc }],
    }),
    empty: { title: "No income yet", description: "No money came in this month." },
  },
];
