import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { ScrollView, View } from 'react-native';

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4" contentContainerClassName="flex-1">
        <View className="flex-1 items-center justify-center px-6">
          <View className="p-5 rounded-2xl bg-muted mb-5">
            <IconSymbol name="bell.slash" size={40} color="hsl(165, 10%, 65%)" />
          </View>
          <Text className="text-xl font-semibold text-foreground mb-2">
            No notifications
          </Text>
          <Text className="text-muted-foreground text-center text-sm leading-5">
            When you receive notifications from your devices or team, they'll appear here.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
