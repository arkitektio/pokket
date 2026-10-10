import { MikroRow } from '@/components/mikro/MikroRow';
import { PagedList } from '@/components/mikro/PagedList';
import { describeFolder } from '@/components/mikro/rows';
import { MikroScreen } from '@/components/mikro/states';
import { GetFoldersDocument, type ListFolderFragment } from '@/lib/mikro/api/graphql';

export default function FoldersScreen() {
  return (
    <MikroScreen>
      <PagedList<ListFolderFragment>
        document={GetFoldersDocument}
        field="folders"
        filters={{ parentless: true }}
        ordering={[{ name: 'ASC' }]}
        renderItem={(item) => <MikroRow {...describeFolder(item)} />}
        what="folders"
        empty={{ title: 'No folders', description: 'Folders organise datasets and files. None have been made yet.' }}
      />
    </MikroScreen>
  );
}
