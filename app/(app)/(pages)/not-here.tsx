import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { showPage } from '@/lib/navigation';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { useLocalSearchParams } from 'expo-router';
import { MonitorSmartphone } from 'lucide-react-native';
import { View } from 'react-native';

/**
 * Where a link from the desktop app lands when it names a page the phone
 * does not have (`lib/deeplink/desktopPaths.ts`): better than the router's
 * "unmatched route", which reads like something broke.
 */
export default function NotHereScreen() {
  const colors = useThemeColors();
  const { path } = useLocalSearchParams<{ path?: string }>();
  return (
    <View className="flex-1 bg-background">
      <Card className="m-4 border-border bg-card">
        <CardContent className="items-center gap-3 py-8">
          <View className="rounded-full bg-primary/10 p-4">
            <MonitorSmartphone size={24} color={colors.primary} />
          </View>
          <Text className="text-center text-lg font-semibold text-card-foreground">Only in the desktop app</Text>
          <Text className="text-center text-sm text-muted-foreground">
            This link opens a page Orkestrator has on the desktop but not on the phone yet.
          </Text>
          {path ? (
            <Text selectable className="text-center font-mono text-xs text-muted-foreground">
              {path}
            </Text>
          ) : null}
          <Button onPress={() => showPage('/')} className="mt-2">
            <Text>Go home</Text>
          </Button>
        </CardContent>
      </Card>
    </View>
  );
}
