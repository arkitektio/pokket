import { Text } from '@/components/ui/text';
import type { ListCallFragment } from '@/lib/lovekit/api/graphql';
import { callRoute } from '@/lib/lovekit/call/links';
import { useCallState } from '@/lib/lovekit/call/store';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link, type Href } from 'expo-router';
import { Phone, Users } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

/** One call in progress: its title, how many are in it, who started it. */
export function CallRow({ call }: { call: ListCallFragment }) {
  const colors = useThemeColors();
  const joined = useCallState((state) => state.call?.id === call.id);
  return (
    <Link href={callRoute(call.id) as Href} asChild>
      <Pressable className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3 active:bg-muted">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Phone size={16} color={colors.primary} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base font-medium text-foreground">
            {call.title}
          </Text>
          <View className="flex-row items-center gap-1">
            <Users size={12} color={colors.mutedForeground} />
            <Text numberOfLines={1} className="text-xs text-muted-foreground">
              {call.participantCount} · {call.creator?.preferredUsername ?? 'someone'}
            </Text>
          </View>
        </View>
        {joined ? <Text className="text-xs font-medium text-primary">You are in it</Text> : null}
      </Pressable>
    </Link>
  );
}
