import type { PointRow, VisitRow } from '@/lib/timeline/db';

/** The timeline is recorded on phones only; the web build shows no map. */
export function TimelineMap(_props: {
  styleUrl: string;
  points: readonly PointRow[];
  visits: readonly VisitRow[];
  height?: number;
}) {
  return null;
}
