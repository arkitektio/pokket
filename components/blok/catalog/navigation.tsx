import * as React from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {ChevronDown} from 'lucide-react-native';
import {
  useBlok,
  useEventAction,
  useValue,
  type BlokRender,
} from '@arkitektio/bsx/runtime';
import {Text} from '@/components/ui/text';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import {cn} from '@/lib/utils';
import {renderIcon} from './icons';
import {
  asBoolean,
  asString,
  asStringList,
  renderChildList,
  renderContent,
  useControlledValue,
} from './shared';
import type {shadcnCatalog, uiCatalog} from '@arkitektio/bsx/catalogs';

type Shadcn = typeof shadcnCatalog.components;
type Ui = typeof uiCatalog.components;

/**
 * Navigation and disclosure bloks, after orkestrator's `bloks/navigation.tsx`:
 * the same names and schemas. Each family is a root plus parts; where the web
 * leans on Radix context, the root here provides a small React context of its
 * own, which reaches the parts because `buildChild` renders real elements.
 * `Breadcrumb*`, `Pagination*` and `Menubar*` are left out, so they render the
 * unsupported card.
 */

const Chevron = ({open, size = 16}: {open: boolean; size?: number}) => {
  const colors = useThemeColors();
  return (
    <View style={{transform: [{rotate: open ? '180deg' : '0deg'}]}}>
      <ChevronDown size={size} color={colors.mutedForeground} />
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* Tabs                                                                       */
/* -------------------------------------------------------------------------- */

type TabsState = {value: string; select: (value: string) => void};

const TabsContext = React.createContext<TabsState | null>(null);

export const TabsRender: BlokRender<Ui['Tabs']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  // Interaction state is the component's own (v2: no `bind` on a stateful component).
  const bind = undefined;
  const value = useValue(blok.value);
  const defaultValue = useValue(blok.defaultValue);
  const className = useValue(blok.className);
  const onChange = useEventAction(blok.onChange);

  const controlled = useControlledValue<string>({
    bind,
    value,
    defaultValue,
    fallback: '',
    parse: asString,
  });
  const {setValue} = controlled;

  const state = React.useMemo<TabsState>(
    () => ({
      value: controlled.value,
      select: next => {
        if (next === controlled.value) return;
        setValue(next);
        onChange?.(next);
      },
    }),
    [controlled.value, onChange, setValue],
  );

  return (
    <TabsContext.Provider value={state}>
      <View className={cn('min-w-0 flex-col gap-2', className)}>
        {renderChildList(children, buildChild)}
      </View>
    </TabsContext.Provider>
  );
};

export const TabsListRender: BlokRender<Ui['TabsList']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const className = useValue(blok.className);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
      <View className={cn('flex-row items-center rounded-lg bg-muted p-[3px]', className)}>
        {renderChildList(children, buildChild)}
      </View>
    </ScrollView>
  );
};

export const TabsTriggerRender: BlokRender<Ui['TabsTrigger']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const value = useValue(blok.value) ?? '';
  const label = useValue(blok.label);
  const icon = useValue(blok.icon);
  const disabled = useValue(blok.disabled) === true;
  const className = useValue(blok.className);
  const tabs = React.useContext(TabsContext);

  const active = tabs?.value === value;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{selected: active, disabled}}
      disabled={disabled}
      onPress={() => tabs?.select(value)}
      className={cn(
        'flex-row items-center justify-center gap-1.5 rounded-md px-3 py-1.5',
        active && 'bg-background shadow-sm shadow-foreground/10',
        disabled && 'opacity-50',
        className,
      )}
    >
      {renderIcon(icon)}
      <Text
        className={cn(
          'text-sm font-medium',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label ?? value}
      </Text>
    </Pressable>
  );
};

export const TabsContentRender: BlokRender<Ui['TabsContent']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const value = useValue(blok.value) ?? '';
  const children = useValue(blok.children);
  const className = useValue(blok.className);
  const tabs = React.useContext(TabsContext);

  if (!tabs || tabs.value !== value) {
    return null;
  }

  return (
    <View className={cn('min-w-0 flex-col', className)}>
      {renderChildList(children, buildChild)}
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* Accordion                                                                  */
/* -------------------------------------------------------------------------- */

type AccordionState = {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
};

const AccordionContext = React.createContext<AccordionState | null>(null);

type AccordionItemState = {open: boolean; disabled: boolean; toggle: () => void};

const AccordionItemContext = React.createContext<AccordionItemState | null>(null);

export const AccordionRender: BlokRender<Ui['Accordion']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  // Interaction state is the component's own (v2: no `bind` on a stateful component).
  const bind = undefined;
  const multiple = useValue(blok.multiple);
  const defaultValue = useValue(blok.defaultValue);
  const collapsible = useValue(blok.collapsible);
  const className = useValue(blok.className);
  const onChange = useEventAction(blok.onChange);

  const single = useControlledValue<string>({
    bind: multiple ? undefined : bind,
    value: undefined,
    defaultValue,
    fallback: '',
    parse: asString,
  });
  const many = useControlledValue<string[]>({
    bind: multiple ? bind : undefined,
    value: undefined,
    defaultValue: defaultValue ? [defaultValue] : undefined,
    fallback: [],
    parse: asStringList,
  });

  const canCollapse = collapsible ?? true;

  const state = React.useMemo<AccordionState>(() => {
    if (multiple) {
      return {
        isOpen: value => many.value.includes(value),
        toggle: value => {
          const next = many.value.includes(value)
            ? many.value.filter(entry => entry !== value)
            : [...many.value, value];
          many.setValue(next);
          onChange?.(next);
        },
      };
    }

    return {
      isOpen: value => single.value === value,
      toggle: value => {
        const isOpen = single.value === value;
        // Single mode without `collapsible` keeps the open section open, as Radix does.
        if (isOpen && !canCollapse) return;
        const next = isOpen ? '' : value;
        single.setValue(next);
        onChange?.(next);
      },
    };
  }, [canCollapse, many, multiple, onChange, single]);

  return (
    <AccordionContext.Provider value={state}>
      <View className={cn('min-w-0 flex-col', className)}>
        {renderChildList(children, buildChild)}
      </View>
    </AccordionContext.Provider>
  );
};

export const AccordionItemRender: BlokRender<Ui['AccordionItem']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const value = useValue(blok.value) ?? '';
  const children = useValue(blok.children);
  const disabled = useValue(blok.disabled) === true;
  const className = useValue(blok.className);
  const accordion = React.useContext(AccordionContext);

  const open = accordion?.isOpen(value) ?? false;
  const item = React.useMemo<AccordionItemState>(
    () => ({open, disabled, toggle: () => accordion?.toggle(value)}),
    [accordion, disabled, open, value],
  );

  return (
    <AccordionItemContext.Provider value={item}>
      <View className={cn('min-w-0 flex-col border-b border-border', className)}>
        {renderChildList(children, buildChild)}
      </View>
    </AccordionItemContext.Provider>
  );
};

export const AccordionTriggerRender: BlokRender<Ui['AccordionTrigger']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const label = useValue(blok.label);
  const icon = useValue(blok.icon);
  const children = useValue(blok.children);
  const className = useValue(blok.className);
  const item = React.useContext(AccordionItemContext);

  const open = item?.open ?? false;
  const disabled = item?.disabled ?? false;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{expanded: open, disabled}}
      disabled={disabled}
      onPress={() => item?.toggle()}
      className={cn(
        'flex-row items-center justify-between gap-4 py-4',
        disabled && 'opacity-50',
        className,
      )}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        {renderIcon(icon)}
        {renderContent(children ?? label, buildChild, 'text-sm font-medium text-foreground')}
      </View>
      <Chevron open={open} />
    </Pressable>
  );
};

export const AccordionContentRender: BlokRender<Ui['AccordionContent']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const className = useValue(blok.className);
  const item = React.useContext(AccordionItemContext);

  if (!item?.open) {
    return null;
  }

  return (
    <View className={cn('min-w-0 flex-col pb-4', className)}>
      {renderChildList(children, buildChild)}
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* Collapsible                                                                */
/* -------------------------------------------------------------------------- */

type CollapsibleState = {open: boolean; toggle: () => void};

const CollapsibleContext = React.createContext<CollapsibleState | null>(null);

export const CollapsibleRender: BlokRender<Shadcn['Collapsible']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  // Interaction state is the component's own (v2: no `bind` on a stateful component).
  const bind = undefined;
  const open = useValue(blok.open);
  const defaultOpen = useValue(blok.defaultOpen);
  const className = useValue(blok.className);
  const onChange = useEventAction(blok.onChange);

  const controlled = useControlledValue<boolean>({
    bind,
    value: open,
    defaultValue: defaultOpen,
    fallback: false,
    parse: asBoolean,
  });
  const {setValue} = controlled;

  const state = React.useMemo<CollapsibleState>(
    () => ({
      open: controlled.value,
      toggle: () => {
        const next = !controlled.value;
        setValue(next);
        onChange?.(next);
      },
    }),
    [controlled.value, onChange, setValue],
  );

  return (
    <CollapsibleContext.Provider value={state}>
      <View className={cn('min-w-0 flex-col gap-2', className)}>
        {renderChildList(children, buildChild)}
      </View>
    </CollapsibleContext.Provider>
  );
};

export const CollapsibleTriggerRender: BlokRender<Shadcn['CollapsibleTrigger']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const label = useValue(blok.label);
  const icon = useValue(blok.icon);
  const children = useValue(blok.children);
  const className = useValue(blok.className);
  const collapsible = React.useContext(CollapsibleContext);

  const open = collapsible?.open ?? false;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{expanded: open}}
      onPress={() => collapsible?.toggle()}
      className={cn('flex-row items-center gap-2 py-1', className)}
    >
      {renderIcon(icon)}
      <View className="min-w-0 flex-shrink">
        {renderContent(children ?? label, buildChild, 'text-sm font-medium text-foreground')}
      </View>
      <Chevron open={open} />
    </Pressable>
  );
};

export const CollapsibleContentRender: BlokRender<Shadcn['CollapsibleContent']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const className = useValue(blok.className);
  const collapsible = React.useContext(CollapsibleContext);

  if (!collapsible?.open) {
    return null;
  }

  return (
    <View className={cn('min-w-0 flex-col', className)}>
      {renderChildList(children, buildChild)}
    </View>
  );
};
