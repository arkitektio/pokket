import { MikroRow } from '@/components/mikro/MikroRow';
import { PagedList } from '@/components/mikro/PagedList';
import { describeAnnotation } from '@/components/mikro/rows';
import { MikroScreen } from '@/components/mikro/states';
import { GetAnnotationsDocument, type ListAnnotationFragment } from '@/lib/mikro/api/graphql';

export default function AnnotationsScreen() {
  return (
    <MikroScreen>
      <PagedList<ListAnnotationFragment>
        document={GetAnnotationsDocument}
        field="annotations"
        ordering={[{ id: 'DESC' }]}
        renderItem={(item) => <MikroRow {...describeAnnotation(item)} />}
        what="annotations"
        empty={{ title: 'No annotations', description: 'Shapes drawn on a scene show up here.' }}
      />
    </MikroScreen>
  );
}
