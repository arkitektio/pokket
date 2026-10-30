import * as React from 'react';
import {Text, View} from 'react-native';
import {configureBlokPlatform, type BlokPrimitiveErrorProps} from '@arkitektio/bsx/runtime';
import {asyncKeyedStore} from './keyedStore';

/**
 * What the bloks get from pokket (`@arkitektio/bsx` asks once, before the first
 * render). The package's runtime draws its own error card and pending skeleton
 * with the DOM by default, which a native app cannot render: these are its views.
 * Kept locals and component state live in AsyncStorage, and `ui.copy` writes the
 * phone's clipboard. Imported first by `app/_layout.tsx`.
 */
const ErrorCard = (props: BlokPrimitiveErrorProps) => (
  <View className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
    <Text className="text-sm font-medium text-destructive">{props.title}</Text>
    {props.detail ? <Text className="mt-1 text-sm text-foreground">{props.detail}</Text> : null}
    <Text className="mt-1 text-xs text-muted-foreground">Component: {props.componentId}</Text>
  </View>
);

const Skeleton = ({componentId}: {componentId: string}) => (
  <View testID={`blok-pending-${componentId}`} aria-busy className="h-5 w-full max-w-48 animate-pulse rounded-md bg-muted" />
);

/** A view cannot be marked for a `locked:` variant: a locked node draws as it is. */
const Locked = ({children}: {reason: string; children?: React.ReactNode}) => <>{children}</>;

/** A `suspense` body held hidden while its reads are pending: mounted, not shown. */
const Hidden = ({hidden, children}: {hidden: boolean; children?: React.ReactNode}) => (
  <View style={{display: hidden ? 'none' : 'contents'}}>{children}</View>
);

const copyText = async (text: string): Promise<void> => {
  // Loaded on use: the module requires its native half when imported, and on a
  // build without it only copying may fail, not every blok.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
  await clipboard.setStringAsync(text);
};

configureBlokPlatform({
  keyedStore: asyncKeyedStore,
  copyText,
  primitives: {ErrorCard, Skeleton, Locked, Hidden},
  describeError: error => {
    const text = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
    return {message: text.split('\n')[0]?.trim() || 'Something went wrong.'};
  },
});
