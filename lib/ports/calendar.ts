/** A month as rows of seven days, Monday first; null where the row belongs to a neighbouring month. */
export const monthGrid = (year: number, month: number): (number | null)[][] => {
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, row) => cells.slice(row * 7, row * 7 + 7));
};

/** A form's date value (a Date, or the ISO string it was prefilled with) as a Date, or null. */
export const asDate = (value: unknown): Date | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" && value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

/** The same moment with another day, keeping the time; a day the month lacks is its last. */
export const withDay = (date: Date, year: number, month: number, day: number): Date => {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last), date.getHours(), date.getMinutes(), 0, 0);
};

/** "07" → 7 within [0, max]; anything else is null. */
export const clockPart = (text: string, max: number): number | null => {
  if (!/^\d{1,2}$/.test(text.trim())) return null;
  const value = Number(text);
  return value >= 0 && value <= max ? value : null;
};

/** A slider's position as a value: within the range, on a step. */
export const snap = (fraction: number, min: number, max: number, step: number): number => {
  const clamped = Math.max(0, Math.min(1, fraction));
  const raw = min + clamped * (max - min);
  const stepped = step > 0 ? min + Math.round((raw - min) / step) * step : raw;
  const decimals = step > 0 ? Math.min(10, (String(step).split(".")[1] ?? "").length) : 6;
  return Math.max(min, Math.min(max, Number(stepped.toFixed(decimals))));
};
