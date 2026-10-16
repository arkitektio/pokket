import { ServiceInfo } from '@/components/navigation/ModuleGrid';
import { HomeSection, ModuleHome, PageTile } from '@/components/navigation/ModuleHome';
import { TimelineBackup } from '@/components/timeline/TimelineBackup';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useArkitektActions, useServiceState } from '@/lib/arkitekt/hooks';
import { Pressable, ScrollView, View } from 'react-native';

const TIMELINE = { label: 'Timeline', route: '/timeline', description: 'What this phone records, and its settings' };

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
 * phone's, under Phone, and linked from here.
 */
export default function LokateScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-10">
      <ModuleHome
        moduleKey="lokate"
        lead={
          <View className="gap-4 px-4">
            <Unreachable />
            <TimelineBackup />
          </View>
        }
      >
        <HomeSection title="On this phone">
          <View className="px-4">
            <PageTile link={TIMELINE} icon="route" />
          </View>
        </HomeSection>
      </ModuleHome>
    </ScrollView>
  );
}
