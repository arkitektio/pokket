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

/** Whether a content prop is plain text, i.e. needs no child nodes. */
export const isTextContent = (content: unknown): content is string | number =>
  typeof content === 'string' || typeof content === 'number';
