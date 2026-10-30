import {Image as ExpoImage} from 'expo-image';
import {cssInterop} from 'nativewind';
import * as React from 'react';
import {Linking, View, type DimensionValue} from 'react-native';
import {
  useBlok,
  usePendingAction,
  useValue,
  type BlokRender,
} from '@arkitektio/bsx/runtime';
import {Text} from '@/components/ui/text';
import {cn} from '@/lib/utils';
import {
  cssLength,
  cssPoints,
  renderInlineContent,
  textLines,
  textPresentationClasses,
  useBlokDataSet,
  useTextPresentationProps,
} from './shared';
import type {uiCatalog} from '@arkitektio/bsx/catalogs';

type Ui = typeof uiCatalog.components;

/**
 * ui@1's links and media, after orkestrator's `bloks/html.tsx`: `Link`,
 * `Image` and `Code`, drawn with React Native. Raw HTML tags are not part of
 * the language; html@1 keeps only `div`, `p` and `span` (`layout.tsx`,
 * `typography.tsx`), the containers that translate directly to React Native
 * (View, Text).
 */

// expo-image takes no `className` until NativeWind is told to map it to `style`.
cssInterop(ExpoImage, {className: 'style'});

/** Only schemes a phone should hand to the OS; no `javascript:` and the like. */
const isOpenableHref = (href: string) => /^(https?|mailto|tel|sms|geo):/i.test(href.trim());

export const LinkRender: BlokRender<Ui['Link']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const href = useValue(blok.href);
  const text = useValue(blok.text);
  const children = useValue(blok.children);
  const {run: onClick, pending: busy} = usePendingAction(blok.onClick);
  const dataSet = useBlokDataSet({busy});
  const className = useValue(blok.className);
  const presentation = useTextPresentationProps(blok);

  // `newTab` has no meaning on a phone: every link leaves the app.
  const onPress = React.useCallback(() => {
    onClick?.();
    if (href && isOpenableHref(href)) {
      Linking.openURL(href).catch(() => undefined);
    }
  }, [href, onClick]);

  return (
    <Text
      {...dataSet}
      accessibilityRole="link"
      onPress={href || onClick ? onPress : undefined}
      numberOfLines={textLines(presentation)}
      className={cn(
        ...textPresentationClasses(presentation),
        'underline',
        className,
      )}
    >
      {renderInlineContent(children ?? text, buildChild)}
    </Text>
  );
};

export const ImageRender: BlokRender<Ui['Image']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const src = useValue(blok.src);
  const alt = useValue(blok.alt);
  const blurhash = useValue(blok.blurhash);
  const className = useValue(blok.className);
  const width = useValue(blok.width);
  const height = useValue(blok.height);
  const maxWidth = useValue(blok.maxWidth);
  const maxHeight = useValue(blok.maxHeight);
  const radius = useValue(blok.radius);
  const dataSet = useBlokDataSet();
  // An RN image has no intrinsic size: take the ratio from the loaded bytes.
  const [ratio, setRatio] = React.useState<number | undefined>(undefined);

  // pokket has no image assets: a `self.assets.*` source that did not
  // resolve to a URL draws nothing, as an asset with no bytes does on the web.
  if (!src) {
    return null;
  }

  const resolvedWidth = cssLength(width);
  const resolvedHeight = cssLength(height);
  const style = {
    width: resolvedWidth ?? (resolvedHeight != null ? undefined : ('100%' as DimensionValue)),
    height: resolvedHeight,
    aspectRatio: resolvedWidth != null && resolvedHeight != null ? undefined : (ratio ?? 4 / 3),
    maxWidth: cssLength(maxWidth),
    maxHeight: cssLength(maxHeight),
    borderRadius: cssPoints(radius),
  };

  return (
    <ExpoImage
      {...dataSet}
      source={{uri: src}}
      placeholder={blurhash ? {blurhash} : undefined}
      accessibilityLabel={alt}
      accessible={!!alt}
      contentFit="contain"
      transition={150}
      className={className}
      style={style}
      onLoad={event => {
        const {width: naturalWidth, height: naturalHeight} = event.source;
        if (naturalWidth > 0 && naturalHeight > 0) {
          setRatio(naturalWidth / naturalHeight);
        }
      }}
    />
  );
};

export const CodeRender: BlokRender<Ui['Code']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const text = useValue(blok.text);
  const block = useValue(blok.block) === true;
  const className = useValue(blok.className);
  const presentation = useTextPresentationProps(blok);
  const dataSet = useBlokDataSet();
  if (block) {
    return (
      <View {...dataSet} className="rounded-md bg-muted px-3 py-2">
        <Text selectable className={cn('font-mono text-xs', ...textPresentationClasses(presentation), className)}>
          {text}
        </Text>
      </View>
    );
  }
  return (
    <Text
      {...dataSet}
      selectable
      className={cn('rounded bg-muted px-1 py-0.5 font-mono text-xs', ...textPresentationClasses(presentation), className)}
    >
      {text}
    </Text>
  );
};
