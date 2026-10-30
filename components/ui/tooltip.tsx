import * as TooltipPrimitive from '@rn-primitives/tooltip';
import * as React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { useControlledAnchor } from '~/components/ui/popover';
import { TextClassContext } from '~/components/ui/text';
import { cn } from '~/lib/utils';

/**
 * A short hint anchored to the element it describes (rn-reusables' `tooltip`,
 * on `@rn-primitives/tooltip`). A phone has no hover: it opens on a press of
 * its trigger and closes on a press anywhere. Controllable and drawn in a
 * full-window `Modal`, as `Popover` is (see there). The primitive anchors a
 * tooltip above or below only: `left` and `right` place it on top.
 */

type TooltipState = {
  triggerRef: React.RefObject<TooltipPrimitive.TriggerRef | null>;
  shown: boolean;
};

const TooltipContext = React.createContext<TooltipState | null>(null);

const useTooltip = (): TooltipState => {
  const tooltip = React.useContext(TooltipContext);
  if (!tooltip) throw new Error('Tooltip parts must be rendered inside a Tooltip.');
  return tooltip;
};

function Tooltip({
  open,
  onOpenChange,
  ...props
}: Omit<TooltipPrimitive.RootProps, 'onOpenChange'> & {
  /** Controlled open state; without it the tooltip keeps its own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { triggerRef, shown, onPrimitiveOpenChange } = useControlledAnchor<TooltipPrimitive.TriggerRef>(open, onOpenChange);
  const state = React.useMemo(() => ({ triggerRef, shown }), [triggerRef, shown]);
  return (
    <TooltipContext.Provider value={state}>
      <TooltipPrimitive.Root onOpenChange={onPrimitiveOpenChange} {...props} />
    </TooltipContext.Provider>
  );
}

function TooltipTrigger(props: Omit<TooltipPrimitive.TriggerProps, 'ref'>) {
  const { triggerRef } = useTooltip();
  return <TooltipPrimitive.Trigger ref={triggerRef} {...props} />;
}

function TooltipContent({ className, sideOffset = 4, ...props }: TooltipPrimitive.ContentProps) {
  const { shown, triggerRef } = useTooltip();
  return (
    <Modal
      transparent
      visible={shown}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => triggerRef.current?.close()}
    >
      <TooltipPrimitive.Overlay style={StyleSheet.absoluteFill}>
        <TextClassContext.Provider value="text-xs text-background">
          <TooltipPrimitive.Content
            sideOffset={sideOffset}
            className={cn('z-50 max-w-[80%] rounded-md bg-foreground px-3 py-1.5', className)}
            {...props}
          />
        </TextClassContext.Provider>
      </TooltipPrimitive.Overlay>
    </Modal>
  );
}

export { Tooltip, TooltipContent, TooltipTrigger };
