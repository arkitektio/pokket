import { MikroRow, MikroTile } from '@/components/mikro/MikroRow';
import { describeArrayDataset, describeFile, describeFolder, describeLens } from '@/components/mikro/rows';
import { MikroScreen } from '@/components/mikro/states';
import { HomeEmpty, HomeError, HomeLoading, HomeSection, ModuleHome } from '@/components/navigation/ModuleHome';
import { useMikroHomeQuery } from '@/lib/mikro/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import * as React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

function Tiles({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4">
      {children}
    </ScrollView>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <View className="border-t border-border">{children}</View>;
}

/**
 * What is new in mikro, under its pages: pinned folders, the newest data,
 * the newest files — orkestrator's mikro home. Each title opens its full page.
 */
function Recent({ query: { data, loading, error, refetch } }: { query: ReturnType<typeof useMikroHomeQuery> }) {
  if (!data) {
    if (loading) return <HomeLoading />;
    return <HomeError what="mikro" error={error ?? { message: 'No answer from mikro.' }} onRetry={() => void refetch()} />;
  }

  const pinnedIds = new Set(data.pinned.map((folder) => folder.id));
  const folders = data.folders.filter((folder) => !pinnedIds.has(folder.id));
  const empty =
    !data.lenses.length && !data.arrayDatasets.length && !data.pinned.length && !folders.length && !data.files.length;
  if (empty) {
    return <HomeEmpty title="No data yet">Upload or acquire data from the desktop and it shows up here.</HomeEmpty>;
  }

  return (
    <>
      {data.pinned.length ? (
        <HomeSection title="Pinned folders" more="/mikro/folders">
          <Rows>
            {data.pinned.map((folder) => (
              <MikroRow key={folder.id} {...describeFolder(folder)} />
            ))}
          </Rows>
        </HomeSection>
      ) : null}
      {data.arrayDatasets.length ? (
        <HomeSection title="Recent data" more="/mikro/arraydatasets">
          <Tiles>
            {data.arrayDatasets.map((dataset) => (
              <MikroTile key={dataset.id} {...describeArrayDataset(dataset)} />
            ))}
          </Tiles>
        </HomeSection>
      ) : null}
      {data.lenses.length ? (
        <HomeSection title="Recent lenses" more="/mikro/lenses">
          <Tiles>
            {data.lenses.map((lens) => (
              <MikroTile key={lens.id} {...describeLens(lens)} />
            ))}
          </Tiles>
        </HomeSection>
      ) : null}
      {folders.length ? (
        <HomeSection title="Recent folders" more="/mikro/folders">
          <Rows>
            {folders.map((folder) => (
              <MikroRow key={folder.id} {...describeFolder(folder)} />
            ))}
          </Rows>
        </HomeSection>
      ) : null}
      {data.files.length ? (
        <HomeSection title="Recent files" more="/mikro/files">
          <Rows>
            {data.files.map((file) => (
              <MikroRow key={file.id} {...describeFile(file)} />
            ))}
          </Rows>
        </HomeSection>
      ) : null}
    </>
  );
}

/** Mikro's front door: where to go, then what is new. */
function HomeContent() {
  const colors = useThemeColors();
  const query = useMikroHomeQuery({ fetchPolicy: 'cache-and-network' });
  const [refreshing, setRefreshing] = React.useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } catch {
      // The error shows on the page.
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
    >
      <ModuleHome moduleKey="mikro">
        <Recent query={query} />
      </ModuleHome>
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
