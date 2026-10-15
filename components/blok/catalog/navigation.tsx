import * as React from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {ChevronDown} from 'lucide-react-native';
import * as z from 'zod';
import {
  BlokPropSchemas,
  createBlokComponent,
  useBlok,
  useEventAction,
  useValue,
} from '@/lib/ports/blok/runtime';
import {Text} from '@/components/ui/text';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import {cn} from '@/lib/utils';
import {iconNameSchema, renderIcon} from './icons';
import {
  actionProp,
  asBoolean,
  asString,
  asStringList,
  bindSchema,
  boolSchema,
  childListSchema,
  classNameSchema,
  contentSchema,
  disabledSchema,
  renderChildList,
  renderContent,
  useControlledValue,
} from './shared';

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

export const Tabs = createBlokComponent(
  {
    name: 'Tabs',
    schema: z
      .object({
        children: childListSchema.describe('A TabsList plus one TabsContent per tab.'),
        bind: bindSchema.describe('Data-model path holding the active tab value.'),
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled active tab.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe('Initially active tab.'),
        className: classNameSchema,
        onChange: actionProp('Runs when the active tab changes. May read $event.'),
      })
      .describe('A tabbed surface.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const bind = useValue(blok.bind);
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
  },
);

export const TabsList = createBlokComponent(
  {
    name: 'TabsList',
    schema: z
      .object({
        children: childListSchema.describe('TabsTrigger children.'),
        className: classNameSchema,
      })
      .describe('The row of tab triggers.'),
  },
  ({buildChild, component, schema}) => {
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
  },
);

export const TabsTrigger = createBlokComponent(
  {
    name: 'TabsTrigger',
    schema: z
      .object({
        value: z.string().describe('The tab this trigger activates.'),
        label: BlokPropSchemas.DynamicString.optional().describe('Trigger text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One tab in a TabsList.'),
  },
  ({component, schema}) => {
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
  },
);

export const TabsContent = createBlokComponent(
  {
    name: 'TabsContent',
    schema: z
      .object({
        value: z.string().describe('The tab this panel belongs to.'),
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('The panel shown for one tab.'),
  },
  ({buildChild, component, schema}) => {
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
  },
);

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

export const Accordion = createBlokComponent(
  {
    name: 'Accordion',
    schema: z
      .object({
        children: childListSchema.describe('AccordionItem children.'),
        bind: bindSchema.describe('Data-model path holding the open item value(s).'),
        multiple: boolSchema.describe('Allow more than one section open at a time.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe('Initially open item.'),
        collapsible: boolSchema.describe(
          'Allow closing the open section in single mode. Defaults to true.',
        ),
        className: classNameSchema,
        onChange: actionProp('Runs when the open sections change. May read $event.'),
      })
      .describe('A stack of collapsible sections.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const bind = useValue(blok.bind);
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
  },
);

export const AccordionItem = createBlokComponent(
  {
    name: 'AccordionItem',
    schema: z
      .object({
        value: z.string().describe('Identifies this section.'),
        children: childListSchema.describe('An AccordionTrigger and an AccordionContent.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One section of an Accordion.'),
  },
  ({buildChild, component, schema}) => {
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
  },
);

export const AccordionTrigger = createBlokComponent(
  {
    name: 'AccordionTrigger',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Section heading.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        children: contentSchema,
        className: classNameSchema,
      })
      .describe('The clickable heading of an AccordionItem.'),
  },
  ({buildChild, component, schema}) => {
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
  },
);

export const AccordionContent = createBlokComponent(
  {
    name: 'AccordionContent',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('The body of an AccordionItem.'),
  },
  ({buildChild, component, schema}) => {
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
  },
);

/* -------------------------------------------------------------------------- */
/* Collapsible                                                                */
/* -------------------------------------------------------------------------- */

type CollapsibleState = {open: boolean; toggle: () => void};

const CollapsibleContext = React.createContext<CollapsibleState | null>(null);

export const Collapsible = createBlokComponent(
  {
    name: 'Collapsible',
    schema: z
      .object({
        children: childListSchema.describe('A CollapsibleTrigger and a CollapsibleContent.'),
        bind: bindSchema.describe('Data-model path holding the open state.'),
        open: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled open state.'),
        defaultOpen: boolSchema.describe('Open on mount when uncontrolled.'),
        className: classNameSchema,
        onChange: actionProp('Runs when it opens or closes. May read $event.'),
      })
      .describe('A single region that can be shown or hidden.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const bind = useValue(blok.bind);
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
  },
);

export const CollapsibleTrigger = createBlokComponent(
  {
    name: 'CollapsibleTrigger',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Trigger text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        children: contentSchema,
        className: classNameSchema,
      })
      .describe('The control that shows or hides a Collapsible.'),
  },
  ({buildChild, component, schema}) => {
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
  },
);

export const CollapsibleContent = createBlokComponent(
  {
    name: 'CollapsibleContent',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('The region a Collapsible shows or hides.'),
  },
  ({buildChild, component, schema}) => {
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
  },
);

export const navigationBlokComponents = [
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
];
