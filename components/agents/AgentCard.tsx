import { AgentLogo } from '@/components/agents/AgentLogo';
import { CardWatermark, LeadWithBead } from '@/components/ui/card-watermark';
import { Text } from '@/components/ui/text';
import { agentRoute } from '@/lib/rekuest/agents/routes';
import type { ListAgentFragment } from '@/lib/rekuest/api/graphql';
import { formatTaskTime } from '@/lib/rekuest/taskStatus';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { cn } from '@/lib/utils';
import { Link, type Href } from 'expo-router';
import { Bot, Clock, Podcast, Tag, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

/** Where an agent is (orkestrator's `agentStatus`): connected, active a moment ago, gone, or barred. */
export type AgentStatus = 'online' | 'recent' | 'offline' | 'blocked';

export const agentStatus = (agent: Pick<ListAgentFragment, 'connected' | 'active' | 'blocked'>): AgentStatus =>
  agent.blocked ? 'blocked' : agent.connected ? 'online' : agent.active ? 'recent' : 'offline';

const STATUS_LABEL: Record<AgentStatus, string> = {
  online: 'Online',
  recent: 'Recently active',
  offline: 'Offline',
  blocked: 'Blocked',
};

const STATUS_DOT: Record<AgentStatus, string> = {
  online: 'bg-success',
  recent: 'bg-warning',
  offline: 'bg-muted-foreground/40',
  blocked: 'bg-destructive',
};

export const agentStatusLabel = (status: AgentStatus) => STATUS_LABEL[status];

/** Whether an agent is there, in words: connected, or when it was last seen. */
export const agentPresence = (agent: Pick<ListAgentFragment, 'connected' | 'blocked' | 'lastSeen'>): string =>
  agent.blocked ? 'Blocked' : agent.connected ? 'Online' : agent.lastSeen ? `Seen ${formatTaskTime(agent.lastSeen)}` : 'Offline';

/** An agent's presence as a dot: the bead on its logo. */
export function AgentStatusDot({ status, className }: { status: AgentStatus; className?: string }) {
  return <View className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status], className)} />;
}

/** One fact on a line of its own, led by its glyph in a column of its own. */
function Fact({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View className="min-w-0 flex-row items-center gap-1.5">
      <View className="w-3.5 items-center opacity-70">
        <Icon size={12} color={colors.mutedForeground} />
      </View>
      <Text numberOfLines={1} className="min-w-0 flex-1 text-xs text-muted-foreground">
        {children}
      </Text>
    </View>
  );
}

/**
 * An agent as a tile, orkestrator's `AgentCard` on the phone: its logo large
 * and faint behind it, small with its presence as a bead in the header beside
 * the app's name. Under the name, its version and its own name when it differs
 * from its app's; at the foot, when it was last seen. A connected agent wears
 * the theme colour; one that is not is grey and steps back. Square, two to a
 * row (`AgentCardGrid`).
 */
export function AgentCard({ agent }: { agent: ListAgentFragment }) {
  const colors = useThemeColors();
  const status = agentStatus(agent);
  const online = status === 'online';
  const hasLogo = !!agent.logo?.blok;

  return (
    <Link href={agentRoute(agent.id) as Href} asChild>
      <Pressable
        accessibilityLabel={`${agent.app.identifier}, ${agentStatusLabel(status)}`}
        className={cn(
          'aspect-square flex-1 gap-2 overflow-hidden rounded-2xl border p-2 active:opacity-80',
          status === 'blocked'
            ? 'border-destructive/45 bg-destructive/10'
            : online
              ? 'border-primary/25 bg-primary/10'
              : 'border-border bg-muted/40 opacity-70',
        )}
      >
        <CardWatermark>
          {hasLogo ? (
            <AgentLogo agent={agent} className="h-full w-full" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Podcast size={96} strokeWidth={1.25} color={colors.foreground} />
            </View>
          )}
        </CardWatermark>

        <View className="min-w-0 flex-row items-center gap-2 px-1 pt-0.5">
          <LeadWithBead label={agentStatusLabel(status)} bead={<AgentStatusDot status={status} />}>
            {hasLogo ? (
              <AgentLogo agent={agent} className="h-5 w-5" />
            ) : (
              <Podcast size={20} color={online ? colors.primary : colors.mutedForeground} />
            )}
          </LeadWithBead>
          <Text numberOfLines={1} className="min-w-0 flex-1 text-sm font-medium text-foreground">
            {agent.app.identifier}
          </Text>
        </View>

        <View className="gap-1 px-1">
          <Fact icon={Tag}>v{agent.release.version}</Fact>
          {agent.name && agent.name !== agent.app.identifier ? <Fact icon={Bot}>{agent.name}</Fact> : null}
        </View>

        {!online && agent.lastSeen ? (
          <View className="mt-auto px-1 pb-0.5">
            <Fact icon={Clock}>seen {formatTaskTime(agent.lastSeen)}</Fact>
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}

/** Agents as tiles, two to a row; an odd one out keeps its width. */
export function AgentCardRow({ agents }: { agents: readonly ListAgentFragment[] }) {
  return (
    <View className="flex-row gap-2.5 px-4 pb-2.5">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
      {agents.length === 1 ? <View className="flex-1" /> : null}
    </View>
  );
}

/** A section's agents in rows of two, for a list that draws one row per item. */
export const inPairs = <T,>(items: readonly T[]): T[][] => {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += 2) rows.push(items.slice(index, index + 2));
  return rows;
};
