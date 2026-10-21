import { useTalkAbout } from '@/lib/alpaka/chat/useTalkAbout';
import { App } from '@/lib/app/App';
import { type CallStructure, objectForRoute, structureLabel } from '@/lib/lovekit/call/structures';
import { activeTab } from '@/lib/tabs/tabs';
import { useTabs } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { usePathname } from 'expo-router';
import { MessageSquareMore } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import { toast } from 'sonner-native';

function TalkButton({ object }: { object: CallStructure }) {
  const colors = useThemeColors();
  const tab = activeTab(useTabs());
  const { talk, opening, error } = useTalkAbout();

  React.useEffect(() => {
    if (error) toast.error(`Could not start a chat: ${error}`);
  }, [error]);

  // The page's own title when it has given one (a thread's subject), else
  // "Task 42": what the chat is named after.
  const label = tab.labelSource === 'page' ? tab.label : structureLabel(object);

  return (
    <Pressable
      onPress={() => void talk({ ...object, label })}
      disabled={opening}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Talk about this"
      className="ml-3 active:opacity-70"
    >
      {opening ? (
        <ActivityIndicator size="small" color={colors.foreground} />
      ) : (
        <MessageSquareMore size={20} color={colors.foreground} />
      )}
    </Pressable>
  );
}

/**
 * "Talk about this", in the header of the pages that show an object —
 * orkestrator's Alpaka section of an object's menu. Starts a chat about it
 * and opens it. Nothing on other pages, on a chat's own page, or where the
 * organization has no alpaka.
 */
export function TalkAboutButton() {
  const pathname = usePathname();
  const alpaka = App.usePotentialService('alpaka');
  const object = React.useMemo(() => objectForRoute(pathname), [pathname]);
  if (!object || !alpaka || object.identifier === '@alpaka/room') return null;
  return <TalkButton object={object} />;
}
