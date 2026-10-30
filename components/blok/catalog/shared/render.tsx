import * as React from 'react';
import {Text} from '@/components/ui/text';

export type ChildBuilder = (id: string, basePath?: string) => React.ReactNode;

export type ChildDescriptor = string | {id: string; basePath?: string};

/**
 * Renders a `children` prop — a list of child ids, optionally each with its own
 * `basePath`.
 *
 * Children are built through `buildChild`, which returns a real `<BlokNode/>`
 * element, so React context declared by the parent (a `Tabs`, a `Select`)
 * reaches the child bloks normally.
 */
export const renderChildList = (
  childList: unknown,
  buildChild: ChildBuilder,
): React.ReactNode => {
  if (!Array.isArray(childList)) {
    return null;
  }

  return childList.map((item, index) => {
    if (typeof item === 'string') {
      return <React.Fragment key={`${item}-${index}`}>{buildChild(item)}</React.Fragment>;
    }

    if (item && typeof item === 'object' && 'id' in item) {
      const child = item as Extract<ChildDescriptor, {id: string}>;
      return (
        <React.Fragment key={`${child.id}-${index}`}>
          {buildChild(child.id, child.basePath)}
        </React.Fragment>
      );
    }

    return null;
  });
};

/**
 * Renders a `children`/`content` prop that may be plain text instead of ids.
 *
 * React Native refuses a bare string outside a `<Text>`, so text comes back
 * wrapped in one (`textClassName` styles it). Use `renderInlineContent` where
 * the caller is already a `<Text>`.
 */
export const renderContent = (
  content: unknown,
  buildChild: ChildBuilder,
  textClassName?: string,
): React.ReactNode => {
  if (typeof content === 'string' || typeof content === 'number') {
    return <Text className={textClassName}>{String(content)}</Text>;
  }

  return renderInlineContent(content, buildChild);
};

/** `renderContent` for a caller that is a `<Text>` itself: text stays bare. */
export const renderInlineContent = (
  content: unknown,
  buildChild: ChildBuilder,
): React.ReactNode => {
  if (typeof content === 'string' || typeof content === 'number') {
    return String(content);
  }

  if (Array.isArray(content)) {
    return renderChildList(content, buildChild);
  }

  if (content && typeof content === 'object' && 'id' in content) {
    const child = content as Extract<ChildDescriptor, {id: string}>;
    return buildChild(child.id, child.basePath);
  }

  return null;
};

/**
 * Components a browser lays out inline (`span`, a `Link`'s `<a>`, a `Time`'s
 * `<time>`). In a `div` the web flows a run of them as one line of text, so
 * `renderFlowChildList` wraps each run in one `<Text>` (nested `<Text>` is
 * inline in React Native); everything else stacks. Loose text in a `div`
 * arrives as implicit `span` nodes, so it flows too.
 */
export const INLINE_COMPONENTS: ReadonlySet<string> = new Set(['span', 'Link', 'Time']);

const childIdOf = (item: unknown): string | undefined => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && 'id' in item) {
    return (item as Extract<ChildDescriptor, {id: string}>).id;
  }
  return undefined;
};

/**
 * `renderChildList` as a web block lays its children out: consecutive inline
 * children share one `<Text>` line instead of stacking one per row.
 */
export const renderFlowChildList = (
  childList: unknown,
  buildChild: ChildBuilder,
  componentOf: (id: string) => string | undefined,
): React.ReactNode => {
  if (!Array.isArray(childList)) {
    return null;
  }

  const groups: unknown[][] = [];
  let run: unknown[] | null = null;
  for (const item of childList) {
    const id = childIdOf(item);
    const component = id === undefined ? undefined : componentOf(id);
    if (component !== undefined && INLINE_COMPONENTS.has(component)) {
      if (run === null) {
        run = [];
        groups.push(run);
      }
      run.push(item);
    } else {
      run = null;
      groups.push([item]);
    }
  }

  return groups.map((group, index) => {
    const first = childIdOf(group[0]) ?? String(index);
    const component = componentOf(first);
    if (component !== undefined && INLINE_COMPONENTS.has(component)) {
      return <Text key={`${first}-run-${index}`}>{renderChildList(group, buildChild)}</Text>;
    }
    return <React.Fragment key={`${first}-${index}`}>{renderChildList(group, buildChild)}</React.Fragment>;
  });
};

const TEXT_UTILITY =
  /^-?(text-|font-|leading-|tracking-|decoration-|whitespace-|break-|italic$|not-italic$|underline$|overline$|line-through$|no-underline$|uppercase$|lowercase$|capitalize$|normal-case$|truncate$)/;

/**
 * The text utilities in a class list (`text-*`, `font-*`, `italic`, …, any
 * variant prefix kept). On the web a block's text classes reach the text
 * inside it through CSS inheritance; React Native has none, so a container
 * hands these to its descendants' `<Text>` through `TextClassContext`.
 */
export const textClassesOf = (className: string | undefined): string | undefined => {
  if (!className) return undefined;
  const picked = className
    .split(/\s+/)
    .filter(token => token !== '' && TEXT_UTILITY.test(token.slice(token.lastIndexOf(':') + 1)));
  return picked.length > 0 ? picked.join(' ') : undefined;
};

/** Whether a content prop is plain text, i.e. needs no child nodes. */
export const isTextContent = (content: unknown): content is string | number =>
  typeof content === 'string' || typeof content === 'number';
