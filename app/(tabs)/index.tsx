import { HomeCard } from '@/components/HomeCard';
import { Notifier } from '@/components/Notifier';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { useMeQuery } from '@/lib/lok/api/graphql';
import { ScrollView, View } from 'react-native';

function Greeting() {
  const { data } = useMeQuery({});
  return (
    <View className="mb-2">
      <Text className="text-3xl font-bold text-foreground">
        Hi, {data?.me?.username}
      </Text>
      <Text className="text-muted-foreground text-lg">
        Welcome back to Pokket
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-background-300">
      <View className="flex-1 px-4 pt-6">
        <Guard.Lok>
            <Greeting />
        </Guard.Lok>
        
        <View className="mb-6">
            <Notifier />
        </View>

        <View className="flex-row flex-wrap gap-4">
          <HomeCard
            href="/tasks"
            title="Tasks"
            icon="list.bullet"
            color="#3B82F6"
            iconBgClassName="bg-blue-100 dark:bg-blue-900/50"
          />
          <HomeCard
            href="/wifi"
            title="Wi-Fi"
            icon="wifi"
            color="#10B981"
            iconBgClassName="bg-green-100 dark:bg-green-900/50"
          />
          <HomeCard
            href="/provision"
            title="Provision"
            icon="qrcode"
            color="#8B5CF6"
            iconBgClassName="bg-purple-100 dark:bg-purple-900/50"
          />
          <HomeCard
            href="/debug"
            title="Debug"
            icon="ant.fill"
            color="#EF4444"
            iconBgClassName="bg-red-100 dark:bg-red-900/50"
          />
        </View>
      </View>
    </ScrollView>
  );
}

