import { ServiceInfo } from '@/components/navigation/ModuleGrid';
import { TimelineBackup } from '@/components/timeline/TimelineBackup';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useArkitektActions, useServiceState } from '@/lib/arkitekt/hooks';
import { showPage } from '@/lib/navigation';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ChevronRight, Route } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

/** When lokate is not connected: what the connection check found, and a retry. */
function Unreachable() {
  const state = useServiceState('lokate');
  const { retryService } = useArkitektActions();
  if (!state || state.status === 'ready') return null;
  return (
    <Card className="border-border bg-card">
      <CardContent className="gap-2 py-3">
        <Text className="text-base font-medium text-card-foreground">Lokate is not connected</Text>
        <Text className="text-sm text-muted-foreground">
          The backup needs it. Until it is reachable, the timeline keeps everything on this phone.
        </Text>
        <ServiceInfo serviceKey="lokate" />
        <Pressable onPress={() => void retryService('lokate')} className="self-start rounded-lg bg-muted px-3 py-2 active:opacity-70">
          <Text className="text-sm text-foreground">Retry connection</Text>
        </Pressable>
      </CardContent>
    </Card>
  );
}

/**
 * The organization's lokate: the timeline backup — on or off, how often, and
 * how it went. The timeline itself (recording, places, the map) is this
 * phone's, under Phone.
 */
export default function LokateScreen() {
  const colors = useThemeColors();
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-4 py-6">
        <Text className="px-1 text-sm text-muted-foreground">
          Lokate keeps a copy of your location timeline on your organization&apos;s server, readable by you alone.
        </Text>
        <Unreachable />
        <TimelineBackup />
        <Pressable
          onPress={() => showPage('/timeline')}
          className="flex-row items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 active:bg-muted"
        >
          <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Route size={18} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-card-foreground">Timeline</Text>
            <Text className="text-xs text-muted-foreground">What this phone records, and its settings</Text>
          </View>
          <ChevronRight size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </ScrollView>
  );
}
