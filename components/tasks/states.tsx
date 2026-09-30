import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ListChecks } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

export function TasksEmptyState({ title, description }: { title: string; description: string }) {
  const colors = useThemeColors();
  return (
    <Card className="m-4 border-border bg-card">
      <CardContent className="items-center py-8">
        <View className="mb-3 rounded-full bg-primary/10 p-4">
          <ListChecks size={24} color={colors.primary} />
        </View>
        <Text className="text-center text-lg font-semibold text-card-foreground">{title}</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">{description}</Text>
      </CardContent>
    </Card>
  );
}

export function TasksLoadingState({ message }: { message: string }) {
  const colors = useThemeColors();
  return (
    <View className="items-center justify-center py-16">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="mt-4 text-sm text-muted-foreground">{message}</Text>
    </View>
  );
}

export const RekuestUnavailable = () => (
  <TasksEmptyState title="Tasks unavailable" description="This organization is not connected to the Rekuest service." />
);
