import { MikroRow } from '@/components/mikro/MikroRow';
import { PagedList } from '@/components/mikro/PagedList';
import { describeFile } from '@/components/mikro/rows';
import { MikroScreen } from '@/components/mikro/states';
import { GetFilesDocument, type ListFileFragment } from '@/lib/mikro/api/graphql';

export default function FilesScreen() {
  return (
    <MikroScreen>
      <PagedList<ListFileFragment>
        document={GetFilesDocument}
        field="files"
        ordering={[{ createdAt: 'DESC' }]}
        renderItem={(item) => <MikroRow {...describeFile(item)} />}
        what="files"
        empty={{ title: 'No files', description: 'Uploaded raw files show up here.' }}
      />
    </MikroScreen>
  );
}
