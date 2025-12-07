import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ScrollView } from 'react-native';

export default function NotificationsScreen() {
  return (
    <ThemedView className="flex-1">
      <ScrollView className="flex-1 p-4">
        <Card className="mb-4">
          <CardHeader className="flex-row items-center space-x-2">
            <IconSymbol name="bell.fill" size={24} color="#666" />
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <ThemedText className="text-gray-500 text-center py-8">
              No new notifications
            </ThemedText>
          </CardContent>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}
