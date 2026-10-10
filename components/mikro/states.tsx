import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Microscope } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

export function MikroEmptyState({ title, description }: { title: string; description: string }) {
  const colors = useThemeColors();
  return (
    <Card className="m-4 border-border bg-card">
      <CardContent className="items-center py-8">
        <View className="mb-3 rounded-full bg-primary/10 p-4">
          <Microscope size={24} color={colors.primary} />
        </View>
        <Text className="text-center text-lg font-semibold text-card-foreground">{title}</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">{description}</Text>
      </CardContent>
    </Card>
  );
}

export function MikroLoadingState({ message }: { message: string }) {
  const colors = useThemeColors();
  return (
    <View className="items-center justify-center py-16">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="mt-4 text-sm text-muted-foreground">{message}</Text>
    </View>
  );
}

export const MikroUnavailable = () => (
  <MikroEmptyState title="Mikro unavailable" description="This organization is not connected to Mikro." />
);

/** The frame every mikro page stands in: signed in, and with a mikro to ask. */
export function MikroScreen({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<MikroLoadingState message="Connecting…" />}>
        <Guard.Mikro fallback={<MikroUnavailable />}>{children}</Guard.Mikro>
      </Guard.Lok>
    </View>
  );
}

/** A detail page before its object is there: loading, or why not. */
export function MikroMissing({ loading, error, what }: { loading: boolean; error?: Error; what: string }) {
  if (loading) return <MikroLoadingState message={`Loading ${what}…`} />;
  return <Text className="p-4 text-sm text-destructive">{error?.message ?? `This ${what} was not found.`}</Text>;
}
