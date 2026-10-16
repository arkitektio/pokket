import { BlokSceneFillProvider } from '@/components/blok/catalog/scene/host';
import MaterializedBlokRenderer from '@/components/blok/MaterializedBlokRenderer';
import { RekuestUnavailable, TasksLoadingState } from '@/components/tasks/states';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { CanvasVisibleContext } from '@/lib/gpu/FiberCanvas';
import { ComponentContext, useMaterializedBlokQuery } from '@/lib/rekuest/api/graphql';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { Unplug } from 'lucide-react-native';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';

function BlokContent({ id }: { id: string }) {
  const colors = useThemeColors();
  const focused = useIsFocused();
  const [refreshing, setRefreshing] = React.useState(false);
  const { data, loading, error, refetch } = useMaterializedBlokQuery({ variables: { id }, fetchPolicy: 'cache-and-network' });
  const materialized = data?.materializedBlok;
  useTabTitle(materialized ? materialized.name || materialized.blok.name : undefined);

  if (!materialized) {
    if (loading) return <TasksLoadingState message="Loading blok…" />;
    return <Text className="p-4 text-sm text-destructive">{error?.message ?? 'This blok was not found.'}</Text>;
  }

  const offline = materialized.agentMappings.filter((mapping) => !mapping.agent.connected);
  const unbound = materialized.blok.dependencies.filter(
    (dependency) => !dependency.optional && !materialized.agentMappings.some((mapping) => mapping.key === dependency.key),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // The query error shows in place.
    } finally {
      setRefreshing(false);
    }
  };

  const warning =
    offline.length > 0 || unbound.length > 0 ? (
      <View className="flex-row items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
        <Unplug size={16} color={colors.mutedForeground} />
        <Text className="flex-1 text-sm text-foreground">
          {offline.length > 0
            ? `${offline.map((mapping) => mapping.agent.name).join(', ')} ${offline.length === 1 ? 'is' : 'are'} not connected: live values may be stale and actions will wait. `
            : ''}
          {unbound.length > 0 ? `Not bound to an agent: ${unbound.map((dependency) => dependency.key).join(', ')}.` : ''}
        </Text>
      </View>
    ) : null;

  // A 3D view is the whole screen: the fingers turn it, so nothing scrolls under them.
  if (materialized.blok.context === ComponentContext.Scene) {
    return (
      <View className="flex-1 bg-background">
        {warning ? <View className="px-4 pt-3">{warning}</View> : null}
        <CanvasVisibleContext.Provider value={focused}>
          <BlokSceneFillProvider value>
            <View className="flex-1">
              <MaterializedBlokRenderer key={materialized.id} materializedBlok={materialized} fill />
            </View>
          </BlokSceneFillProvider>
        </CanvasVisibleContext.Provider>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />}
      >
        <View className="gap-1 pb-4">
          <Text selectable className="text-xl font-semibold text-foreground">
            {materialized.name || materialized.blok.name}
          </Text>
          {materialized.description || materialized.blok.description ? (
            <Text className="text-sm text-muted-foreground">{materialized.description || materialized.blok.description}</Text>
          ) : null}
          {materialized.agentMappings.length > 0 ? (
            <Text className="text-xs text-muted-foreground">
              On {materialized.agentMappings.map((mapping) => mapping.agent.name).join(', ')}
            </Text>
          ) : null}
        </View>

        {warning ? <View className="mb-4">{warning}</View> : null}

        <MaterializedBlokRenderer key={materialized.id} materializedBlok={materialized} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function BlokScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<TasksLoadingState message="Connecting…" />}>
        <Guard.Rekuest fallback={<RekuestUnavailable />}>
          <BlokContent key={id} id={id} />
        </Guard.Rekuest>
      </Guard.Lok>
    </View>
  );
}
