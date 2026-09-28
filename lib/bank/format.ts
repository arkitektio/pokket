/**
 * Money and date formatting for bank screens — a port of orkestrator's
 * `bank/format.ts`. Amounts arrive as Decimal strings and stay strings in the
 * cache; they become numbers only here, for display, never to be sent back.
 */

const moneyFormats = new Map<string, Intl.NumberFormat>();

const moneyFormat = (currency: string, signDisplay: "auto" | "always" | "never") => {
  const key = `${currency}|${signDisplay}`;
  let format = moneyFormats.get(key);
  if (!format) {
    try {
      format = new Intl.NumberFormat(undefined, { style: "currency", currency, signDisplay });
    } catch {
      // An unknown ISO code: print the number and the code as they came.
      format = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay });
    }
    moneyFormats.set(key, format);
  }
  return format;
};

export const toNumber = (amount: string | number | null | undefined): number => {
  if (amount === null || amount === undefined) return 0;
  const value = typeof amount === "number" ? amount : parseFloat(amount);
  return Number.isFinite(value) ? value : 0;
};

export const formatMoney = (
  amount: string | number | null | undefined,
  currency: string,
  { signed = false }: { signed?: boolean } = {},
) => {
  const format = moneyFormat(currency, signed ? "always" : "auto");
  const text = format.format(toNumber(amount));
  return format.resolvedOptions().style === "currency" ? text : `${text} ${currency}`;
};

const parseDay = (date: string) => {
  // A bare `YYYY-MM-DD` parses as UTC midnight; read it as a local day instead.
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const formatDay = (date: string | null | undefined) =>
  date ? parseDay(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

export const formatShortDay = (date: string | null | undefined) =>
  date ? parseDay(date).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—";

/** `YYYY-MM-DD` for a local date, as the Date scalar wants it. */
export const isoDay = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const firstOfMonth = (date = new Date()) => isoDay(new Date(date.getFullYear(), date.getMonth(), 1));

/** `AT61 1904 3002 3457 3201`, the way it is printed on a card. */
export const formatIban = (iban: string | null | undefined) =>
  iban ? iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim() : "";

/** What a statement line is called: the merchant, else the counterparty, else the reference. */
export const transactionTitle = (t: { merchant?: { name: string } | null; counterparty?: string | null; remittance?: string | null }) =>
  t.merchant?.name || t.counterparty || t.remittance || "Transaction";
