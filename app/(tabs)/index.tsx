import { ScrollView, Text, View } from 'react-native';

import { NotConnected } from '@/components/Connect';
import { Disconnect } from '@/components/Disconnect';
import { HelloWave } from '@/components/HelloWave';
import { Notifier } from '@/components/Notifier';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { App, Guard } from '@/lib/app/App';

export const NotLoggedInView = () => {
  return (
    <ThemedView className="flex-1 justify-center items-center p-6">
      <IconSymbol name="person.circle" size={80} color="#666" />
      <ThemedText className="text-xl font-semibold mt-4 mb-2">Welcome to Pokket</ThemedText>
      <ThemedText className="text-center text-gray-600 mb-6">
        Please connect to get started with your Arkitekt services
      </ThemedText>
      <NotConnected/>
    </ThemedView>
  );
};

export default function HomeScreen() {
  return (
      <ScrollView className="flex-1">
        {/* Main Content */}
        <View className="flex-1 px-4">
          <App.Guard notConnectedFallback={<NotLoggedInView />}>
            {/* Status Card */}
            <Card className="mb-4 shadow-lg">
              <CardHeader className="pb-3">
                <View className="flex-row items-center">
                  <IconSymbol name="checkmark.circle.fill" size={24} color="#10B981" />
                  <CardTitle className="text-green-600"><Guard.Lok>
            <HelloWave />
            </Guard.Lok></CardTitle>
                </View>
              </CardHeader>
              <CardContent>
                <Notifier />
                <View className="mt-3">
                  <Disconnect />
                </View>
              </CardContent>
            </Card>


            {/* Info Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex-row items-center">
                  <IconSymbol name="info.circle" size={20} color="#6B7280" />
                  <Text className="ml-2">About Pokket</Text>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-gray-600 leading-6">
                  Pokket is your mobile gateway to the Arkitekt ecosystem. Currently its only
                  here to act as a notification hub and a way to connect to your Arkitekt services.
                </Text>
                <View className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <Text className="text-sm text-gray-500">
                    💡 Tip: Soon you will be able to access your microscopy data and run analysis workflows directly from Pokket.
                  </Text>
                </View>
              </CardContent>
            </Card>
          </App.Guard>
        </View>
      </ScrollView>
  );
}

