import * as React from 'react';
import {ScrollView, View} from 'react-native';
import * as z from 'zod';
import {createBlokComponent, useBlok, useValue} from '@/lib/ports/blok/runtime';
import {Text} from '@/components/ui/text';
import {cn} from '@/lib/utils';
import {
  alignSchema,
  boolSchema,
  buildLayoutStyle,
  buildLayoutTextStyle,
  childListSchema,
  classNameSchema,
  contentSchema,
  cssLength,
  cssPoints,
  flexDirectionSchema,
  isTextContent,
  justifySchema,
  layoutFields,
  mapAlign,
  mapJustify,
  numberSchema,
  orientationSchema,
  renderChildList,
  renderContent,
  sizeSchema,
  spacingSchema,
  useBaseLayoutProps,
} from './shared';

/**
 * Box and structural bloks, after orkestrator's `bloks/layout.tsx`: the same
 * names and schemas, drawn with `View`. `Resizable*` has no phone equivalent
 * and is left out, so it renders the unsupported card.
 */

const flexSchema = z
  .object({
    children: childListSchema,
    direction: flexDirectionSchema,
    wrap: boolSchema.describe('Allow children to wrap onto multiple lines.'),
    justify: justifySchema,
    align: alignSchema,
    bordered: boolSchema.describe('Draw a border around the box.'),
    ...layoutFields,
  })
  .describe('A flexbox container.');

const createFlexComponent = (name: string, description: string, fixedDirection?: 'row' | 'column') =>
  createBlokComponent(
    {
      name,
      schema: flexSchema.describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const layoutProps = useBaseLayoutProps(blok);
      const children = useValue(blok.children);
      const direction = useValue(blok.direction);
      const wrap = useValue(blok.wrap);
      const justify = useValue(blok.justify);
      const align = useValue(blok.align);
      const bordered = useValue(blok.bordered);

      const resolvedDirection = fixedDirection ?? (direction === 'column' ? 'column' : 'row');

      return (
        <View
          className={cn(
            'min-w-0',
            resolvedDirection === 'column' ? 'flex-col' : 'flex-row',
            wrap && 'flex-wrap',
            mapJustify(justify),
            // A column stretches its children across, like a block flow on the web.
            align ? mapAlign(align) : resolvedDirection === 'column' ? 'items-stretch' : 'items-start',
            bordered && 'rounded-md border border-border',
          )}
          style={buildLayoutStyle(layoutProps)}
        >
          {renderChildList(children, buildChild)}
        </View>
      );
    },
  );

export const Flex = createFlexComponent('Flex', 'A flexbox container with an author-set direction.');
export const Row = createFlexComponent('Row', 'A horizontal flexbox container.', 'row');
export const Column = createFlexComponent('Column', 'A vertical flexbox container.', 'column');

/**
 * Rows of equal cells. RN has no CSS grid: a fixed column count lays out in
 * rows of that many, and auto-fit becomes a wrapping row of cells at least
 * `minColumnWidth` wide.
 */
export const Grid = createBlokComponent(
  {
    name: 'Grid',
    schema: z
      .object({
        children: childListSchema,
        columns: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe('Fixed column count. Omit to auto-fit on minColumnWidth.'),
        minColumnWidth: sizeSchema.describe('Minimum column width when auto-fitting.'),
        bordered: boolSchema.describe('Draw a border around the grid.'),
        ...layoutFields,
      })
      .describe('A CSS grid container.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const columns = useValue(blok.columns);
    const minColumnWidth = useValue(blok.minColumnWidth);
    const bordered = useValue(blok.bordered);

    const gap = cssPoints(layoutProps.gap) ?? 0;
    const cells = React.Children.toArray(renderChildList(children, buildChild));

    if (columns) {
      const rows: React.ReactNode[][] = [];
      for (let index = 0; index < cells.length; index += columns) {
        rows.push(cells.slice(index, index + columns));
      }
      return (
        <View
          className={cn('min-w-0', bordered && 'rounded-md border border-border')}
          style={buildLayoutStyle(layoutProps)}
        >
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row" style={{gap}}>
              {row.map((cell, cellIndex) => (
                <View key={cellIndex} className="min-w-0 flex-1">
                  {cell}
                </View>
              ))}
              {/* Keep a short last row's cells the width of the others. */}
              {Array.from({length: columns - row.length}, (_, index) => (
                <View key={`pad-${index}`} className="flex-1" />
              ))}
            </View>
          ))}
        </View>
      );
    }

    const minWidth = cssLength(minColumnWidth) ?? 160;
    return (
      <View
        className={cn('min-w-0 flex-row flex-wrap', bordered && 'rounded-md border border-border')}
        style={buildLayoutStyle(layoutProps)}
      >
        {cells.map((cell, index) => (
          <View key={index} style={{flexGrow: 1, flexBasis: minWidth, minWidth}}>
            {cell}
          </View>
        ))}
      </View>
    );
  },
);

export const Div = createBlokComponent(
  {
    name: 'div',
    schema: z
      .object({
        children: contentSchema,
        className: classNameSchema,
        ...layoutFields,
      })
      .describe('A plain block container.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const textStyle = buildLayoutTextStyle(layoutProps);

    return (
      <View className={cn('min-w-0', className)} style={buildLayoutStyle(layoutProps)}>
        {isTextContent(children) ? (
          <Text style={textStyle}>{String(children)}</Text>
        ) : (
          renderContent(children, buildChild)
        )}
      </View>
    );
  },
);

export const Spacer = createBlokComponent(
  {
    name: 'Spacer',
    schema: z
      .object({
        size: sizeSchema.describe('Fixed size along the parent axis.'),
        grow: numberSchema.describe('flex-grow; defaults to 1 when no size is given.'),
      })
      .describe('Flexible empty space between siblings.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const size = useValue(blok.size);
    const grow = useValue(blok.grow);

    return (
      <View
        accessible={false}
        style={{flexBasis: cssLength(size), flexGrow: grow ?? (size ? 0 : 1), flexShrink: 0}}
      />
    );
  },
);

export const Separator = createBlokComponent(
  {
    name: 'Separator',
    schema: z
      .object({
        orientation: orientationSchema,
        className: classNameSchema,
      })
      .describe('A dividing line between sections.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const orientation = useValue(blok.orientation);
    const className = useValue(blok.className);

    return (
      <View
        className={cn(
          'shrink-0 bg-border',
          orientation === 'vertical' ? 'w-px self-stretch' : 'h-px w-full',
          className,
        )}
      />
    );
  },
);

export const AspectRatio = createBlokComponent(
  {
    name: 'AspectRatio',
    schema: z
      .object({
        children: childListSchema,
        ratio: z.number().positive().optional().describe('Width divided by height, e.g. 1.777.'),
        className: classNameSchema,
      })
      .describe('Constrains its content to a fixed aspect ratio.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const ratio = useValue(blok.ratio);
    const className = useValue(blok.className);

    return (
      <View className={cn('w-full overflow-hidden', className)} style={{aspectRatio: ratio ?? 16 / 9}}>
        {renderChildList(children, buildChild)}
      </View>
    );
  },
);

export const ScrollArea = createBlokComponent(
  {
    name: 'ScrollArea',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
        gap: spacingSchema,
        height: sizeSchema,
        maxHeight: sizeSchema,
      })
      .describe('A scrollable region with styled scrollbars.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const gap = useValue(blok.gap);
    const height = useValue(blok.height);
    const maxHeight = useValue(blok.maxHeight);

    return (
      <ScrollView
        className={className}
        style={{height: cssLength(height), maxHeight: cssLength(maxHeight)}}
        contentContainerStyle={{gap: cssPoints(gap)}}
        nestedScrollEnabled
      >
        {renderChildList(children, buildChild)}
      </ScrollView>
    );
  },
);

export const layoutBlokComponents = [
  Flex,
  Row,
  Column,
  Grid,
  Div,
  Spacer,
  Separator,
  AspectRatio,
  ScrollArea,
];
