import { describe, expect, it } from '@jest/globals';
import { agentSections, byActivity } from '../order';

const agent = (name: string, active: boolean, connected: boolean, lastSeen: string | null = null) => ({
  name,
  active,
  connected,
  lastSeen,
});

describe('agent order', () => {
  it('puts active agents first, connected first among them, then the most recently seen', () => {
    const agents = [
      agent('old', false, false, '2026-01-01T00:00:00Z'),
      agent('idle', true, false, '2026-10-01T00:00:00Z'),
      agent('recent', true, true, '2026-10-16T10:00:00Z'),
      agent('earlier', true, true, '2026-10-16T08:00:00Z'),
      agent('never', false, false),
    ];
    expect([...agents].sort(byActivity).map((a) => a.name)).toEqual(['recent', 'earlier', 'idle', 'old', 'never']);
  });

  it('splits them into an active and an inactive section, leaving out an empty one', () => {
    expect(agentSections([agent('a', true, true), agent('b', false, false)]).map((s) => [s.title, s.data.length])).toEqual([
      ['Active', 1],
      ['Inactive', 1],
    ]);
    expect(agentSections([agent('b', false, false)]).map((s) => s.title)).toEqual(['Inactive']);
  });
});
