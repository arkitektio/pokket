import * as React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {Text} from '@/components/ui/text';
import {useMaterializedBlokQuery} from '@/lib/rekuest/api/graphql';
import MaterializedBlokRenderer from './MaterializedBlokRenderer';

/** A materialized blok by its id, live: what a card in a 3D scene shows (`OnClick open=`, model decorations). */
export default function MaterializedBlokById({materializedBlokId}: {materializedBlokId: string}) {
  const {data, loading, error} = useMaterializedBlokQuery({variables: {id: materializedBlokId}});
  const materialized = data?.materializedBlok;
  if (materialized) return <MaterializedBlokRenderer materializedBlok={materialized} />;
  return (
    <View className="py-1">
      {loading ? <ActivityIndicator /> : <Text className="text-xs text-muted-foreground">{error?.message ?? 'This blok was not found.'}</Text>}
    </View>
  );
}
