import { ActionLogo } from '@/components/actions/ActionLogo';
import { AgentLogo } from '@/components/agents/AgentLogo';
import { agentPresence, agentStatus, AgentStatusDot } from '@/components/agents/AgentCard';
import { CardWatermark } from '@/components/ui/card-watermark';
import { RecentTasks } from '@/components/tasks/RecentTasks';
import { RekuestUnavailable, TasksLoadingState } from '@/components/tasks/states';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { implementationRoute } from '@/lib/rekuest/agents/routes';
import { type AgentImplementationFragment, type DetailAgentFragment, useDetailAgentQuery } from '@/lib/rekuest/api/graphql';
import { formatTaskTime } from '@/lib/rekuest/taskStatus';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { type Href, Link, useLocalSearchParams } from 'expo-router';
import { Bot, ChevronRight, Play } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { cn } from '@/lib/utils';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="gap-2">
    <Text className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</Text>
    {children}
  </View>
);

/** Facts about the agent, a label and a value each; the ones without a value are left out. */
const Facts = ({ facts }: { facts: [string, string | null | undefined][] }) => (
  <View className="overflow-hidden rounded-xl border border-border bg-card">
    {facts
      .filter((fact): fact is [string, string] => Boolean(fact[1]))
      .map(([label, value], index) => (
        <View key={label} className={`flex-row justify-between gap-4 px-4 py-2.5 ${index > 0 ? 'border-t border-border' : ''}`}>
          <Text className="text-sm text-muted-foreground">{label}</Text>
          <Text selectable numberOfLines={1} className="flex-1 text-right text-sm text-foreground">
            {value}
          </Text>
        </View>
      ))}
  </View>
);

/** One thing the agent can run, opening the form that runs it there. */
function ImplementationRow({ implementation: i, connected }: { implementation: AgentImplementationFragment; connected: boolean }) {
  const colors = useThemeColors();
  return (
    <Link href={implementationRoute(i.id) as Href} asChild>
      <Pressable className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3 active:bg-muted">
        <View className={`h-9 w-9 items-center justify-center rounded-full ${connected ? 'bg-primary/10' : 'bg-muted'}`}>
          {i.action.logo ? (
            <ActionLogo action={i.action} className="h-6 w-6" />
          ) : (
            <Play size={15} color={connected ? colors.primary : colors.mutedForeground} />
          )}
        </View>
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base font-medium text-foreground">
            {i.action.name}
          </Text>
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {i.action.description || i.interface}
          </Text>
        </View>
        <ChevronRight size={16} color={colors.mutedForeground} />
      </Pressable>
    </Link>
  );
}

function Agent({ agent, refreshing, onRefresh }: { agent: DetailAgentFragment; refreshing: boolean; onRefresh: () => void }) {
  const colors = useThemeColors();
  const implementations = React.useMemo(
    () => [...agent.implementations].sort((a, b) => a.action.name.localeCompare(b.action.name)),
    [agent.implementations],
  );
  const status = agentStatus(agent);
  const tone = agent.blocked ? 'text-destructive' : agent.connected ? 'text-success' : 'text-muted-foreground';

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Its card, large: the theme colour while connected, its logo faint behind it (as its tile in the list). */}
      <View
        className={cn(
          'flex-row items-center gap-3 overflow-hidden rounded-2xl border p-4',
          status === 'blocked'
            ? 'border-destructive/45 bg-destructive/10'
            : status === 'online'
              ? 'border-primary/25 bg-primary/10'
              : 'border-border bg-muted/40',
        )}
      >
        <CardWatermark size="45%">
          {agent.logo?.blok ? (
            <AgentLogo agent={agent} className="h-full w-full" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Bot size={120} strokeWidth={1.25} color={colors.foreground} />
            </View>
          )}
        </CardWatermark>
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-background/70">
          {agent.logo ? <AgentLogo agent={agent} className="h-10 w-10" /> : <Bot size={24} color={colors.mutedForeground} />}
        </View>
        <View className="flex-1 gap-1">
          <Text selectable className="text-xl font-semibold text-foreground">
            {agent.app.identifier}
          </Text>
          {agent.name && agent.name !== agent.app.identifier ? (
            <Text selectable numberOfLines={1} className="text-sm text-muted-foreground">
              {agent.name}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <AgentStatusDot status={status} className="h-2 w-2" />
            <Text className={`text-sm ${tone}`}>{agentPresence(agent)}</Text>
            {/* As orkestrator flags it: the server holds it active without a live connection, or the reverse. */}
            {agent.active !== agent.connected && !agent.blocked ? (
              <Text className="rounded-md border border-border px-1.5 text-[11px] text-muted-foreground">Mismatch</Text>
            ) : null}
            {agent.pinned ? <Text className="rounded-md border border-border px-1.5 text-[11px] text-muted-foreground">Pinned</Text> : null}
          </View>
        </View>
      </View>

      <Section title="Agent">
        <Facts
          facts={[
            ['App', agent.app.identifier],
            ['Version', agent.release.version],
            ['Kind', agent.kind.toLowerCase()],
            ['Device', agent.device?.deviceId],
            ['Last seen', formatTaskTime(agent.lastSeen)],
            ['Installed', formatTaskTime(agent.installedAt)],
          ]}
        />
      </Section>

      <Section title={`Actions · ${implementations.length}`}>
        {implementations.length ? (
          <View className="overflow-hidden rounded-xl border border-border">
            {implementations.map((implementation) => (
              <ImplementationRow key={implementation.id} implementation={implementation} connected={agent.connected} />
            ))}
          </View>
        ) : (
          <Text className="px-1 text-sm text-muted-foreground">This agent offers no actions.</Text>
        )}
      </Section>

      <RecentTasks filter={{ agent: agent.id }} />
    </ScrollView>
  );
}

function AgentContent({ id }: { id: string }) {
  const { data, loading, error, refetch } = useDetailAgentQuery({ variables: { id }, fetchPolicy: 'cache-and-network' });
  const [refreshing, setRefreshing] = React.useState(false);
  useTabTitle(data?.agent.name);

  if (!data?.agent) {
    if (loading) return <TasksLoadingState message="Loading agent…" />;
    return <Text className="p-4 text-sm text-destructive">{error?.message ?? 'This agent was not found.'}</Text>;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // What was there stays.
    } finally {
      setRefreshing(false);
    }
  };

  return <Agent agent={data.agent} refreshing={refreshing} onRefresh={() => void onRefresh()} />;
}

/** One agent: whether it is there, what it runs on, what it offers and what it last did. Orkestrator's `AgentPage`. */
export default function AgentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<TasksLoadingState message="Connecting…" />}>
        <Guard.Rekuest fallback={<RekuestUnavailable />}>
          <AgentContent key={id} id={id} />
        </Guard.Rekuest>
      </Guard.Lok>
    </View>
  );
}
