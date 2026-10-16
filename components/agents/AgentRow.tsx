import { AgentLogo } from '@/components/agents/AgentLogo';
import { Text } from '@/components/ui/text';
import { agentRoute } from '@/lib/rekuest/agents/routes';
import type { ListAgentFragment } from '@/lib/rekuest/api/graphql';
import { formatTaskTime } from '@/lib/rekuest/taskStatus';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link, type Href } from 'expo-router';
import { Bot } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

/** Whether an agent is there: connected, or when it was last seen. */
export const agentPresence = (agent: Pick<ListAgentFragment, 'connected' | 'blocked' | 'lastSeen'>): string =>
  agent.blocked ? 'Blocked' : agent.connected ? 'Online' : agent.lastSeen ? `Seen ${formatTaskTime(agent.lastSeen)}` : 'Offline';

/** One agent: its logo, which app it runs, and whether it is there. */
export function AgentRow({ agent }: { agent: ListAgentFragment }) {
  const colors = useThemeColors();
  const tone = agent.blocked ? 'text-destructive' : agent.connected ? 'text-primary' : 'text-muted-foreground';
  return (
    <Link href={agentRoute(agent.id) as Href} asChild>
      <Pressable className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3 active:bg-muted">
        <View className={`h-9 w-9 items-center justify-center rounded-full ${agent.connected ? 'bg-primary/10' : 'bg-muted'}`}>
          {agent.logo ? (
            <AgentLogo agent={agent} className="h-6 w-6" />
          ) : (
            <Bot size={16} color={agent.connected ? colors.primary : colors.mutedForeground} />
          )}
        </View>
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base font-medium text-foreground">
            {agent.name}
          </Text>
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {agent.app.identifier} · {agent.release.version}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className={`h-2 w-2 rounded-full ${agent.blocked ? 'bg-destructive' : agent.connected ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
          <Text className={`text-xs ${tone}`}>{agentPresence(agent)}</Text>
        </View>
      </Pressable>
    </Link>
  );
}
