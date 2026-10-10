import { SectionTitle } from '@/components/mikro/Facts';
import { MikroRow, MikroTile } from '@/components/mikro/MikroRow';
import { describeArrayDataset, describeFile, describeFolder, describeLens } from '@/components/mikro/rows';
import { MikroEmptyState, MikroLoadingState, MikroScreen } from '@/components/mikro/states';
import { Text } from '@/components/ui/text';
import { useMikroHomeQuery } from '@/lib/mikro/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Link, type Href } from 'expo-router';
import { Pin } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

function SectionHead({ title, more }: { title: string; more: string }) {
  return (
    <View className="flex-row items-end justify-between pr-4">
      <SectionTitle title={title} />
      <Link href={more as Href} asChild>
        <Pressable hitSlop={8} className="pb-2 active:opacity-60">
          <Text className="text-xs font-medium text-primary">See all</Text>
        </Pressable>
      </Link>
    </View>
  );
}

function Tiles({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4 pb-2">
      {children}
    </ScrollView>
  );
}

/** Mikro's front page: the newest of each kind, as orkestrator's home stacks them. */
function HomeContent() {
  const colors = useThemeColors();
  const { data, loading, error, refetch } = useMikroHomeQuery({ fetchPolicy: 'cache-and-network' });
  const [refreshing, setRefreshing] = React.useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // The error shows on the page.
    } finally {
      setRefreshing(false);
    }
  };

  if (!data) {
    if (loading) return <MikroLoadingState message="Loading Mikro…" />;
    return <Text className="p-4 text-sm text-destructive">{error?.message ?? 'Could not load Mikro.'}</Text>;
  }

  const pinnedIds = new Set(data.pinned.map((folder) => folder.id));
  const folders = [...data.pinned, ...data.folders.filter((folder) => !pinnedIds.has(folder.id))];
  const empty = !data.lenses.length && !data.arrayDatasets.length && !folders.length && !data.files.length;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
    >
      {empty ? (
        <MikroEmptyState title="Nothing here yet" description="Upload or acquire data from the desktop and it shows up here." />
      ) : null}
      {data.arrayDatasets.length ? (
        <>
          <SectionHead title="Datasets" more="/mikro/arraydatasets" />
          <Tiles>
            {data.arrayDatasets.map((dataset) => (
              <MikroTile key={dataset.id} {...describeArrayDataset(dataset)} />
            ))}
          </Tiles>
        </>
      ) : null}
      {data.lenses.length ? (
        <>
          <SectionHead title="Lenses" more="/mikro/lenses" />
          <Tiles>
            {data.lenses.map((lens) => (
              <MikroTile key={lens.id} {...describeLens(lens)} />
            ))}
          </Tiles>
        </>
      ) : null}
      {folders.length ? (
        <>
          <SectionHead title="Folders" more="/mikro/folders" />
          <View className="border-t border-border">
            {folders.map((folder) => (
              <MikroRow
                key={folder.id}
                {...describeFolder(folder)}
                trailing={pinnedIds.has(folder.id) ? <Pin size={14} color={colors.mutedForeground} /> : null}
              />
            ))}
          </View>
        </>
      ) : null}
      {data.files.length ? (
        <>
          <SectionHead title="Files" more="/mikro/files" />
          <View className="border-t border-border">
            {data.files.map((file) => (
              <MikroRow key={file.id} {...describeFile(file)} />
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

export default function MikroScreenHome() {
  return (
    <MikroScreen>
      <HomeContent />
    </MikroScreen>
  );
}
