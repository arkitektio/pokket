import * as React from 'react';
import {ActivityIndicator, View} from 'react-native';
import * as z from 'zod';
import {Text} from '@/components/ui/text';
import {Guard} from '@/lib/app/App';
import {createBlokComponent, useBlok, useValue} from '@arkitektio/bsx/runtime';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import {asStructure} from './shared';

/**
 * Lovekit's bloks, after orkestrator's `bloks/lovekit/Lovekit.tsx`: the same
 * names and prop schemas, so a payload validates on both.
 */

const SOLO_BROADCAST = '@lovekit/solo_broadcast';

const classNameSchema = z.string().optional().describe('Extra Tailwind classes appended to the widget.');
const streamSchema = z
  .object({
    object: z.string(),
    __identifier: z.literal(SOLO_BROADCAST),
  })
  .optional()
  .describe('The lovekit broadcast to render.');

/**
 * Loaded when a stream is first shown, not with the catalog: LiveKit's native
 * modules have no business in every blok, and none in the tests that load it.
 */
const SoloBroadcastPlayer = React.lazy(() => import('@/components/broadcasts/SoloBroadcastPlayer'));

const UnavailableNotice = ({children}: {children: string}) => (
  <View className="min-h-40 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4">
    <Text className="text-center text-sm text-muted-foreground">{children}</Text>
  </View>
);

const Loading = () => {
  const colors = useThemeColors();
  return (
    <View className="min-h-40 items-center justify-center rounded-xl bg-black">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
};

export const StreamRenderBlok = createBlokComponent(
  {
    name: 'StreamRender',
    schema: z
      .object({
        broadcast: streamSchema,
        className: classNameSchema,
      })
      .describe('Renders a live lovekit broadcast.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const broadcast = asStructure(useValue(blok.broadcast));
    const className = useValue(blok.className);

    if (!broadcast || broadcast.__identifier !== SOLO_BROADCAST) {
      return <UnavailableNotice>No broadcast selected.</UnavailableNotice>;
    }

    // The broadcast is lovekit's to show, over livekit. A deployment without
    // either (or with it not ready) degrades to a notice.
    const unavailable = <UnavailableNotice>Lovekit is not available.</UnavailableNotice>;
    return (
      <Guard.Lovekit fallback={unavailable}>
        <Guard.Livekit fallback={unavailable}>
          <React.Suspense fallback={<Loading />}>
            <SoloBroadcastPlayer key={broadcast.object} broadcastId={broadcast.object} className={className ?? 'h-auto aspect-video'} />
          </React.Suspense>
        </Guard.Livekit>
      </Guard.Lovekit>
    );
  },
);
