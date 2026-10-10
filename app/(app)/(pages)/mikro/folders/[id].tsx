import { Fact, FactsCard, Heading, Section } from '@/components/mikro/Facts';
import { MikroRow } from '@/components/mikro/MikroRow';
import { describeArrayDataset, describeFile, describeFolder, describeTableDataset } from '@/components/mikro/rows';
import { MikroEmptyState, MikroLoadingState, MikroMissing, MikroScreen } from '@/components/mikro/states';
import { Text } from '@/components/ui/text';
import { useChildrenQuery, useGetFolderQuery, type ChildrenQuery } from '@/lib/mikro/api/graphql';
import { dayLabel } from '@/lib/mikro/format';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { useLocalSearchParams } from 'expo-router';
import { Search } from 'lucide-react-native';
import * as React from 'react';
import { RefreshControl, ScrollView, TextInput, View } from 'react-native';

type Child = ChildrenQuery['children'][number];
const of = <T extends Child['__typename']>(children: readonly Child[], typename: T) =>
  children.filter((child): child is Extract<Child, { __typename?: T }> => child.__typename === typename);

/** Orkestrator's cap for one folder; a phone list of more is not browsable anyway. */
const LIMIT = 200;

function Contents({ id }: { id: string }) {
  const colors = useThemeColors();
  const [term, setTerm] = React.useState('');
  const [search, setSearch] = React.useState('');
  React.useEffect(() => {
    const timeout = setTimeout(() => setSearch(term.trim()), 300);
    return () => clearTimeout(timeout);
  }, [term]);

  const folder = useGetFolderQuery({ variables: { id }, fetchPolicy: 'cache-and-network' });
  const contents = useChildrenQuery({
    variables: { id, pagination: { limit: LIMIT }, filters: search ? { search } : undefined },
    fetchPolicy: 'cache-and-network',
  });
  const item = folder.data?.folder;
  useTabTitle(item?.name);
  const [refreshing, setRefreshing] = React.useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([folder.refetch(), contents.refetch()]);
    } catch {
      // What was loaded stays on screen.
    } finally {
      setRefreshing(false);
    }
  };

  if (!item) return <MikroMissing loading={folder.loading} error={folder.error} what="folder" />;
  const children = contents.data?.children ?? [];
  const shown = of(children, 'Folder').length + of(children, 'ArrayDataset').length + of(children, 'TableDataset').length + of(children, 'File').length;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
    >
      <Heading title={item.name} detail={item.description} />
      <FactsCard>
        <Fact label="Created" value={dayLabel(item.createdAt)} />
        <Fact label="Tags" value={item.tags.join(', ')} />
        <Fact label="Pinned" value={item.pinned ? 'Yes' : null} />
      </FactsCard>
      <Section title="Inside" items={item.parent ? [item.parent] : []} render={(parent) => <MikroRow key={parent.id} {...describeFolder(parent)} />} />
      <View className="mx-4 mb-1 mt-2 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
        <Search size={18} color={colors.mutedForeground} />
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Search this folder"
          placeholderTextColor={colors.mutedForeground}
          autoCorrect={false}
          autoCapitalize="none"
          style={{ color: colors.foreground }}
          className="flex-1 py-3 text-base"
        />
      </View>
      {contents.error ? <Text className="px-4 py-2 text-sm text-destructive">{contents.error.message}</Text> : null}
      {!contents.data && contents.loading ? <MikroLoadingState message="Loading contents…" /> : null}
      <Section title="Folders" items={of(children, 'Folder')} render={(child) => <MikroRow key={child.id} {...describeFolder(child)} />} />
      <Section title="Datasets" items={of(children, 'ArrayDataset')} render={(child) => <MikroRow key={child.id} {...describeArrayDataset(child)} />} />
      <Section title="Tables" items={of(children, 'TableDataset')} render={(child) => <MikroRow key={child.id} {...describeTableDataset(child)} />} />
      <Section title="Files" items={of(children, 'File')} render={(child) => <MikroRow key={child.id} {...describeFile(child)} />} />
      {contents.data && shown === 0 ? (
        <MikroEmptyState
          title={search ? 'Nothing matches' : 'This folder is empty'}
          description={search ? `Nothing in this folder matches “${search}”.` : 'Move datasets and files into it from the desktop.'}
        />
      ) : null}
      {children.length >= LIMIT ? (
        <Text className="px-4 pt-3 text-center text-xs text-muted-foreground">Showing the first {LIMIT}. Search to find the rest.</Text>
      ) : null}
    </ScrollView>
  );
}

/** A folder and what it holds: subfolders, datasets, tables and files. */
export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <MikroScreen>
      <Contents id={id} />
    </MikroScreen>
  );
}
