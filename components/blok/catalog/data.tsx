import * as React from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {Image} from 'expo-image';
import * as z from 'zod';
import {
  BlokPropSchemas,
  createBlokComponent,
  useAction,
  useBlok,
  useValue,
} from '@/lib/ports/blok/runtime';
import {
  Card as UICard,
  CardContent as UICardContent,
  CardDescription as UICardDescription,
  CardFooter as UICardFooter,
  CardHeader as UICardHeader,
  CardTitle as UICardTitle,
} from '@/components/ui/card';
import {Text} from '@/components/ui/text';
import {cn} from '@/lib/utils';
import {iconNameSchema, renderIcon} from './icons';
import {
  actionProp,
  alignSchema,
  buildLayoutStyle,
  childListSchema,
  childSchema,
  classNameSchema,
  contentSchema,
  cssPoints,
  isTextContent,
  justifySchema,
  layoutFields,
  mapAlign,
  mapJustify,
  mapTextAlign,
  renderChildList,
  renderContent,
  renderInlineContent,
  spacingSchema,
  textAlignSchema,
  useBaseLayoutProps,
} from './shared';

/**
 * Content containers, tables and media, after orkestrator's `bloks/data.tsx`:
 * the same names and schemas, drawn with React Native views. `Carousel`,
 * `CarouselItem` and `Chart` are left out, so they render the unsupported card.
 */

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

type CardSize = 'default' | 'sm';

/** The parts pad themselves to the density their `Card` asked for. */
const CardSizeContext = React.createContext<CardSize>('default');

const cardInset = (size: CardSize) => (size === 'sm' ? 'px-3' : 'px-4');

export const Card = createBlokComponent(
  {
    name: 'Card',
    schema: z
      .object({
        child: childSchema,
        children: childListSchema,
        size: z.enum(['default', 'sm']).optional().describe('Card density.'),
        className: classNameSchema,
        padding: spacingSchema,
        width: layoutFields.width,
        minHeight: layoutFields.minHeight,
        height: layoutFields.height,
        background: layoutFields.background,
        borderColor: layoutFields.borderColor,
        radius: layoutFields.radius,
      })
      .describe('A bordered surface grouping related content.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const child = useValue(blok.child);
    const children = useValue(blok.children);
    const size = useValue(blok.size) ?? 'default';
    const className = useValue(blok.className);

    return (
      <CardSizeContext.Provider value={size}>
        <UICard
          className={cn(
            'min-w-0 flex-col overflow-hidden',
            size === 'sm' ? 'gap-3 py-3' : 'gap-4 py-4',
            className,
          )}
          style={buildLayoutStyle(layoutProps)}
        >
          {child ? buildChild(child) : null}
          {renderChildList(children, buildChild)}
        </UICard>
      </CardSizeContext.Provider>
    );
  },
);

export const CardHeader = createBlokComponent(
  {
    name: 'CardHeader',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
        padding: spacingSchema,
        gap: spacingSchema,
      })
      .describe('The header region of a Card.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const size = React.useContext(CardSizeContext);

    return (
      <UICardHeader
        className={cn('min-w-0 gap-1.5 py-0', cardInset(size), className)}
        style={buildLayoutStyle(layoutProps)}
      >
        {renderChildList(children, buildChild)}
      </UICardHeader>
    );
  },
);

/** `CardTitle` and `CardDescription` differ only in the element they render. */
const createCardTextBlok = (
  name: string,
  Part: typeof UICardTitle | typeof UICardDescription,
  textClassName: string,
  description: string,
) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          text: BlokPropSchemas.DynamicString.optional().describe('The text to render.'),
          children: contentSchema,
          className: classNameSchema,
          align: textAlignSchema,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const className = useValue(blok.className);
      const align = useValue(blok.align);

      const content = children ?? text;
      const classes = cn(textClassName, mapTextAlign(align), className);

      if (isTextContent(content)) {
        return <Part className={classes}>{String(content)}</Part>;
      }

      return <View className="min-w-0">{renderInlineContent(content, buildChild)}</View>;
    },
  );

export const CardTitle = createCardTextBlok(
  'CardTitle',
  UICardTitle,
  'text-base leading-snug',
  'The title of a Card.',
);
export const CardDescription = createCardTextBlok(
  'CardDescription',
  UICardDescription,
  'text-sm',
  'Supporting text under a CardTitle.',
);

export const CardContent = createBlokComponent(
  {
    name: 'CardContent',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
        padding: spacingSchema,
        gap: spacingSchema,
      })
      .describe('The body region of a Card.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const gap = useValue(blok.gap);
    const size = React.useContext(CardSizeContext);

    return (
      <UICardContent
        className={cn('min-w-0 py-0', cardInset(size), className)}
        style={buildLayoutStyle(layoutProps)}
      >
        <View className="min-w-0 flex-col" style={{gap: cssPoints(gap)}}>
          {renderChildList(children, buildChild)}
        </View>
      </UICardContent>
    );
  },
);

export const CardFooter = createBlokComponent(
  {
    name: 'CardFooter',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
        justify: justifySchema,
        align: alignSchema,
        gap: spacingSchema,
        padding: spacingSchema,
      })
      .describe('The footer region of a Card.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const justify = useValue(blok.justify);
    const align = useValue(blok.align);
    const size = React.useContext(CardSizeContext);

    return (
      <UICardFooter
        className={cn(
          'min-w-0 flex-row flex-wrap py-0',
          cardInset(size),
          mapJustify(justify),
          align ? mapAlign(align) : 'items-center',
          className,
        )}
        style={buildLayoutStyle(layoutProps)}
      >
        {renderChildList(children, buildChild)}
      </UICardFooter>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Table                                                                      */
/* -------------------------------------------------------------------------- */

type TableSection = 'header' | 'body' | 'footer';

/** Which row group a row or cell sits in, so header cells can style as such. */
const TableSectionContext = React.createContext<TableSection>('body');

/** Cells share the row equally but never shrink below this. */
const TABLE_CELL_MIN_WIDTH = 112;

const TABLE_SECTION_CLASSES: Record<TableSection, string> = {
  header: 'bg-muted',
  body: '',
  footer: 'bg-muted/50 border-t border-border',
};

const createTablePartBlok = (name: string, section: TableSection, description: string) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          children: childListSchema,
          className: classNameSchema,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const children = useValue(blok.children);
      const className = useValue(blok.className);

      return (
        <TableSectionContext.Provider value={section}>
          <View className={cn('flex-col', TABLE_SECTION_CLASSES[section], className)}>
            {renderChildList(children, buildChild)}
          </View>
        </TableSectionContext.Provider>
      );
    },
  );

export const Table = createBlokComponent(
  {
    name: 'Table',
    schema: z
      .object({
        children: childListSchema.describe('TableHeader, TableBody and TableFooter children.'),
        caption: BlokPropSchemas.DynamicString.optional().describe('Caption below the table.'),
        className: classNameSchema,
      })
      .describe('A styled data table. Use the lowercase table element for a plain one.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const caption = useValue(blok.caption);
    const className = useValue(blok.className);

    return (
      <View className={cn('min-w-0', className)}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{flexGrow: 1}}
        >
          <View className="min-w-full flex-col overflow-hidden rounded-md border border-border">
            {renderChildList(children, buildChild)}
          </View>
        </ScrollView>
        {caption ? (
          <Text className="mt-2 text-center text-sm text-muted-foreground">{caption}</Text>
        ) : null}
      </View>
    );
  },
);

export const TableHeader = createTablePartBlok(
  'TableHeader',
  'header',
  'The header row group of a Table.',
);
export const TableBody = createTablePartBlok('TableBody', 'body', 'The body row group of a Table.');
export const TableFooter = createTablePartBlok(
  'TableFooter',
  'footer',
  'The footer row group of a Table.',
);

export const TableRow = createBlokComponent(
  {
    name: 'TableRow',
    schema: z
      .object({
        children: childListSchema.describe('TableHead or TableCell children.'),
        onClick: actionProp('Runs when the row is clicked.'),
        className: classNameSchema,
      })
      .describe('One row of a Table.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const onClick = useAction(blok.onClick);
    const className = useValue(blok.className);
    const section = React.useContext(TableSectionContext);

    const rowClassName = cn(
      'flex-row items-stretch',
      section !== 'footer' && 'border-b border-border',
      className,
    );

    if (onClick) {
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => onClick()}
          className={cn(rowClassName, 'active:bg-muted/50')}
        >
          {renderChildList(children, buildChild)}
        </Pressable>
      );
    }

    return <View className={rowClassName}>{renderChildList(children, buildChild)}</View>;
  },
);

/** `TableHead` and `TableCell` share one shape over two text styles. */
const createTableCellBlok = (name: string, head: boolean, description: string) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          text: BlokPropSchemas.DynamicString.optional().describe('Cell text.'),
          children: contentSchema,
          align: textAlignSchema,
          className: classNameSchema,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const align = useValue(blok.align);
      const className = useValue(blok.className);
      const section = React.useContext(TableSectionContext);

      const isHead = head || section === 'header';

      return (
        <View
          className={cn(
            'flex-1 justify-center px-3',
            isHead ? 'py-2' : 'py-2.5',
            align === 'center' ? 'items-center' : align === 'end' ? 'items-end' : 'items-stretch',
            className,
          )}
          style={{minWidth: TABLE_CELL_MIN_WIDTH}}
        >
          {renderContent(
            children ?? text,
            buildChild,
            cn(
              'text-sm',
              isHead ? 'font-medium text-muted-foreground' : 'text-foreground',
              mapTextAlign(align),
            ),
          )}
        </View>
      );
    },
  );

export const TableHead = createTableCellBlok('TableHead', true, 'A header cell of a Table.');
export const TableCell = createTableCellBlok('TableCell', false, 'A cell of a Table.');

/* -------------------------------------------------------------------------- */
/* Avatar and Item                                                            */
/* -------------------------------------------------------------------------- */

const AVATAR_SIZES = {sm: 24, default: 32, lg: 40} as const;

/**
 * Orkestrator also resolves `@self.assets.<name>` here; pokket has no asset
 * store yet, so `src` is used as a plain URL and an asset name falls back to
 * the initials.
 */
export const Avatar = createBlokComponent(
  {
    name: 'Avatar',
    schema: z
      .object({
        src: BlokPropSchemas.DynamicString.optional().describe(
          'Image URL, or an image its app registered as an asset: "@self.assets.logo".',
        ),
        alt: BlokPropSchemas.DynamicString.optional().describe('Alternative text.'),
        fallback: BlokPropSchemas.DynamicString.optional().describe(
          'Initials shown while the image is missing.',
        ),
        size: z.enum(['default', 'sm', 'lg']).optional().describe('Avatar size.'),
        className: classNameSchema,
      })
      .describe('A user or entity avatar.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const src = useValue(blok.src);
    const alt = useValue(blok.alt);
    const fallback = useValue(blok.fallback);
    const size = useValue(blok.size);
    const className = useValue(blok.className);
    const [failed, setFailed] = React.useState(false);

    React.useEffect(() => setFailed(false), [src]);

    const dimension = AVATAR_SIZES[size ?? 'default'];
    const showImage = Boolean(src) && !failed && /^(https?:|data:|file:)/.test(src ?? '');
    const initials = fallback ?? alt?.slice(0, 2).toUpperCase();

    return (
      <View
        accessibilityLabel={alt}
        className={cn('items-center justify-center overflow-hidden rounded-full bg-muted', className)}
        style={{width: dimension, height: dimension}}
      >
        {showImage ? (
          <Image
            source={{uri: src}}
            style={{width: dimension, height: dimension}}
            contentFit="cover"
            onError={() => setFailed(true)}
          />
        ) : initials ? (
          <Text
            className={cn(
              'font-medium text-muted-foreground',
              size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-base' : 'text-xs',
            )}
          >
            {initials}
          </Text>
        ) : null}
      </View>
    );
  },
);

export const ItemGroup = createBlokComponent(
  {
    name: 'ItemGroup',
    schema: z
      .object({
        children: childListSchema.describe('Item children.'),
        className: classNameSchema,
      })
      .describe('A vertical list of Items.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <View className={cn('min-w-0 flex-col gap-2', className)}>
        {renderChildList(children, buildChild)}
      </View>
    );
  },
);

const ITEM_VARIANT_CLASSES = {
  default: 'border border-transparent',
  outline: 'border border-border',
  muted: 'border border-transparent bg-muted/50',
} as const;

export const Item = createBlokComponent(
  {
    name: 'Item',
    schema: z
      .object({
        title: BlokPropSchemas.DynamicString.optional().describe('Item title.'),
        description: BlokPropSchemas.DynamicString.optional().describe('Supporting text.'),
        icon: iconNameSchema.describe('Icon shown in the media slot.'),
        children: childListSchema.describe('Controls shown in the actions slot.'),
        variant: z
          .enum(['default', 'outline', 'muted'])
          .optional()
          .describe('Item appearance.'),
        size: z.enum(['default', 'sm']).optional().describe('Item density.'),
        onClick: actionProp('Runs when the item is clicked.'),
        className: classNameSchema,
      })
      .describe('A list row with a title, description and actions.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const title = useValue(blok.title);
    const description = useValue(blok.description);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const variant = useValue(blok.variant);
    const size = useValue(blok.size);
    const onClick = useAction(blok.onClick);
    const className = useValue(blok.className);

    const itemClassName = cn(
      'min-w-0 flex-row items-center rounded-md',
      ITEM_VARIANT_CLASSES[variant ?? 'default'],
      size === 'sm' ? 'gap-2.5 px-3 py-2.5' : 'gap-4 p-4',
      className,
    );

    const body = (
      <>
        {icon ? (
          <View className="size-8 items-center justify-center rounded-sm border border-border bg-muted">
            {renderIcon(icon)}
          </View>
        ) : null}
        <View className="min-w-0 flex-1 flex-col gap-1">
          {title ? (
            <Text className="text-sm font-medium leading-snug text-foreground">{title}</Text>
          ) : null}
          {description ? (
            <Text className="text-sm leading-normal text-muted-foreground" numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
        {children ? (
          <View className="flex-row items-center gap-2">
            {renderChildList(children, buildChild)}
          </View>
        ) : null}
      </>
    );

    if (onClick) {
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => onClick()}
          className={cn(itemClassName, 'active:bg-muted')}
        >
          {body}
        </Pressable>
      );
    }

    return <View className={itemClassName}>{body}</View>;
  },
);

export const dataBlokComponents = [
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  ItemGroup,
  Item,
];
