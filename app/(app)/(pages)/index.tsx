import { ModuleGrid } from '@/components/navigation/ModuleGrid';
import { SearchPill } from '@/components/navigation/SearchPill';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { useMeQuery, useMyOrganizationQuery } from '@/lib/lok/api/graphql';
import { useAvailableModules } from '@/lib/modules/useAvailableModules';
import { showPage } from '@/lib/navigation';
import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

function Greeting() {
  const { data, loading, error } = useMeQuery({});
  const { data: org } = useMyOrganizationQuery();
  const organization = org?.mycontext?.organization;
  const name = data?.me?.username;

  return (
    <View className="mb-2">
      {/* The organization names the page, as the old tab header did. */}
      <Stack.Screen options={{ title: organization?.profile?.name ?? organization?.slug ?? 'Home' }} />
      <Text className="text-3xl font-bold text-foreground">Hi, {name ?? (loading ? '…' : 'there')}</Text>
      {!name && error ? (
        <Text className="text-sm text-destructive">Could not load your user: {error.message}</Text>
      ) : null}
    </View>
  );
}

/**
 * Where a new tab starts, as orkestrator's new-tab page: search first, then
 * the modules. The sidebar holds the same, a swipe away from any page.
 */
export default function HomeScreen() {
  const modules = useAvailableModules().filter((m) => m.key !== 'home');

  return (
    <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled">
      <View className="gap-5 px-4 pt-6 pb-10">
        <Guard.Lok>
          <Greeting />
        </Guard.Lok>

        <SearchPill large />

        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Modules</Text>
          <ModuleGrid
            modules={modules}
            size={56}
            onSelect={(module) => showPage(module.navLinks.find((l) => l.home)?.route ?? module.route)}
          />
        </View>

      </View>
    </ScrollView>
  );
}
