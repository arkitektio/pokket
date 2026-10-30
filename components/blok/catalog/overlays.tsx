import * as React from 'react';
import {Modal, Pressable, ScrollView, View} from 'react-native';
import * as z from 'zod';
import {
  useBlok,
  useEventAction,
  useValue,
  type BlokRender,
} from '@arkitektio/bsx/runtime';
import {Button} from '@/components/ui/button';
import {Popover as AnchoredPopover, PopoverContent as AnchoredPopoverContent, PopoverTrigger as AnchoredPopoverTrigger} from '@/components/ui/popover';
import {TextClassContext} from '@/components/ui/text';
import {Tooltip as AnchoredTooltip, TooltipContent as AnchoredTooltipContent, TooltipTrigger as AnchoredTooltipTrigger} from '@/components/ui/tooltip';
import {cn} from '@/lib/utils';
import {renderIcon} from './icons';
import {
  asBoolean,
  renderChildList,
  renderContent,
  useBlokDataSet,
  useControlledValue,
} from './shared';
import {sideSchema, type uiCatalog} from '@arkitektio/bsx/catalogs';

type Ui = typeof uiCatalog.components;

/**
 * ui@1's overlay surfaces, after orkestrator's `bloks/overlays.tsx`: `Dialog`,
 * `Popover` and `Tooltip`, each a root plus its parts, with the same names
 * and schemas. The parts find their root through React context, as the Radix
 * parts do on the web.
 *
 * - a `Dialog` is a centred modal;
 * - a `Popover` is a panel anchored to its trigger (`components/ui/popover`,
 *   on `@rn-primitives/popover`), placed by `side`, `align` and `sideOffset`.
 *   The primitive places it above or below only: `left` and `right` place it
 *   below. A press outside closes it;
 * - a `Tooltip` is anchored the same way (`components/ui/tooltip`). A phone
 *   has no hover, so it opens on a press of its trigger and closes on a press
 *   anywhere; `left` and `right` place it on top.
 *
 * Both open where their trigger is: a Popover or Tooltip without its trigger
 * part has nothing to anchor to and shows nothing.
 *
 * orkestrator's module surfaces (sheets, drawers, menus, hover cards) are not
 * drawn here: a blok naming one shows the unknown-component card.
 */

type OverlayState = {open: boolean; setOpen: (open: boolean) => void; kind: OverlayKind};

type OverlayKind = 'dialog' | 'popover' | 'tooltip';

const OverlayContext = React.createContext<OverlayState | null>(null);

const useOverlay = (): OverlayState => {
  const overlay = React.useContext(OverlayContext);
  return overlay ?? {open: false, setOpen: () => undefined, kind: 'dialog'};
};

const CONTENTS = {display: 'contents'} as const;

/**
 * Open/closed state follows the same rules as a form control's value: `open`
 * wins, and without it the surface keeps its own state.
 */
const overlayRootRender = (kind: OverlayKind): BlokRender<Ui['Dialog']> =>
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const open = useValue(blok.open);
    const defaultOpen = useValue(blok.defaultOpen);
    const onOpenChange = useEventAction(blok.onOpenChange);

    // Interaction state is the component's own (v2: no `bind` on a stateful component).
    const controlled = useControlledValue<boolean>({
      bind: undefined,
      value: open,
      defaultValue: defaultOpen,
      fallback: false,
      parse: asBoolean,
    });
    const {setValue} = controlled;

    const state = React.useMemo<OverlayState>(
      () => ({
        open: controlled.value,
        kind,
        setOpen: next => {
          setValue(next);
          onOpenChange?.(next);
        },
      }),
      [controlled.value, onOpenChange, setValue],
    );

    const parts = renderChildList(children, buildChild);
    // The anchored roots hold the primitive's state; their box takes no
    // part in layout, as the Radix roots render none on the web.
    return (
      <OverlayContext.Provider value={state}>
        {kind === 'popover' ? (
          <AnchoredPopover open={state.open} onOpenChange={state.setOpen} style={CONTENTS}>
            {parts}
          </AnchoredPopover>
        ) : kind === 'tooltip' ? (
          <AnchoredTooltip open={state.open} onOpenChange={state.setOpen} style={CONTENTS}>
            {parts}
          </AnchoredTooltip>
        ) : (
          parts
        )}
      </OverlayContext.Provider>
    );
  };

/** The control that opens (or, `closes`, closes) its overlay. */
const triggerRender = (closes = false): BlokRender<Ui['DialogTrigger']> =>
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const disabled = useValue(blok.disabled) === true;
    const className = useValue(blok.className);
    const overlay = useOverlay();
    const dataSet = useBlokDataSet();

    if (overlay.kind === 'tooltip' && !closes) {
      // No hover on a phone: the hint is a press away.
      return (
        <AnchoredTooltipTrigger asChild disabled={disabled}>
          <Pressable {...dataSet} className={cn('flex-row items-center gap-1 self-start', className)}>
            {renderIcon(icon)}
            {renderContent(children ?? label, buildChild)}
          </Pressable>
        </AnchoredTooltipTrigger>
      );
    }

    if (overlay.kind === 'popover' && !closes) {
      return (
        <AnchoredPopoverTrigger asChild disabled={disabled}>
          <Button {...dataSet} variant="default" className={cn('flex-row items-center gap-2', className)}>
            {renderIcon(icon)}
            {renderContent(children ?? label, buildChild)}
          </Button>
        </AnchoredPopoverTrigger>
      );
    }

    return (
      <Button
        {...dataSet}
        variant={closes ? 'outline' : 'default'}
        disabled={disabled}
        onPress={() => overlay.setOpen(!closes)}
        className={cn('flex-row items-center gap-2', className)}
      >
        {renderIcon(icon)}
        {renderContent(children ?? label, buildChild)}
      </Button>
    );
  };

/** A part that is just "a styled box of children": headers, footers. */
const panelRender = (baseClassName: string): BlokRender<Ui['DialogHeader']> =>
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const dataSet = useBlokDataSet();
    return (
      <View {...dataSet} className={cn(baseClassName, className)}>
        {renderChildList(children, buildChild)}
      </View>
    );
  };

/** A part that carries a single line of text: titles and descriptions. */
const textPartRender = (textClassName: string): BlokRender<Ui['DialogTitle']> =>
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const dataSet = useBlokDataSet();
    return (
      <View {...dataSet}>
        <TextClassContext.Provider value={cn(textClassName, className)}>
          {renderContent(children ?? text, buildChild, cn(textClassName, className))}
        </TextClassContext.Provider>
      </View>
    );
  };

/** The modal a Dialog shows while open, centred. */
const OverlayPanel = (props: {className?: string; showCloseButton: boolean; children: React.ReactNode}) => {
  const overlay = useOverlay();
  const dataSet = useBlokDataSet();
  const close = () => overlay.setOpen(false);
  return (
    <Modal transparent visible={overlay.open} animationType="fade" onRequestClose={close}>
      <Pressable accessibilityLabel="Close" onPress={close} className="flex-1 justify-center bg-black/50 p-4">
        {/* A press inside the panel stays in the panel. */}
        <Pressable
          {...dataSet}
          onPress={event => event.stopPropagation()}
          className={cn('max-h-full gap-4 rounded-xl border border-border bg-background p-5', props.className)}
        >
          <ScrollView contentContainerClassName="gap-4">{props.children}</ScrollView>
          {props.showCloseButton ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} className="absolute right-3 top-3 p-1">
              {renderIcon('x', {size: 16})}
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */

export const DialogRender = overlayRootRender('dialog');
export const DialogTriggerRender = triggerRender();
export const DialogContentRender: BlokRender<Ui['DialogContent']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const showCloseButton = useValue(blok.showCloseButton);
  const className = useValue(blok.className);
  return (
    <OverlayPanel className={className} showCloseButton={showCloseButton ?? true}>
      {renderChildList(children, buildChild)}
    </OverlayPanel>
  );
};
export const DialogHeaderRender = panelRender('gap-2');
export const DialogFooterRender = panelRender('flex-row justify-end gap-2');
export const DialogTitleRender = textPartRender('text-lg font-semibold text-foreground');
export const DialogDescriptionRender = textPartRender('text-sm text-muted-foreground');
export const DialogCloseRender = triggerRender(true);

/* -------------------------------------------------------------------------- */
/* Popover, Tooltip                                                           */
/* -------------------------------------------------------------------------- */

/** The primitives anchor above or below a trigger; left and right fall back to each one's default side. */
const verticalSide = (side: z.infer<typeof sideSchema>): 'top' | 'bottom' | undefined =>
  side === 'top' || side === 'bottom' ? side : undefined;

export const PopoverRender = overlayRootRender('popover');
export const PopoverTriggerRender = triggerRender();
export const PopoverContentRender: BlokRender<Ui['PopoverContent']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const side = useValue(blok.side);
  const align = useValue(blok.align);
  const sideOffset = useValue(blok.sideOffset);
  const className = useValue(blok.className);
  const dataSet = useBlokDataSet();
  return (
    <AnchoredPopoverContent
      {...dataSet}
      side={verticalSide(side) ?? 'bottom'}
      align={align ?? 'center'}
      sideOffset={sideOffset ?? 4}
      className={cn('gap-3', className)}
    >
      {renderContent(children, buildChild)}
    </AnchoredPopoverContent>
  );
};

export const TooltipRender = overlayRootRender('tooltip');
export const TooltipTriggerRender = triggerRender();
export const TooltipContentRender: BlokRender<Ui['TooltipContent']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const side = useValue(blok.side);
  const align = useValue(blok.align);
  const sideOffset = useValue(blok.sideOffset);
  const className = useValue(blok.className);
  const dataSet = useBlokDataSet();
  return (
    <AnchoredTooltipContent
      {...dataSet}
      side={verticalSide(side) ?? 'top'}
      align={align ?? 'center'}
      sideOffset={sideOffset ?? 4}
      className={className}
    >
      {renderContent(children, buildChild, 'text-xs text-background')}
    </AnchoredTooltipContent>
  );
};
