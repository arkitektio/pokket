import * as PopoverPrimitive from '@rn-primitives/popover';
import * as React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { TextClassContext } from '~/components/ui/text';
import { cn } from '~/lib/utils';

/**
 * A panel anchored to the control that opens it (rn-reusables' `popover`, on
 * `@rn-primitives/popover`).
 *
 * Two departures from rn-reusables:
 * - it can be controlled (`open`): the primitive keeps its own state, so the
 *   root drives it through the trigger's `open()` / `close()`, which also
 *   measure the trigger to anchor to. `onOpenChange` reports only what the
 *   user did, never that sync;
 * - the content is drawn in a transparent full-window `Modal` rather than
 *   through a `PortalHost`: pokket mounts none, and the primitive places the
 *   content by the trigger's window position, which is the modal's origin.
 */

type AnchoredState = {
  triggerRef: React.RefObject<PopoverPrimitive.TriggerRef | null>;
  shown: boolean;
};

const AnchoredContext = React.createContext<AnchoredState | null>(null);

const useAnchored = (): AnchoredState => {
  const anchored = React.useContext(AnchoredContext);
  if (!anchored) throw new Error('Popover parts must be rendered inside a Popover.');
  return anchored;
};

/**
 * The state shared by the popover and the tooltip: what the primitive shows,
 * and the sync of a controlled `open` onto it.
 */
export const useControlledAnchor = <TRef extends { open: () => void; close: () => void }>(
  open: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
) => {
  const triggerRef = React.useRef<TRef | null>(null);
  const [shown, setShown] = React.useState(false);
  const syncing = React.useRef(false);

  React.useEffect(() => {
    if (open === undefined || open === shown || !triggerRef.current) return;
    syncing.current = true;
    try {
      if (open) triggerRef.current.open();
      else triggerRef.current.close();
    } finally {
      syncing.current = false;
    }
  }, [open, shown]);

  const onPrimitiveOpenChange = React.useCallback(
    (next: boolean) => {
      setShown(next);
      if (!syncing.current) onOpenChange?.(next);
    },
    [onOpenChange],
  );

  return { triggerRef, shown, onPrimitiveOpenChange };
};

function Popover({
  open,
  onOpenChange,
  ...props
}: Omit<PopoverPrimitive.RootProps, 'onOpenChange'> & {
  /** Controlled open state; without it the popover keeps its own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { triggerRef, shown, onPrimitiveOpenChange } = useControlledAnchor<PopoverPrimitive.TriggerRef>(open, onOpenChange);
  const state = React.useMemo(() => ({ triggerRef, shown }), [triggerRef, shown]);
  return (
    <AnchoredContext.Provider value={state}>
      <PopoverPrimitive.Root onOpenChange={onPrimitiveOpenChange} {...props} />
    </AnchoredContext.Provider>
  );
}

function PopoverTrigger(props: Omit<PopoverPrimitive.TriggerProps, 'ref'>) {
  const { triggerRef } = useAnchored();
  return <PopoverPrimitive.Trigger ref={triggerRef} {...props} />;
}

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: PopoverPrimitive.ContentProps) {
  const { shown, triggerRef } = useAnchored();
  return (
    <Modal
      transparent
      visible={shown}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => triggerRef.current?.close()}
    >
      <PopoverPrimitive.Overlay style={StyleSheet.absoluteFill}>
        <TextClassContext.Provider value="text-popover-foreground">
          <PopoverPrimitive.Content
            align={align}
            sideOffset={sideOffset}
            className={cn(
              'z-50 w-72 max-w-[90%] rounded-md border border-border bg-popover p-4 shadow-md shadow-foreground/5',
              className,
            )}
            {...props}
          />
        </TextClassContext.Provider>
      </PopoverPrimitive.Overlay>
    </Modal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
