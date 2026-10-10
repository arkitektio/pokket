import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import * as React from 'react';
import { View } from 'react-native';

/** One thing known about an object; nothing when it is not known. */
export function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between gap-4 border-b border-border py-2.5">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text selectable className="shrink text-right text-sm text-card-foreground">
        {value}
      </Text>
    </View>
  );
}

export function FactsCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="px-4 pb-4">
      <Card className="border-border bg-card">
        <CardContent className="py-2">{children}</CardContent>
      </Card>
    </View>
  );
}

export const SectionTitle = ({ title }: { title: string }) => (
  <Text className="px-4 pb-2 pt-4 text-xs font-semibold uppercase text-muted-foreground">{title}</Text>
);

/** A titled group of rows; nothing at all when there are no rows. */
export function Section<T>({
  title,
  items,
  render,
}: {
  title: string;
  items: readonly T[] | null | undefined;
  render: (item: T) => React.ReactNode;
}) {
  if (!items?.length) return null;
  return (
    <View>
      <SectionTitle title={title} />
      <View className="border-t border-border">{items.map(render)}</View>
    </View>
  );
}

/** The name and one line under a detail page's picture. */
export function Heading({ title, detail }: { title: string; detail?: string | null }) {
  return (
    <View className="gap-1 px-4 pb-4 pt-4">
      <Text selectable className="text-xl font-semibold text-foreground">
        {title}
      </Text>
      {detail ? <Text className="text-sm text-muted-foreground">{detail}</Text> : null}
    </View>
  );
}
