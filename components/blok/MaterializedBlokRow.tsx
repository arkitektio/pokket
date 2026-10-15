import { Text } from '@/components/ui/text';
import type { ListMaterializedBlokFragment } from '@/lib/rekuest/api/graphql';
import { blokRoute } from '@/lib/rekuest/blok/route';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link, type Href } from 'expo-router';
import { LayoutDashboard } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

/** Whether every agent the blok is bound to is there to act on it. */
export const allConnected = (blok: Pick<ListMaterializedBlokFragment, 'agentMappings'>): boolean =>
  blok.agentMappings.every((mapping) => mapping.agent.connected);

/** One materialized blok: its name, the blok it shows, and the agents it is bound to. */
export function MaterializedBlokRow({ blok }: { blok: ListMaterializedBlokFragment }) {
  const colors = useThemeColors();
  const live = blok.agentMappings.length > 0 && allConnected(blok);
  const agents = blok.agentMappings.map((mapping) => mapping.agent.name).join(', ');
  return (
    <Link href={blokRoute(blok.id) as Href} asChild>
      <Pressable className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3 active:bg-muted">
        <View className={`h-9 w-9 items-center justify-center rounded-full ${live ? 'bg-primary/10' : 'bg-muted'}`}>
          <LayoutDashboard size={15} color={live ? colors.primary : colors.mutedForeground} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base font-medium text-foreground">
            {blok.name || blok.blok.name}
          </Text>
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {blok.description || blok.blok.description || (agents ? `On ${agents}` : blok.blok.name)}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
