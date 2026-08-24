import { HomeCard } from '@/components/HomeCard';
import { Notifier } from '@/components/Notifier';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { useMeQuery } from '@/lib/lok/api/graphql';
import { ScrollView, View } from 'react-native';
import { useThemeColors } from '@/lib/theme/BrandProvider';

function Greeting() {
  const { data, loading, error } = useMeQuery({});

  /* An empty name had three causes that looked identical: still loading, the
     query failed, or it succeeded with no user. Say which. */
  const name = data?.me?.username;

  return (
    <View className="mb-2">
      <Text className="text-3xl font-bold text-foreground">
        Hi, {name ?? (loading ? '…' : 'there')}
      </Text>
      {!name && error ? (
        <Text className="text-destructive text-sm">Could not load your user: {error.message}</Text>
      ) : null}
      <Text className="text-muted-foreground text-lg">
        Welcome back to Pokket
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useThemeColors();
  return (
    <ScrollView className="flex-1 bg-background">
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
            color={colors.primary}
            iconBgClassName="bg-chart-1/10"
            borderClassName="border-t-2 border-t-chart-1/40"
          />
          <HomeCard
            href="/wifi"
            title="Wi-Fi"
            icon="wifi"
            color={colors.primary}
            iconBgClassName="bg-chart-2/10"
            borderClassName="border-t-2 border-t-chart-2/40"
          />
          <HomeCard
            href="/provision"
            title="Provision"
            icon="antenna.radiowaves.left.and.right"
            color={colors.primary}
            iconBgClassName="bg-chart-3/10"
            borderClassName="border-t-2 border-t-chart-3/40"
          />
          <HomeCard
            href="/broadcasts"
            title="Broadcasts"
            icon="antenna.radiowaves.left.and.right"
            color={colors.primary}
            iconBgClassName="bg-chart-2/10"
            borderClassName="border-t-2 border-t-chart-2/40"
          />
          <HomeCard
            href="/debug"
            title="Debug"
            icon="ant.fill"
            color={colors.primary}
            iconBgClassName="bg-chart-1/10"
            borderClassName="border-t-2 border-t-chart-1/40"
          />
        </View>
      </View>
    </ScrollView>
  );
}

