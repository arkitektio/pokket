import * as React from 'react';
import {ActivityIndicator, View} from 'react-native';
import * as z from 'zod';
import {Text} from '@/components/ui/text';
import {Guard} from '@/lib/app/App';
import {createBlokComponent, useBlok, useValue} from '@arkitektio/bsx/runtime';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import {asStructure} from './shared';

/**
 * Lovekit's bloks: a stream an agent offers, live.
 */

const STREAM = '@lovekit/stream';

const classNameSchema = z.string().optional().describe('Extra Tailwind classes appended to the widget.');
const streamSchema = z
  .object({
    object: z.string(),
    __identifier: z.literal(STREAM),
  })
  .optional()
  .describe('The lovekit stream to render.');

/**
 * Loaded when a stream is first shown, not with the catalog: LiveKit's native
 * modules have no business in every blok, and none in the tests that load it.
 */
const StreamPlayerById = React.lazy(() => import('@/components/streams/StreamPlayer'));

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
        stream: streamSchema,
        className: classNameSchema,
      })
      .describe('Renders a live lovekit stream.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const stream = asStructure(useValue(blok.stream));
    const className = useValue(blok.className);

    if (!stream || stream.__identifier !== STREAM) {
      return <UnavailableNotice>No stream selected.</UnavailableNotice>;
    }

    // The stream is lovekit's to show, over livekit. A deployment without
    // either (or with it not ready) degrades to a notice.
    const unavailable = <UnavailableNotice>Lovekit is not available.</UnavailableNotice>;
    return (
      <Guard.Lovekit fallback={unavailable}>
        <Guard.Livekit fallback={unavailable}>
          <React.Suspense fallback={<Loading />}>
            <StreamPlayerById key={stream.object} streamId={stream.object} className={className ?? 'h-auto aspect-video'} />
          </React.Suspense>
        </Guard.Livekit>
      </Guard.Lovekit>
    );
  },
);
