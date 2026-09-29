import { NamePlaceDialog } from '@/components/timeline/NamePlaceDialog';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useAlertDialog } from '@/components/ui/alert-dialog';
import { deletePlace, loadPlace, PlaceRow, renamePlace, VisitRow } from '@/lib/timeline/db';
import { formatDuration, formatTime } from '@/lib/timeline/format';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

/** A named place: rename it, forget it, and see when you were there. */
export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const dialog = useAlertDialog();
  const [data, setData] = React.useState<{ place: PlaceRow | null; visits: VisitRow[] } | null>(null);
  const [renaming, setRenaming] = React.useState(false);

  const load = React.useCallback(() => {
    void loadPlace(id).then(setData);
  }, [id]);
  React.useEffect(load, [load]);

  if (!data) return <ActivityIndicator className="mt-8" color={colors.primary} />;
  const { place, visits } = data;
  if (!place) return <Text className="p-6 text-muted-foreground">This place was deleted.</Text>;

  const total = visits.reduce((sum, v) => sum + (v.end_ts - v.start_ts), 0);

  return (
    <ScrollView className="flex-1 bg-background">
      <Stack.Screen options={{ title: place.name }} />
      <View className="gap-4 px-4 py-4">
        <Text className="text-sm text-muted-foreground">
          {visits.length} visits · {formatDuration(total)} in total
          {visits.length >= 200 ? ' (latest 200)' : ''}
        </Text>
        <View className="flex-row gap-2">
          <Pressable onPress={() => setRenaming(true)} className="rounded-lg bg-muted px-3 py-2 active:opacity-70">
            <Text className="text-sm text-foreground">Rename</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              dialog.show('Forget this place?', 'Its visits stay in the timeline, unnamed.', [
                { label: 'Cancel', variant: 'cancel' },
                {
                  label: 'Forget',
                  variant: 'destructive',
                  onPress: () => void deletePlace(place.id).then(() => router.back()),
                },
              ])
            }
            className="rounded-lg bg-muted px-3 py-2 active:opacity-70"
          >
            <Text className="text-sm text-destructive">Forget place</Text>
          </Pressable>
        </View>
        <Card className="overflow-hidden border-border bg-card">
          {visits.map((v) => (
            <View key={v.id} className="flex-row justify-between border-b border-border px-4 py-3">
              <Text className="text-sm text-card-foreground">
                {new Date(v.start_ts).toLocaleDateString()} · {formatTime(v.start_ts)} – {formatTime(v.end_ts)}
              </Text>
              <Text className="text-sm text-muted-foreground">{formatDuration(v.end_ts - v.start_ts)}</Text>
            </View>
          ))}
        </Card>
      </View>
      <NamePlaceDialog
        visible={renaming}
        at={place}
        title="Rename place"
        initialName={place.name}
        onCancel={() => setRenaming(false)}
        onSave={(name) => {
          setRenaming(false);
          void renamePlace(place.id, name).then(load);
        }}
      />
    </ScrollView>
  );
}
