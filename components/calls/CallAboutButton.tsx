import { App } from '@/lib/app/App';
import { type CallStructure, structureForRoute } from '@/lib/lovekit/call/structures';
import { useStartCall } from '@/lib/lovekit/call/useStartCall';
import { activeTab } from '@/lib/tabs/tabs';
import { useTabs } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { usePathname } from 'expo-router';
import { PhoneCall } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import { toast } from 'sonner-native';

function StartButton({ structure }: { structure: CallStructure & { label: string } }) {
  const colors = useThemeColors();
  const tab = activeTab(useTabs());
  const { start, starting, error } = useStartCall();

  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // The page's own title when it has given one (a thread's subject), else
  // "Task 42": what the call is named after.
  const label = tab.labelSource === 'page' ? tab.label : structure.label;

  return (
    <Pressable
      onPress={() => void start([{ identifier: structure.identifier, id: structure.object, label }])}
      disabled={starting}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Call about this"
      className="ml-3 active:opacity-70"
    >
      {starting ? (
        <ActivityIndicator size="small" color={colors.foreground} />
      ) : (
        <PhoneCall size={20} color={colors.foreground} />
      )}
    </Pressable>
  );
}

/**
 * "Call about this", in the header of the pages that show something a call
 * can be about — orkestrator's `CallAboutAction`, which lives in every
 * object's menu there. Nothing on any other page, and nothing where the
 * organization has no lovekit or no media server.
 */
export function CallAboutButton() {
  const pathname = usePathname();
  const lovekit = App.usePotentialService('lovekit');
  const livekit = App.usePotentialService('livekit');
  const structure = React.useMemo(() => structureForRoute(pathname), [pathname]);
  if (!structure || !lovekit || !livekit) return null;
  return <StartButton structure={structure} />;
}
