import { Text } from '@/components/ui/text';
import type { ListActionFragment } from '@/lib/rekuest/api/graphql';
import { actionRoute } from '@/lib/rekuest/assign/runOrAsk';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link, type Href } from 'expo-router';
import { Play } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

/** How many agents could run it right now. */
export const connectedAgents = (action: Pick<ListActionFragment, 'implementations'>): number =>
  new Set(action.implementations.filter((i) => i.agent.connected).map((i) => i.agent.id)).size;

/** One action: what it does, which app brings it, and whether anything is there to run it. */
export function ActionRow({ action }: { action: ListActionFragment }) {
  const colors = useThemeColors();
  const agents = connectedAgents(action);
  return (
    <Link href={actionRoute(action.id) as Href} asChild>
      <Pressable className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3 active:bg-muted">
        <View className={`h-9 w-9 items-center justify-center rounded-full ${agents ? 'bg-primary/10' : 'bg-muted'}`}>
          <Play size={15} color={agents ? colors.primary : colors.mutedForeground} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base font-medium text-foreground">
            {action.name}
          </Text>
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {action.description || action.app.identifier}
          </Text>
        </View>
        <Text className={`text-xs ${agents ? 'text-primary' : 'text-muted-foreground'}`}>
          {agents ? (agents === 1 ? '1 agent' : `${agents} agents`) : 'offline'}
        </Text>
      </Pressable>
    </Link>
  );
}
