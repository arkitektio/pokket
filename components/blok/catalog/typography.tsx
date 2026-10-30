import * as React from 'react';
import {View} from 'react-native';
import {dateText, relativeTime} from '@arkitektio/bsx/renderer/functions/v2/index';
import {useBlok, useBlokRuntime, useValue, type BlokRender} from '@arkitektio/bsx/runtime';
import {Text} from '@/components/ui/text';
import {cn} from '@/lib/utils';
import {
  mapTextAlign,
  renderInlineContent,
  textLines,
  textPresentationClasses,
  useBlokDataSet,
  useTextPresentationProps,
} from './shared';
import type {shadcnCatalog, uiCatalog} from '@arkitektio/bsx/catalogs';

type Shadcn = typeof shadcnCatalog.components;
type Ui = typeof uiCatalog.components;

export const TextRender: BlokRender<Ui['Text']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const text = useValue(blok.text);
  const children = useValue(blok.children);
  const className = useValue(blok.className);
  const presentation = useTextPresentationProps(blok);
  const dataSet = useBlokDataSet();

  return (
    <Text
      {...dataSet}
      className={cn(...textPresentationClasses(presentation), className)}
      numberOfLines={textLines(presentation)}
    >
      {renderInlineContent(children ?? text, buildChild)}
    </Text>
  );
};

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const headingClassName = (level: HeadingLevel, align?: 'start' | 'center' | 'end') =>
  cn(
    mapTextAlign(align),
    level === 'h1' && 'text-4xl font-extrabold tracking-tight',
    level === 'h2' && 'text-3xl font-bold tracking-tight',
    level === 'h3' && 'text-2xl font-semibold tracking-tight',
    level === 'h4' && 'text-xl font-semibold tracking-tight',
    level === 'h5' && 'text-lg font-semibold',
    level === 'h6' && 'text-base font-semibold uppercase tracking-wide text-muted-foreground',
  );

const HeadingText = ({
  level,
  align,
  className,
  children,
}: {
  level: HeadingLevel;
  align?: 'start' | 'center' | 'end';
  className?: string;
  children: React.ReactNode;
}) => (
  <Text
    {...useBlokDataSet()}
    accessibilityRole="header"
    className={cn(headingClassName(level, align), className)}
  >
    {children}
  </Text>
);

/** A heading at an author-chosen level (ui@1 has no `h1`…`h6`). */
export const HeadingRender: BlokRender<Ui['Heading']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const text = useValue(blok.text);
  const children = useValue(blok.children);
  const level = useValue(blok.level);
  const align = useValue(blok.align);
  const className = useValue(blok.className);

  return (
    <HeadingText level={(level ?? 'h3') as HeadingLevel} align={align} className={className}>
      {renderInlineContent(children ?? text, buildChild)}
    </HeadingText>
  );
};

export const KbdRender: BlokRender<Shadcn['Kbd']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const text = useValue(blok.text);
  const children = useValue(blok.children);
  const className = useValue(blok.className);

  return (
    <Text
      className={cn(
        'overflow-hidden rounded border border-border bg-muted px-1 font-mono text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      {renderInlineContent(children ?? text, buildChild)}
    </Text>
  );
};

/**
 * Markdown without a markdown engine: block structure (headings, lists,
 * quotes, fenced code) is kept, inline markup is stripped to its text. All of
 * it is selectable.
 */
const stripInline = (line: string) =>
  line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]*)\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\w)/g, '$1$2')
    .replace(/(^|[^_\w])_(?!\s)([^_]+?)_(?!\w)/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1');

const MARKDOWN_HEADING_CLASSES = [
  'text-2xl font-bold tracking-tight',
  'text-xl font-semibold tracking-tight',
  'text-lg font-semibold',
  'text-base font-semibold',
  'text-sm font-semibold',
  'text-sm font-semibold text-muted-foreground',
];

type MarkdownBlock =
  | {kind: 'heading'; level: number; text: string}
  | {kind: 'paragraph'; text: string}
  | {kind: 'item'; marker: string; indent: number; text: string}
  | {kind: 'quote'; text: string}
  | {kind: 'code'; text: string}
  | {kind: 'rule'};

const parseMarkdown = (source: string): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = [];
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({kind: 'paragraph', text: stripInline(paragraph.join(' '))});
      paragraph = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^\s*```/.test(line)) {
      flush();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push({kind: 'code', text: code.join('\n')});
      continue;
    }

    if (!line.trim()) {
      flush();
      continue;
    }

    const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      flush();
      blocks.push({kind: 'heading', level: heading[1].length, text: stripInline(heading[2])});
      continue;
    }

    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush();
      blocks.push({kind: 'rule'});
      continue;
    }

    const item = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (item) {
      flush();
      const marker = /\d/.test(item[2]) ? `${item[2].replace(')', '.')}` : '•';
      const task = /^\[([ xX])\]\s+(.*)$/.exec(item[3]);
      blocks.push({
        kind: 'item',
        marker: task ? (task[1] === ' ' ? '☐' : '☑') : marker,
        indent: Math.floor(item[1].replace(/\t/g, '  ').length / 2),
        text: stripInline(task ? task[2] : item[3]),
      });
      continue;
    }

    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      flush();
      blocks.push({kind: 'quote', text: stripInline(quote[1])});
      continue;
    }

    paragraph.push(line.trim());
  }

  flush();
  return blocks;
};

const MarkdownView = ({content, className}: {content: string; className?: string}) => {
  const blocks = React.useMemo(() => parseMarkdown(content), [content]);

  return (
    <View className={cn('min-w-0 gap-2', className)}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return (
              <Text
                key={index}
                selectable
                accessibilityRole="header"
                className={cn('mt-1', MARKDOWN_HEADING_CLASSES[block.level - 1])}
              >
                {block.text}
              </Text>
            );
          case 'item':
            return (
              <View key={index} className="flex-row gap-2" style={{paddingLeft: block.indent * 16}}>
                <Text className="text-sm leading-relaxed text-muted-foreground">{block.marker}</Text>
                <Text selectable className="min-w-0 flex-1 text-sm leading-relaxed">
                  {block.text}
                </Text>
              </View>
            );
          case 'quote':
            return (
              <View key={index} className="border-l-2 border-border pl-3">
                <Text selectable className="text-sm italic leading-relaxed text-muted-foreground">
                  {block.text}
                </Text>
              </View>
            );
          case 'code':
            return (
              <View key={index} className="rounded-md bg-muted p-3">
                <Text selectable className="font-mono text-xs">
                  {block.text}
                </Text>
              </View>
            );
          case 'rule':
            return <View key={index} className="my-1 h-px w-full bg-border" />;
          case 'paragraph':
          default:
            return (
              <Text key={index} selectable className="text-sm leading-relaxed">
                {block.text}
              </Text>
            );
        }
      })}
    </View>
  );
};

export const MarkdownRender: BlokRender<Ui['Markdown']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const content = useValue(blok.content);
  const className = useValue(blok.className);

  return <MarkdownView content={content ?? ''} className={className} />;
};

/** How long until a relative text can change: every second under a minute, then every half minute. */
const tickFor = (distanceMs: number): number => (Math.abs(distanceMs) < 60_000 ? 1_000 : 30_000);

/**
 * The wall clock, ticking while `active`: the one place a blok's view reads
 * it (the language never does). Measured from `then` while travelling, it
 * does not tick at all.
 */
const useClock = (active: boolean, target: number | null): number => {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        const current = Date.now();
        setNow(current);
        schedule(tickFor(target === null ? 0 : target - current));
      }, delay);
    };
    // Caught up at once (it may have been off while travelling), then on its own beat.
    schedule(0);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [active, target]);
  return now;
};

/**
 * `<Time value relative? format?>` (ui@1): a moment, absolute or relative.
 * Relative time is measured from the viewed moment: the wall clock live
 * (ticking here), `then` while travelling, so the past renders as it did.
 */
export const TimeRender: BlokRender<Ui['Time']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const value = useValue(blok.value);
  const relative = useValue(blok.relative) === true;
  const format = useValue(blok.format);
  const className = useValue(blok.className);
  const travelAt = useBlokRuntime(state => state.travelAt);
  const dataSet = useBlokDataSet();
  const moment = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  const known = !Number.isNaN(moment);
  const then = travelAt === null ? Number.NaN : Date.parse(travelAt);
  const live = Number.isNaN(then);
  const now = useClock(relative && known && live, known ? moment : null);
  if (!known || typeof value !== 'string') return null;
  const text = relative ? relativeTime((moment - (live ? now : then)) / 1000, undefined) : dateText(value, format ?? null, undefined, true);
  return (
    <Text {...dataSet} accessibilityLabel={relative ? dateText(value, null, undefined, true) : undefined} className={cn(className)}>
      {text}
    </Text>
  );
};
