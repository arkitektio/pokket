import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { profileTitle } from '@/lib/arkitekt/fakts/profileStorageSchema';
import { useDatalayer } from '@/lib/datalayer/useDatalayer';
import { SHARE_DESTINATIONS, type ShareContext } from '@/lib/share/destinations';
import { discardSharedFiles, sharedFiles, type SharedFile } from '@/lib/share/files';
import { useShareUploads, type UploadState } from '@/lib/share/useShareUploads';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { useIncomingShare } from 'expo-sharing';
import { router } from 'expo-router';
import { Check, CircleAlert, File as FileIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formatSize = (bytes: number | null): string => {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
};

function FileRow({ file, state }: { file: SharedFile; state: UploadState }) {
  const colors = useThemeColors();
  return (
    <View className="gap-1 rounded-xl border border-border bg-card px-3 py-3">
      <View className="flex-row items-center gap-3">
        <FileIcon size={18} color={colors.mutedForeground} />
        <View className="flex-1">
          <Text className="text-base text-card-foreground" numberOfLines={1}>
            {file.name}
          </Text>
          <Text className="text-xs text-muted-foreground">{[formatSize(file.size), file.mimeType].filter(Boolean).join(' · ')}</Text>
        </View>
        {state.status === 'sending' ? <ActivityIndicator color={colors.primary} /> : null}
        {state.status === 'done' ? <Check size={18} color={colors.primary} /> : null}
        {state.status === 'failed' ? <CircleAlert size={18} color={colors.destructive} /> : null}
      </View>
      {state.status === 'sending' ? (
        <View className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
          <View className="h-1 rounded-full bg-primary" style={{ width: `${Math.round(state.fraction * 100)}%` }} />
        </View>
      ) : null}
      {state.status === 'failed' ? <Text className="text-xs text-destructive">{state.message}</Text> : null}
    </View>
  );
}

/**
 * What was shared to the app from another one: the files, where they would go,
 * and one tap to send them. The share menu brings the app here (`ShareGate`).
 * Leaving, however it happens, stops the upload and drops the share.
 */
export default function ShareScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { sharedPayloads, resolvedSharedPayloads, isResolving, error, clearSharedPayloads } = useIncomingShare();
  const files = React.useMemo(() => sharedFiles(resolvedSharedPayloads), [resolvedSharedPayloads]);

  const active = App.useActiveProfile();
  const datalayer = useDatalayer();
  const serviceMap = App.useConnection()?.serviceMap as Record<string, { client: unknown } | undefined> | undefined;
  const destinations = SHARE_DESTINATIONS.filter((destination) => serviceMap?.[destination.service]);

  const [destinationKey, setDestinationKey] = React.useState(destinations[0]?.key);
  const destination = destinations.find((candidate) => candidate.key === destinationKey) ?? destinations[0];
  const [options, setOptions] = React.useState<Record<string, unknown>>({});
  const destinationOptions = destination ? (options[destination.key] ?? destination.initialOptions) : undefined;

  const context: ShareContext | null =
    destination && datalayer
      ? { client: serviceMap?.[destination.service]?.client as ShareContext['client'], datalayer }
      : null;

  const { stateOf, start, running, allDone, anyFailed } = useShareUploads(files, (file, upload) => {
    if (!destination || !context) throw new Error('This organization has nowhere to put files.');
    return destination.send(file, destinationOptions, context, upload);
  });

  const leftBehind = React.useRef(files);
  React.useEffect(() => {
    leftBehind.current = files;
  }, [files]);
  React.useEffect(
    () => () => {
      discardSharedFiles(leftBehind.current);
      clearSharedPayloads();
    },
    [clearSharedPayloads],
  );

  const leave = () => router.back();
  // Resolving only starts after the first render.
  const reading = isResolving || (sharedPayloads.length > 0 && resolvedSharedPayloads.length === 0 && !error);
  const nothingToSend = !reading && files.length === 0;
  const OptionsForm = destination?.OptionsForm;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}>
      <View className="gap-1 px-4 pb-3">
        <Text className="text-xl font-semibold text-foreground">
          {files.length > 1 ? `Upload ${files.length} files` : 'Upload a file'}
        </Text>
        {active ? <Text className="text-sm text-muted-foreground">To {profileTitle(active)}</Text> : null}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-4">
        {reading ? <ActivityIndicator className="py-8" color={colors.primary} /> : null}
        {error ? <Text className="text-sm text-destructive">Could not read what was shared: {error.message}</Text> : null}
        {nothingToSend && !error ? (
          <Text className="py-8 text-center text-sm text-muted-foreground">
            There is nothing to upload here. Only files can be shared to Orkestrator.
          </Text>
        ) : null}

        {files.length > 0 ? (
          <View className="gap-2">
            {files.map((file) => (
              <FileRow key={file.uri} file={file} state={stateOf(file)} />
            ))}
          </View>
        ) : null}

        {files.length > 0 && !context ? (
          <Text className="text-sm text-muted-foreground">
            This organization has nowhere to put files: it needs Mikro and a datalayer.
          </Text>
        ) : null}

        {files.length > 0 && destinations.length > 1 ? (
          <View className="gap-1">
            <Text className="px-1 pb-1 text-sm font-medium text-muted-foreground">Send to</Text>
            {destinations.map((candidate) => (
              <Pressable
                key={candidate.key}
                onPress={() => setDestinationKey(candidate.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: candidate === destination }}
                className={`rounded-xl px-3 py-3 active:bg-muted ${candidate === destination ? 'bg-muted' : ''}`}
              >
                <Text className="text-base text-foreground">{candidate.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {files.length > 0 && context && destination && OptionsForm ? (
          <OptionsForm
            value={destinationOptions}
            onChange={(next) => setOptions((current) => ({ ...current, [destination.key]: next }))}
          />
        ) : null}
      </ScrollView>

      <View className="flex-row gap-3 px-4 pt-3">
        {allDone ? (
          <Button className="flex-1" onPress={leave}>
            <Text>Done</Text>
          </Button>
        ) : (
          <>
            <Button className="flex-1" variant="outline" onPress={leave}>
              <Text>Cancel</Text>
            </Button>
            {files.length > 0 && context ? (
              <Button className="flex-1" disabled={running} onPress={() => void start()}>
                <Text>{running ? 'Uploading…' : anyFailed ? 'Try again' : 'Upload'}</Text>
              </Button>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
