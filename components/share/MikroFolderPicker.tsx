import { Text } from '@/components/ui/text';
import { Ordering, useGetFoldersQuery } from '@/lib/mikro/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Check, Folder } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

export type MikroShareOptions = {
  /** Left out, the file goes to the organization's default folder. */
  folder?: string;
};

const FOLDERS_SHOWN = 200;

/** Which folder the files go to: the default one, unless another is picked. */
export function MikroFolderPicker({
  value,
  onChange,
}: {
  value: MikroShareOptions;
  onChange: (next: MikroShareOptions) => void;
}) {
  const colors = useThemeColors();
  const { data, loading, error } = useGetFoldersQuery({
    variables: { ordering: [{ name: Ordering.Asc }], pagination: { limit: FOLDERS_SHOWN } },
    fetchPolicy: 'cache-and-network',
  });
  const folders = [...(data?.folders ?? [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

  return (
    <View className="gap-1">
      <Text className="px-1 pb-1 text-sm font-medium text-muted-foreground">Folder</Text>
      {loading && !data ? <ActivityIndicator className="py-4" color={colors.primary} /> : null}
      {error && !data ? (
        <Text className="px-1 py-2 text-sm text-muted-foreground">
          Could not load the folders. The files will go to the default folder.
        </Text>
      ) : null}
      {folders.map((folder) => {
        const picked = value.folder ? value.folder === folder.id : folder.isDefault;
        return (
          <Pressable
            key={folder.id}
            onPress={() => onChange({ folder: folder.isDefault ? undefined : folder.id })}
            accessibilityRole="radio"
            accessibilityState={{ selected: picked }}
            className={`flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-muted ${picked ? 'bg-muted' : ''}`}
          >
            <Folder size={18} color={colors.mutedForeground} />
            <Text className="flex-1 text-base text-foreground" numberOfLines={1}>
              {folder.name}
              {folder.isDefault ? <Text className="text-sm text-muted-foreground"> (default)</Text> : null}
            </Text>
            {picked ? <Check size={18} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
