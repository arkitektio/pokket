import * as React from 'react';
import {View} from 'react-native';
import * as z from 'zod';
import {BlokPropSchemas, createBlokComponent, useBlok, useValue} from '@/lib/ports/blok/runtime';
import {Text} from '@/components/ui/text';
import {cn} from '@/lib/utils';
import {
  classNameSchema,
  contentSchema,
  headingLevelSchema,
  mapTextAlign,
  renderInlineContent,
  textAlignSchema,
  textFields,
  textLines,
  textPresentationClasses,
  useTextPresentationProps,
} from './shared';

/**
 * Text-bearing bloks, after orkestrator's `bloks/typography.tsx`: the same
 * names and schemas. Each renders one `<Text>`; child ids nest inside it, so
 * inline children (`span`, `strong`, `a`) flow with the text as on the web.
 */

/**
 * `Text` and `p`/`span` differ only in the element they render, so they share
 * one factory over one schema. In React Native both are a `<Text>`.
 */
const textComponentSchema = z
  .object({
    text: BlokPropSchemas.DynamicString.optional().describe('The text to render.'),
    children: contentSchema,
    className: classNameSchema,
    ...textFields,
  })
  .describe('A run of text.');

const createTextComponent = (name: string, description: string) =>
  createBlokComponent(
    {
      name,
      schema: textComponentSchema.describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const className = useValue(blok.className);
      const presentation = useTextPresentationProps(blok);

      return (
        <Text
          className={cn(...textPresentationClasses(presentation), className)}
          numberOfLines={textLines(presentation)}
        >
          {renderInlineContent(children ?? text, buildChild)}
        </Text>
      );
    },
  );

export const TextBlok = createTextComponent('Text', 'A paragraph of text.');
export const Paragraph = createTextComponent('p', 'An HTML paragraph.');
export const Span = createTextComponent('span', 'An inline run of text.');

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const headingFields = {
  text: BlokPropSchemas.DynamicString.optional().describe('The heading text.'),
  children: contentSchema,
  align: textAlignSchema,
  className: classNameSchema,
};

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
    accessibilityRole="header"
    className={cn(headingClassName(level, align), className)}
  >
    {children}
  </Text>
);

/**
 * `Heading` takes the level as a prop; `h1`…`h6` are the same renderer with
 * the level fixed, so a payload can use whichever reads better. The fixed ones
 * deliberately do not publish a `level` prop — it would have no effect.
 */
export const Heading = createBlokComponent(
  {
    name: 'Heading',
    schema: z
      .object({...headingFields, level: headingLevelSchema})
      .describe('A section heading at an author-chosen level.'),
  },
  ({buildChild, component, schema}) => {
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
  },
);

const createFixedHeading = (level: HeadingLevel) =>
  createBlokComponent(
    {
      name: level,
      schema: z.object(headingFields).describe(`An HTML ${level} heading.`),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const align = useValue(blok.align);
      const className = useValue(blok.className);

      return (
        <HeadingText level={level} align={align} className={className}>
          {renderInlineContent(children ?? text, buildChild)}
        </HeadingText>
      );
    },
  );

export const H1 = createFixedHeading('h1');
export const H2 = createFixedHeading('h2');
export const H3 = createFixedHeading('h3');
export const H4 = createFixedHeading('h4');
export const H5 = createFixedHeading('h5');
export const H6 = createFixedHeading('h6');

export const Kbd = createBlokComponent(
  {
    name: 'Kbd',
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('The key or chord to show.'),
        children: contentSchema,
        className: classNameSchema,
      })
      .describe('A keyboard key or shortcut.'),
  },
  ({buildChild, component, schema}) => {
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
  },
);

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

export const Markdown = createBlokComponent(
  {
    name: 'Markdown',
    schema: z
      .object({
        content: BlokPropSchemas.DynamicString.optional().describe('Markdown source to render.'),
        className: classNameSchema,
      })
      .describe('Renders a Markdown document.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const content = useValue(blok.content);
    const className = useValue(blok.className);

    return <MarkdownView content={content ?? ''} className={className} />;
  },
);

export const typographyBlokComponents = [
  TextBlok,
  Paragraph,
  Span,
  Heading,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Kbd,
  Markdown,
];
