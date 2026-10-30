import * as React from 'react';
import {ScrollView, View} from 'react-native';
import {useBlok, useBlokTree, useValue, type BlokRender} from '@arkitektio/bsx/runtime';
import {Text, TextClassContext} from '@/components/ui/text';
import {cn} from '@/lib/utils';
import {
  buildLayoutStyle,
  buildLayoutTextStyle,
  cssLength,
  cssPoints,
  isTextContent,
  mapAlign,
  mapJustify,
  renderChildList,
  renderContent,
  renderFlowChildList,
  textClassesOf,
  useBaseLayoutProps,
} from './shared';
import type {htmlCatalog, shadcnCatalog, uiCatalog} from '@arkitektio/bsx/catalogs';

type Html = typeof htmlCatalog.components;
type Shadcn = typeof shadcnCatalog.components;
type Ui = typeof uiCatalog.components;

const flexRender =
  (fixedDirection?: 'row' | 'column'): BlokRender<Ui['Flex']> =>
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
    };

export const FlexRender = flexRender();
export const RowRender = flexRender('row');
export const ColumnRender = flexRender('column');

/**
 * Rows of equal cells. RN has no CSS grid: a fixed column count lays out in
 * rows of that many, and auto-fit becomes a wrapping row of cells at least
 * `minColumnWidth` wide.
 */
export const GridRender: BlokRender<Ui['Grid']> = ({buildChild, component, schema}) => {
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
};

export const DivRender: BlokRender<Html['div']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const tree = useBlokTree();
  const inheritedText = React.useContext(TextClassContext);
  const layoutProps = useBaseLayoutProps(blok);
  const children = useValue(blok.children);
  const className = useValue(blok.className);
  const textStyle = buildLayoutTextStyle(layoutProps);
  const ownText = textClassesOf(className);

  // As on the web, where this is a block: inline children flow on one line,
  // and its text classes reach the text inside it.
  const content = isTextContent(children) ? (
    <Text style={textStyle}>{String(children)}</Text>
  ) : Array.isArray(children) ? (
    renderFlowChildList(children, buildChild, id => tree.nodes.get(id)?.component)
  ) : (
    renderContent(children, buildChild)
  );

  return (
    <View className={cn('min-w-0', className)} style={buildLayoutStyle(layoutProps)}>
      {ownText ? (
        <TextClassContext.Provider value={cn(inheritedText, ownText)}>{content}</TextClassContext.Provider>
      ) : (
        content
      )}
    </View>
  );
};

export const SpacerRender: BlokRender<Ui['Spacer']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const size = useValue(blok.size);
  const grow = useValue(blok.grow);

  return (
    <View
      accessible={false}
      style={{flexBasis: cssLength(size) ?? undefined, flexGrow: grow ?? (size ? 0 : 1), flexShrink: 0}}
    />
  );
};

export const SeparatorRender: BlokRender<Ui['Separator']> = ({component, schema}) => {
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
};

export const AspectRatioRender: BlokRender<Shadcn['AspectRatio']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const ratio = useValue(blok.ratio);
  const className = useValue(blok.className);

  return (
    <View className={cn('w-full overflow-hidden', className)} style={{aspectRatio: ratio ?? 16 / 9}}>
      {renderChildList(children, buildChild)}
    </View>
  );
};

export const ScrollAreaRender: BlokRender<Ui['ScrollArea']> = ({buildChild, component, schema}) => {
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
};
