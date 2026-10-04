import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { moduleByKey } from '@/lib/modules/catalog';
import { layoutModuleNav } from '@/lib/modules/layout';
import { NamedIcon } from '@/lib/modules/registry';
import { showDetail } from '@/lib/navigation';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

const PHONE = layoutModuleNav(moduleByKey('phone')!);

/**
 * Everything of this phone itself, not of an organization: its timeline and
 * notifications, Wi-Fi and device setup, the app's settings. The sidebar's
 * grid keeps one icon for all of it, next to the organization's services —
 * as orkestrator keeps its rail for services.
 */
export default function PhoneScreen() {
  const colors = useThemeColors();
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-6 px-4 py-6">
        {PHONE.groups.map((group) => (
          <View key={group.title} className="gap-2">
            <Text className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </Text>
            <Card className="border-border bg-card">
              {group.links.map((link, i) => (
                <Pressable
                  key={link.route}
                  onPress={() => showDetail(link.route)}
                  className={`flex-row items-center gap-3 px-3 py-3 active:bg-muted ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <NamedIcon name={link.icon ?? 'smartphone'} size={18} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-card-foreground">{link.label}</Text>
                    {link.description ? (
                      <Text className="text-xs text-muted-foreground">{link.description}</Text>
                    ) : null}
                  </View>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </Card>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
