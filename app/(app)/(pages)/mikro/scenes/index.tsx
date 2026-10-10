import { MikroRow } from '@/components/mikro/MikroRow';
import { PagedList } from '@/components/mikro/PagedList';
import { describeScene } from '@/components/mikro/rows';
import { MikroScreen } from '@/components/mikro/states';
import { GetScenesDocument, type ListSceneFragment } from '@/lib/mikro/api/graphql';

export default function ScenesScreen() {
  return (
    <MikroScreen>
      <PagedList<ListSceneFragment>
        document={GetScenesDocument}
        field="scenes"
        ordering={[{ id: 'DESC' }]}
        renderItem={(item) => <MikroRow {...describeScene(item)} />}
        what="scenes"
        empty={{ title: 'No scenes', description: 'A scene composes datasets into one view. None have been made yet.' }}
      />
    </MikroScreen>
  );
}
