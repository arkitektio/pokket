import * as React from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {Image} from 'expo-image';
import {
  useAction,
  useBlok,
  useValue,
  type BlokRender,
} from '@arkitektio/bsx/runtime';
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
import {renderIcon} from './icons';
import {
  buildLayoutStyle,
  cssPoints,
  isTextContent,
  mapAlign,
  mapJustify,
  mapTextAlign,
  renderChildList,
  renderContent,
  renderInlineContent,
  useBaseLayoutProps,
} from './shared';
import type {shadcnCatalog, uiCatalog} from '@arkitektio/bsx/catalogs';

type Shadcn = typeof shadcnCatalog.components;
type Ui = typeof uiCatalog.components;

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

export const CardRender: BlokRender<Ui['Card']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const layoutProps = useBaseLayoutProps(blok);
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
        {renderChildList(children, buildChild)}
      </UICard>
    </CardSizeContext.Provider>
  );
};

export const CardHeaderRender: BlokRender<Ui['CardHeader']> = ({buildChild, component, schema}) => {
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
};

/** `CardTitle` and `CardDescription` differ only in the element they render. */
const cardTextRender = (
  Part: typeof UICardTitle | typeof UICardDescription,
  textClassName: string,
): BlokRender<Ui['CardTitle']> =>
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
  };

export const CardTitleRender = cardTextRender(UICardTitle, 'text-base leading-snug');
export const CardDescriptionRender = cardTextRender(UICardDescription, 'text-sm');

export const CardContentRender: BlokRender<Ui['CardContent']> = ({buildChild, component, schema}) => {
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
};

export const CardFooterRender: BlokRender<Ui['CardFooter']> = ({buildChild, component, schema}) => {
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
};

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

const tablePartRender = (section: TableSection): BlokRender<Ui['TableHeader']> =>
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
  };

export const TableRender: BlokRender<Ui['Table']> = ({buildChild, component, schema}) => {
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
};

export const TableHeaderRender = tablePartRender('header');
export const TableBodyRender = tablePartRender('body');
export const TableFooterRender = tablePartRender('footer');

export const TableRowRender: BlokRender<Ui['TableRow']> = ({buildChild, component, schema}) => {
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
};

/** `TableHead` and `TableCell` share one shape over two text styles. */
const tableCellRender = (head: boolean): BlokRender<Ui['TableHead']> =>
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
  };

export const TableHeadRender = tableCellRender(true);
export const TableCellRender = tableCellRender(false);

/* -------------------------------------------------------------------------- */
/* Avatar and Item                                                            */
/* -------------------------------------------------------------------------- */

const AVATAR_SIZES = {sm: 24, default: 32, lg: 40} as const;

/**
 * Orkestrator also resolves `@self.assets.<name>` here; pokket has no asset
 * store yet, so `src` is used as a plain URL and an asset name falls back to
 * the initials.
 */
export const AvatarRender: BlokRender<Shadcn['Avatar']> = ({component, schema}) => {
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
};

export const ItemGroupRender: BlokRender<Shadcn['ItemGroup']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const className = useValue(blok.className);

  return (
    <View className={cn('min-w-0 flex-col gap-2', className)}>
      {renderChildList(children, buildChild)}
    </View>
  );
};

const ITEM_VARIANT_CLASSES = {
  default: 'border border-transparent',
  outline: 'border border-border',
  muted: 'border border-transparent bg-muted/50',
} as const;

export const ItemRender: BlokRender<Shadcn['Item']> = ({buildChild, component, schema}) => {
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
};
