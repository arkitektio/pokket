import { EntityPick, EntitySearch } from '@/components/search/EntitySearch';
import { SearchItem, SearchRow, SearchSectionHeader } from '@/components/search/SearchRow';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { profileDetail, profileTitle, StoredProfile } from '@/lib/arkitekt/fakts/profileStorageSchema';
import { MODULE_CATALOG, moduleForPath, pathOf } from '@/lib/modules/catalog';
import { iconFor } from '@/lib/modules/registry';
import { useAvailableModules } from '@/lib/modules/useAvailableModules';
import { afterReturningToApp, showDetail, showPage } from '@/lib/navigation';
import { rankByFilter } from '@/lib/search/filter';
import { loadRecents, RecentEntry, recordRecent } from '@/lib/search/recents';
import { useTabActions, useTabs } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { router } from 'expo-router';
import { AppWindow, Building2, History, Search, X } from 'lucide-react-native';
import * as React from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, SectionList, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

/** Local filtering waits this long after a keystroke — orkestrator's palette. */
const LOCAL_DEBOUNCE_MS = 100;
/** …and the server searches this much longer, from two characters on. */
const REMOTE_DEBOUNCE_MS = 250;
const MIN_TERM_LENGTH = 2;
const RECENTS_SHOWN = 8;
const PAGES_LIMIT = 10;

const useDebounced = <T,>(value: T, ms: number): T => {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
};

type Section = { title: string; data: SearchItem[] };

/**
 * Search — orkestrator's ⌘K palette as a full screen, and the way to
 * anything in pokket. With nothing typed: recents, tabs, modules and
 * organizations. Typed: the same, ranked by the palette's own matcher
 * (`lib/search/filter.ts`), plus every module's pages, then what the
 * servers find — mail and finances — last, so late answers never move the
 * rows already under the thumb.
 */
export default function SearchScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const profileId = App.useActiveProfileId();
  const profiles = App.useProfiles();
  const { switchProfile } = App.useProfileActions();
  const connect = App.useConnect();
  const modules = useAvailableModules();
  const { tabs, activeId } = useTabs();
  const tabActions = useTabActions();

  const [query, setQuery] = React.useState('');
  const filter = useDebounced(query, LOCAL_DEBOUNCE_MS);
  const term = useDebounced(filter.trim(), REMOTE_DEBOUNCE_MS);
  const typed = filter.trim().length > 0;

  const [recents, setRecents] = React.useState<RecentEntry[]>([]);
  React.useEffect(() => {
    void loadRecents(profileId).then(setRecents);
  }, [profileId]);

  /** Leave search, then — back in the app frame — show a page or a detail. */
  const leaveTo = React.useCallback((show: () => void) => afterReturningToApp(show), []);

  const openRoute = React.useCallback(
    (route: string, label: string) => {
      void recordRecent(profileId, { kind: 'route', route, label, at: Date.now() });
      leaveTo(() => showPage(route));
    },
    [profileId, leaveTo],
  );

  const openEntity = React.useCallback(
    (pick: EntityPick) => {
      void recordRecent(profileId, { kind: 'entity', ...pick, at: Date.now() });
      // A bank account, merchant or category opens the filtered bank page;
      // a message or transaction is a detail over the page on show.
      leaveTo(() => (pick.route.includes('?') ? showPage(pick.route) : showDetail(pick.route)));
    },
    [profileId, leaveTo],
  );

  const askSwitch = React.useCallback(
    (profile: StoredProfile) => {
      const stale = profile.status === 'stale';
      Alert.alert(
        `${stale ? 'Sign in to' : 'Switch to'} ${profileTitle(profile)}?`,
        stale ? 'This organization signed you out.' : profileDetail(profile) || undefined,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: stale ? 'Sign in again' : 'Switch',
            onPress: () => {
              router.back();
              const run = stale
                ? connect({
                    endpoint: profile.session.endpoint,
                    controller: new AbortController(),
                    replaceProfileId: profile.id,
                  })
                : switchProfile(profile.id);
              run.catch((error: Error) => toast.error(error.message));
            },
          },
        ],
      );
    },
    [connect, switchProfile],
  );

  const sections = React.useMemo<Section[]>(() => {
    const out: Section[] = [];
    const moduleLabel = (route: string) => moduleForPath(pathOf(route), MODULE_CATALOG)?.label;

    if (!typed && recents.length > 0) {
      out.push({
        title: 'Recent',
        data: recents.slice(0, RECENTS_SHOWN).map((entry) => ({
          key: `recent:${entry.kind === 'entity' ? `entity:${entry.identifier}:${entry.id}` : `route:${entry.route}`}`,
          title: entry.label,
          description:
            entry.kind === 'entity' ? entry.description ?? moduleLabel(entry.route) : moduleLabel(entry.route),
          icon: History,
          onSelect: () =>
            entry.kind === 'entity'
              ? openEntity({
                  identifier: entry.identifier,
                  id: entry.id,
                  label: entry.label,
                  description: entry.description,
                  route: entry.route,
                })
              : openRoute(entry.route, entry.label),
        })),
      });
    }

    const tabRows = rankByFilter(tabs, (t) => [t.label, t.route], filter).map((tab) => ({
      key: `tab:${tab.id}`,
      title: tab.label,
      description: tab.id === activeId ? 'This tab' : tab.pinned ? 'Pinned tab' : 'Open tab',
      icon: AppWindow,
      onSelect: () => leaveTo(() => tabActions.switchTo(tab.id)),
    }));
    if (tabRows.length > 1 || (typed && tabRows.length > 0)) out.push({ title: 'Tabs', data: tabRows });

    const moduleRows = rankByFilter(modules, (m) => [m.label, m.key], filter).map((module) => {
      const home = module.navLinks.find((l) => l.home)?.route ?? module.route;
      return {
        key: `module:${module.key}`,
        title: module.label,
        description: module.status === 'invalid' ? 'Not connected' : undefined,
        icon: iconFor(module.icon),
        onSelect: () => openRoute(home, module.label),
      };
    });
    if (moduleRows.length) out.push({ title: 'Go to', data: moduleRows });

    if (typed) {
      const links = modules.flatMap((module) =>
        module.navLinks
          .filter((link) => !link.home)
          .map((link) => ({ module, link })),
      );
      const pageRows = rankByFilter(
        links,
        ({ module, link }) => [link.label, link.route, module.label, ...(link.keywords ?? [])],
        filter,
        PAGES_LIMIT,
      ).map(({ module, link }) => ({
        key: `page:${link.route}`,
        title: link.label,
        description: link.description ? `${module.label} · ${link.description}` : module.label,
        icon: iconFor(link.icon ?? module.icon),
        onSelect: () => openRoute(link.route, `${module.label} · ${link.label}`),
      }));
      if (pageRows.length) out.push({ title: 'Pages', data: pageRows });
    }

    const others = profiles.filter((p) => p.id !== profileId);
    const orgRows = rankByFilter(
      others,
      (p) => [`Switch to ${profileTitle(p)}`, profileDetail(p), 'organization', 'org', 'account'],
      filter,
    ).map((profile) => ({
      key: `org:${profile.id}`,
      title: `Switch to ${profileTitle(profile)}`,
      description: [profileDetail(profile), profile.status === 'stale' ? 'signed out' : null].filter(Boolean).join(' · '),
      icon: Building2,
      onSelect: () => askSwitch(profile),
    }));
    if (orgRows.length) out.push({ title: 'Organizations', data: orgRows });

    return out;
  }, [typed, recents, tabs, activeId, filter, modules, profiles, profileId, openRoute, openEntity, askSwitch, tabActions, leaveTo]);

  const first = sections[0]?.data[0];
  const searching = term.length >= MIN_TERM_LENGTH;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top + 6 }}
      className="flex-1 bg-background"
    >
      <View className="flex-row items-center gap-2 px-3 pb-2">
        <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
          <Search size={18} color={colors.mutedForeground} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search mail, bank, pages…"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="go"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
            onSubmitEditing={() => first?.onSelect()}
            style={{ color: colors.foreground }}
            className="flex-1 py-3 text-base"
          />
          {query ? (
            <Pressable hitSlop={8} onPress={() => setQuery('')} accessibilityLabel="Clear">
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8} className="px-1 py-2">
          <Text className="text-base text-primary">Cancel</Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <SearchSectionHeader title={section.title} />}
        renderItem={({ item }) => <SearchRow item={item} first={item === first && typed} />}
        ListEmptyComponent={
          typed && !searching ? (
            <Text className="px-6 pt-8 text-center text-sm text-muted-foreground">No results for “{filter.trim()}”</Text>
          ) : null
        }
        ListFooterComponent={
          searching ? <EntitySearch term={term} onPick={openEntity} /> : <View style={{ height: insets.bottom + 24 }} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      />
    </KeyboardAvoidingView>
  );
}
