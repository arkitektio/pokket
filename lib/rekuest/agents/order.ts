/** What ordering an agent needs: the fields the list fragment carries. */
type Orderable = { active: boolean; connected: boolean; lastSeen?: string | null; name: string };

const seen = (agent: Orderable): number => {
  const time = agent.lastSeen ? new Date(agent.lastSeen).getTime() : NaN;
  return Number.isNaN(time) ? -Infinity : time;
};

/**
 * Active agents first, connected ones first among those, then the most
 * recently seen, then by name. The server orders agents by `lastSeen` only,
 * so the rest happens here.
 */
export const byActivity = (a: Orderable, b: Orderable): number =>
  Number(b.active) - Number(a.active) ||
  Number(b.connected) - Number(a.connected) ||
  seen(b) - seen(a) ||
  a.name.localeCompare(b.name);

/** The agents as two sections, active and not, each in `byActivity` order. Empty sections are left out. */
export const agentSections = <T extends Orderable>(agents: readonly T[]): { title: string; data: T[] }[] => {
  const sorted = [...agents].sort(byActivity);
  return [
    { title: 'Active', data: sorted.filter((agent) => agent.active) },
    { title: 'Inactive', data: sorted.filter((agent) => !agent.active) },
  ].filter((section) => section.data.length > 0);
};
