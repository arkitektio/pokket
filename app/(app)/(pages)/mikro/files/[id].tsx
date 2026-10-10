import { DetailPage } from '@/components/mikro/Detail';
import { Fact, FactsCard, Heading, Section } from '@/components/mikro/Facts';
import { MikroRow } from '@/components/mikro/MikroRow';
import { MIKRO_ICONS } from '@/components/mikro/rows';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useDatalayer } from '@/lib/datalayer/useDatalayer';
import { GetFileDocument, type DetailFileFragment, type GetFileQuery } from '@/lib/mikro/api/graphql';
import { bytesLabel, extensionOf, mikroRoute } from '@/lib/mikro/format';
import { downloadAndShareFile } from '@/lib/mikro/media/download';
import { useMikroClient } from '@/lib/mikro/media/useMediaUrl';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Download } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { toast } from 'sonner-native';

/** Raw files run to gigabytes; say so before pulling one over mobile data. */
const LARGE_BYTES = 200_000_000;

function DownloadButton({ file }: { file: DetailFileFragment }) {
  const colors = useThemeColors();
  const client = useMikroClient();
  const datalayer = useDatalayer();
  const [busy, setBusy] = React.useState(false);
  if (!datalayer) return null;

  const download = async () => {
    setBusy(true);
    try {
      await downloadAndShareFile(file.id, client, datalayer);
    } catch (e) {
      toast.error(`Could not download: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-2 px-4 pb-4">
      <Button onPress={() => void download()} disabled={busy} className="flex-row gap-2">
        {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Download size={16} color={colors.primaryForeground} />}
        <Text>{busy ? 'Downloading…' : 'Download'}</Text>
      </Button>
      {(file.size ?? 0) > LARGE_BYTES ? (
        <Text className="text-center text-xs text-muted-foreground">
          This is a large file ({bytesLabel(file.size)}). It is downloaded whole before it can be saved.
        </Text>
      ) : null}
    </View>
  );
}

/** An uploaded raw file: what it is, what was made of it, and a way to get it onto the phone. */
export default function FileScreen() {
  return (
    <DetailPage document={GetFileDocument} pick={(data: GetFileQuery) => data.file} title={(file) => file.name} what="file">
      {(file) => (
        <>
          <Heading title={file.name} detail={bytesLabel(file.size)} />
          <DownloadButton file={file} />
          <FactsCard>
            <Fact label="Size" value={bytesLabel(file.size)} />
            <Fact label="Type" value={file.contentType} />
            <Fact label="Extension" value={extensionOf(file.name)} />
          </FactsCard>
          <Section
            title="In folder"
            items={file.folder ? [file.folder] : []}
            render={(folder) => (
              <MikroRow key={folder.id} href={mikroRoute.folder(folder.id)} icon={MIKRO_ICONS.folder} title={folder.name} />
            )}
          />
          <Section
            title="Made from this file"
            items={file.derivedContainers.flatMap((link) => {
              const made = link.container;
              if (made.__typename === 'ArrayDataset') {
                return [{ key: link.id, href: mikroRoute.arrayDataset(made.id), icon: MIKRO_ICONS.arrayDataset, title: made.name, detail: link.seriesIdentifier ?? undefined }];
              }
              if (made.__typename === 'TableDataset') {
                return [{ key: link.id, href: mikroRoute.tableDataset(made.id), icon: MIKRO_ICONS.tableDataset, title: made.name, detail: link.seriesIdentifier ?? undefined }];
              }
              return [];
            })}
            render={({ key, ...row }) => <MikroRow key={key} {...row} />}
          />
        </>
      )}
    </DetailPage>
  );
}
