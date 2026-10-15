import {Image} from 'expo-image';
import {cssInterop} from 'nativewind';
import * as React from 'react';
import {Linking, View, type DimensionValue, type TextStyle} from 'react-native';
import * as z from 'zod';
import {
  BlokPropSchemas,
  createBlokComponent,
  useAction,
  useBlok,
  useValue,
} from '@/lib/ports/blok/runtime';
import {Text, TextClassContext} from '@/components/ui/text';
import {cn} from '@/lib/utils';
import {ProgressTrack} from './feedback';
import {
  actionProp,
  boolSchema,
  buildLayoutStyle,
  buildLayoutTextStyle,
  classNameSchema,
  contentSchema,
  cssBox,
  cssLength,
  cssPoints,
  isTextContent,
  layoutFields,
  numberSchema,
  renderInlineContent,
  textFields,
  textLines,
  textPresentationClasses,
  useBaseLayoutProps,
  useTextPresentationProps,
  type ChildBuilder,
} from './shared';

/**
 * Raw HTML elements, registered under their exact lowercase tag names, after
 * orkestrator's `bloks/html.tsx`: the same names and schemas, drawn with
 * React Native.
 *
 * Phrasing elements (`strong`, `code`, `a`…) are a `<Text>`, so they nest and
 * flow inside a paragraph. Block elements (`section`, `ul`, `table`…) are a
 * `<View>` whose plain-text content is a `<Text>` carrying the text props.
 *
 * `video`/`audio` are left out (pokket ships no media player), so they render
 * the unsupported card; `iframe` is absent on both sides, by design.
 */

type SimpleTag =
  | 'strong'
  | 'em'
  | 'small'
  | 'code'
  | 'pre'
  | 'mark'
  | 'sub'
  | 'sup'
  | 'blockquote'
  | 'ul'
  | 'ol'
  | 'li'
  | 'dl'
  | 'dt'
  | 'dd'
  | 'figure'
  | 'figcaption'
  | 'section'
  | 'article'
  | 'header'
  | 'footer'
  | 'main'
  | 'nav'
  | 'aside'
  | 'table'
  | 'thead'
  | 'tbody'
  | 'tfoot'
  | 'tr'
  | 'th'
  | 'td'
  | 'caption';

const INLINE_TAGS = new Set<SimpleTag>([
  'strong',
  'em',
  'small',
  'code',
  'pre',
  'mark',
  'sub',
  'sup',
  'dt',
  'figcaption',
  'caption',
]);

/** The box half of orkestrator's `DEFAULT_TAG_CLASSES`. */
const DEFAULT_TAG_CLASSES: Partial<Record<SimpleTag, string>> = {
  code: 'rounded bg-muted px-1',
  pre: 'rounded bg-muted p-3',
  blockquote: 'border-l-2 border-border pl-3',
  mark: 'bg-yellow-200/60 dark:bg-yellow-500/30',
  dl: 'gap-1',
  dd: 'pl-4',
  ul: 'gap-1',
  ol: 'gap-1',
  table: 'w-full border-l border-t border-border',
  tr: 'flex-row',
  th: 'min-w-0 flex-1 border-b border-r border-border px-2 py-1',
  td: 'min-w-0 flex-1 border-b border-r border-border px-2 py-1',
  caption: 'py-1',
};

type Presentation = ReturnType<typeof useTextPresentationProps>;

/**
 * The text half, plus the user-agent defaults a browser applies (`strong` is
 * bold, `em` italic…). An explicit text prop on the blok still wins.
 */
const TAG_PRESENTATION: Partial<Record<SimpleTag, Partial<Presentation>>> = {
  strong: {weight: 'bold'},
  em: {italic: true},
  small: {size: 'xs'},
  code: {size: 'xs', mono: true},
  pre: {size: 'xs', mono: true},
  sub: {size: 'xs'},
  sup: {size: 'xs'},
  blockquote: {italic: true, tone: 'muted'},
  dt: {weight: 'medium'},
  dd: {tone: 'muted'},
  th: {weight: 'medium'},
  caption: {size: 'xs', tone: 'muted'},
};

const withTagDefaults = (tag: SimpleTag, presentation: Presentation): Presentation => {
  const defaults = TAG_PRESENTATION[tag];
  if (!defaults) return presentation;
  const merged = {...presentation};
  for (const [key, value] of Object.entries(defaults) as Array<[keyof Presentation, never]>) {
    if (merged[key] === undefined) merged[key] = value;
  }
  return merged;
};

/** Content as a list of rendered nodes, for containers that wrap each child. */
const contentNodes = (content: unknown, buildChild: ChildBuilder): React.ReactNode[] =>
  React.Children.toArray(renderInlineContent(content, buildChild));

/**
 * One factory for every element that is "a tag with content": the props are
 * always text-or-children plus the shared layout and text vocabulary, so each
 * element costs one line of registration.
 */
const createElementBlok = (tag: SimpleTag, description: string) =>
  createBlokComponent(
    {
      name: tag,
      schema: z
        .object({
          text: BlokPropSchemas.DynamicString.optional().describe('Inline text content.'),
          children: contentSchema,
          className: classNameSchema,
          ...textFields,
          ...layoutFields,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const className = useValue(blok.className);
      const presentation = withTagDefaults(tag, useTextPresentationProps(blok));
      const layoutProps = useBaseLayoutProps(blok);

      const content = children ?? text;
      const textClassName = cn(...textPresentationClasses(presentation));
      const textStyle = buildLayoutTextStyle(layoutProps);

      if (INLINE_TAGS.has(tag)) {
        return (
          <Text
            className={cn(DEFAULT_TAG_CLASSES[tag], textClassName, className)}
            numberOfLines={textLines(presentation)}
            selectable={tag === 'pre' || tag === 'code' ? true : undefined}
            style={[buildLayoutStyle(layoutProps) as TextStyle, textStyle]}
          >
            {renderInlineContent(content, buildChild)}
          </Text>
        );
      }

      const ordered = tag === 'ol';
      const body = isTextContent(content) ? (
        <Text className={textClassName} numberOfLines={textLines(presentation)} style={textStyle}>
          {String(content)}
        </Text>
      ) : tag === 'ul' || ordered ? (
        // A list draws its own markers: RN has no `list-style`.
        contentNodes(content, buildChild).map((child, index) => (
          <View key={index} className="flex-row gap-2">
            <Text className={cn(textClassName, 'text-muted-foreground')}>
              {ordered ? `${index + 1}.` : '•'}
            </Text>
            <View className="min-w-0 flex-1">{child}</View>
          </View>
        ))
      ) : (
        renderInlineContent(content, buildChild)
      );

      return (
        // Text props cascade to the text children draw, as CSS inherits them.
        <TextClassContext.Provider value={textClassName}>
          <View
            accessibilityRole={tag === 'header' ? 'header' : undefined}
            className={cn('min-w-0', DEFAULT_TAG_CLASSES[tag], className)}
            style={buildLayoutStyle(layoutProps)}
          >
            {body}
          </View>
        </TextClassContext.Provider>
      );
    },
  );

const ELEMENTS: ReadonlyArray<[SimpleTag, string]> = [
  ['strong', 'Strongly emphasised text.'],
  ['em', 'Emphasised text.'],
  ['small', 'Small print.'],
  ['code', 'An inline code span.'],
  ['pre', 'Preformatted text.'],
  ['mark', 'Highlighted text.'],
  ['sub', 'Subscript text.'],
  ['sup', 'Superscript text.'],
  ['blockquote', 'A block quotation.'],
  ['ul', 'An unordered list. Children should be li.'],
  ['ol', 'An ordered list. Children should be li.'],
  ['li', 'One list item.'],
  ['dl', 'A description list.'],
  ['dt', 'A description list term.'],
  ['dd', 'A description list definition.'],
  ['figure', 'A figure with optional caption.'],
  ['figcaption', 'A figure caption.'],
  ['section', 'A document section.'],
  ['article', 'A self-contained article.'],
  ['header', 'A header landmark.'],
  ['footer', 'A footer landmark.'],
  ['main', 'The main landmark.'],
  ['nav', 'A navigation landmark.'],
  ['aside', 'An aside landmark.'],
  ['table', 'A plain HTML table. Use Table for the styled shadcn version.'],
  ['thead', 'A table header group.'],
  ['tbody', 'A table body group.'],
  ['tfoot', 'A table footer group.'],
  ['tr', 'A table row.'],
  ['th', 'A table header cell.'],
  ['td', 'A table cell.'],
  ['caption', 'A table caption.'],
];

// expo-image takes no `className` until NativeWind is told to map it to `style`.
cssInterop(Image, {className: 'style'});

const elementBloks = ELEMENTS.map(([tag, description]) => createElementBlok(tag, description));

/** Only schemes a phone should hand to the OS; no `javascript:` and the like. */
const isOpenableHref = (href: string) => /^(https?|mailto|tel|sms|geo):/i.test(href.trim());

export const Anchor = createBlokComponent(
  {
    name: 'a',
    schema: z
      .object({
        href: BlokPropSchemas.DynamicString.optional().describe('Link target URL.'),
        text: BlokPropSchemas.DynamicString.optional().describe('Link text.'),
        children: contentSchema,
        newTab: boolSchema.describe('Open in a new tab.'),
        onClick: actionProp('Runs when the link is clicked.'),
        className: classNameSchema,
        ...textFields,
      })
      .describe('A hyperlink.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const href = useValue(blok.href);
    const text = useValue(blok.text);
    const children = useValue(blok.children);
    const onClick = useAction(blok.onClick);
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
  },
);

export const Img = createBlokComponent(
  {
    name: 'img',
    schema: z
      .object({
        src: BlokPropSchemas.DynamicString.optional().describe(
          'Image URL, or an image its app registered as an asset: "@self.assets.logo".',
        ),
        alt: BlokPropSchemas.DynamicString.optional().describe('Alternative text.'),
        blurhash: BlokPropSchemas.DynamicString.optional().describe(
          'Blurhash shown while the image loads.',
        ),
        className: classNameSchema,
        width: layoutFields.width,
        height: layoutFields.height,
        maxWidth: layoutFields.maxWidth,
        maxHeight: layoutFields.maxHeight,
        radius: layoutFields.radius,
      })
      .describe('An image.'),
  },
  ({component, schema}) => {
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
    // An RN image has no intrinsic size: take the ratio from the loaded bytes.
    const [ratio, setRatio] = React.useState<number | undefined>(undefined);

    // pokket has no asset host: an "@self.assets.*" source that did not
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
      <Image
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
  },
);

export const LineBreak = createBlokComponent(
  {
    name: 'br',
    schema: z.object({}).describe('A line break.'),
  },
  () => <Text>{'\n'}</Text>,
);

export const HorizontalRule = createBlokComponent(
  {
    name: 'hr',
    schema: z
      .object({
        className: classNameSchema,
        margin: layoutFields.margin,
      })
      .describe('A thematic break. Use Separator for the styled shadcn version.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);
    const margin = useValue(blok.margin);

    return (
      <View
        accessibilityRole="none"
        className={cn('my-2 h-px w-full shrink-0 bg-border', className)}
        style={cssBox(margin, 'margin')}
      />
    );
  },
);

export const Progressbar = createBlokComponent(
  {
    name: 'progress',
    schema: z
      .object({
        value: numberSchema.describe('Current value.'),
        max: numberSchema.describe('Maximum value. Defaults to 100.'),
        className: classNameSchema,
      })
      .describe('A native progress element. Use Progress for the styled version.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const max = useValue(blok.max);
    const className = useValue(blok.className);

    const resolvedMax = max ?? 100;
    const percent = resolvedMax > 0 ? ((value ?? 0) / resolvedMax) * 100 : 0;

    return <ProgressTrack percent={percent} className={className} />;
  },
);

export const htmlBlokComponents = [
  ...elementBloks,
  Anchor,
  Img,
  LineBreak,
  HorizontalRule,
  Progressbar,
];
