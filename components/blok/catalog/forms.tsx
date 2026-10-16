import {cva} from 'class-variance-authority';
import * as Lucide from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Switch as RNSwitch,
  TextInput,
  View,
  type GestureResponderEvent,
  type KeyboardTypeOptions,
  type LayoutChangeEvent,
} from 'react-native';
import * as z from 'zod';
import {
  BlokPropSchemas,
  createBlokComponent,
  useBlok,
  useChecks,
  useEventAction,
  usePendingAction,
  useValidation,
  useValue,
} from '@/lib/ports/blok/runtime';
import {Button as UIButton} from '@/components/ui/button';
import {Text} from '@/components/ui/text';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import type {ThemeColors} from '@/lib/theme/brandTokens';
import {cn} from '@/lib/utils';
import {iconNameSchema, renderIcon} from './icons';
import {
  actionProp,
  asBoolean,
  asNumber,
  asString,
  asStringList,
  bindSchema,
  boolSchema,
  buttonSizeSchema,
  buttonVariantSchema,
  checksSchema,
  childListSchema,
  childSchema,
  classNameSchema,
  contentSchema,
  disabledSchema,
  numberSchema,
  orientationSchema,
  renderChildList,
  renderContent,
  throttle,
  useControlledValue,
} from './shared';

/**
 * Buttons and form controls, after orkestrator's `bloks/forms.tsx`: the same
 * names, schemas and value contract, drawn with React Native.
 *
 * Every value-carrying control shares one contract:
 *
 * - `bind` is a data-model path the control reads from and writes back to;
 *   `value`/`defaultValue` are the controlled/uncontrolled alternatives.
 *   `useControlledValue` resolves the three into one value plus a setter.
 * - the change action fires *after* the write, so its arguments can read the
 *   bound path — or `$event`, which carries the new value directly.
 *
 * Multi-part controls (`Select`, `RadioGroup`, `ToggleGroup`) are composed from
 * subcomponents as on the web; the parent is a React context provider here in
 * place of Radix, and a child blok is a real React child, so it reaches it.
 *
 * Left out, so they render the unsupported card: `InputOTP`, `InputGroup`,
 * `InputGroupAddon` and `Calendar`.
 */

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type AppButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type AppButtonSize = 'default' | 'sm' | 'lg' | 'icon';

/** The app button has four sizes; the web's eight fold onto them. */
const mapButtonSize = (
  size: z.infer<typeof buttonSizeSchema>,
): {size: AppButtonSize; className?: string} => {
  switch (size) {
    case 'xs':
      return {size: 'sm', className: 'h-8 px-2.5'};
    case 'sm':
      return {size: 'sm'};
    case 'lg':
      return {size: 'lg'};
    case 'icon':
      return {size: 'icon'};
    case 'icon-xs':
      return {size: 'icon', className: 'h-8 w-8'};
    case 'icon-sm':
      return {size: 'icon', className: 'h-9 w-9'};
    case 'icon-lg':
      return {size: 'icon', className: 'h-11 w-11'};
    default:
      return {size: 'default'};
  }
};

/** The colour of a button's label, for the icon and spinner beside it. */
const buttonForeground = (variant: AppButtonVariant, colors: ThemeColors) => {
  switch (variant) {
    case 'default':
      return colors.primaryForeground;
    case 'destructive':
      return colors.destructiveForeground;
    case 'link':
      return colors.primary;
    default:
      return colors.foreground;
  }
};

export const Button = createBlokComponent(
  {
    name: 'Button',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Button text.'),
        child: childSchema,
        children: contentSchema,
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        onClick: actionProp('Runs when the button is clicked.'),
        className: classNameSchema,
        variant: buttonVariantSchema,
        size: buttonSizeSchema,
        fullWidth: boolSchema.describe('Stretch to the full width of the parent.'),
        disabled: disabledSchema,
        checks: checksSchema,
      })
      .describe('A clickable button.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const validation = useValidation(component, schema);
    const label = useValue(blok.label);
    const child = useValue(blok.child);
    const children = useValue(blok.children);
    const icon = useValue(blok.icon);
    const {run: onClick, pending} = usePendingAction(blok.onClick);
    const className = useValue(blok.className);
    const rawVariant = useValue(blok.variant);
    const size = useValue(blok.size);
    const fullWidth = useValue(blok.fullWidth);
    const disabled = useValue(blok.disabled);
    const checks = useChecks(useValue(blok.checks));
    const colors = useThemeColors();

    const resolvedVariant: AppButtonVariant =
      rawVariant === 'primary'
        ? 'default'
        : rawVariant === 'borderless'
          ? 'ghost'
          : (rawVariant ?? 'default');
    const resolvedSize = mapButtonSize(size);
    const foreground = buttonForeground(resolvedVariant, colors);

    // `checks` are the author-facing guard; validation failures are a payload
    // bug and disable the button too, with the reason as the a11y hint.
    const blockingReason = checks.failures[0] ?? validation.validationErrors[0];
    const isDisabled = disabled === true || Boolean(blockingReason);

    return (
      <UIButton
        variant={resolvedVariant}
        size={resolvedSize.size}
        // The app button lays out as a column; a label beside an icon is a row.
        className={cn(
          'flex-row gap-2',
          resolvedSize.className,
          fullWidth && 'w-full self-stretch',
          pending && 'opacity-70',
          className,
        )}
        onPress={onClick}
        disabled={isDisabled}
        accessibilityHint={blockingReason}
        accessibilityState={{disabled: isDisabled, busy: pending}}
      >
        {pending ? <ActivityIndicator size="small" color={foreground} /> : renderIcon(icon, {color: foreground})}
        {child ? buildChild(child) : renderContent(children ?? label, buildChild)}
      </UIButton>
    );
  },
);

export const ButtonGroup = createBlokComponent(
  {
    name: 'ButtonGroup',
    schema: z
      .object({
        children: childListSchema,
        orientation: orientationSchema,
        className: classNameSchema,
      })
      .describe('Groups related buttons into one connected control.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const orientation = useValue(blok.orientation);
    const className = useValue(blok.className);

    return (
      <View
        className={cn(
          'gap-1',
          orientation === 'vertical' ? 'flex-col items-stretch' : 'flex-row flex-wrap items-center',
          className,
        )}
      >
        {renderChildList(children, buildChild)}
      </View>
    );
  },
);

// ---------------------------------------------------------------------------
// Text inputs
// ---------------------------------------------------------------------------

const textInputClassName =
  'rounded-md border border-input bg-background px-3 text-base text-foreground';

/** The HTML `type` an author wrote, as the RN keyboard and masking it implies. */
const inputTypeProps = (
  type: string | undefined,
): {keyboardType?: KeyboardTypeOptions; secureTextEntry?: boolean; autoCapitalize?: 'none'} => {
  switch (type) {
    case 'number':
      return {keyboardType: 'numeric'};
    case 'email':
      return {keyboardType: 'email-address', autoCapitalize: 'none'};
    case 'password':
      return {secureTextEntry: true, autoCapitalize: 'none'};
    case 'tel':
      return {keyboardType: 'phone-pad'};
    case 'url':
      return {keyboardType: 'url', autoCapitalize: 'none'};
    default:
      return {};
  }
};

export const Input = createBlokComponent(
  {
    name: 'Input',
    schema: z
      .object({
        bind: bindSchema,
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled value.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe(
          'Initial value when uncontrolled.',
        ),
        placeholder: BlokPropSchemas.DynamicString.nullish().describe('Placeholder text.'),
        type: z
          .string()
          .optional()
          .describe('HTML input type, e.g. "text", "number", "email", "password".'),
        className: classNameSchema,
        disabled: disabledSchema,
        readOnly: boolSchema.describe('Show the value but refuse edits.'),
        fullWidth: boolSchema.describe('Stretch to the full width of the parent.'),
        action: actionProp('Runs after each edit. Arguments may read $event.'),
      })
      .describe('A single-line text input.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const placeholder = useValue(blok.placeholder);
    const type = useValue(blok.type);
    const className = useValue(blok.className);
    const disabled = useValue(blok.disabled);
    const readOnly = useValue(blok.readOnly);
    const fullWidth = useValue(blok.fullWidth);
    const action = useEventAction(blok.action);
    const colors = useThemeColors();

    const controlled = useControlledValue<string>({
      bind,
      value,
      defaultValue,
      fallback: '',
      parse: asString,
    });

    return (
      <TextInput
        {...inputTypeProps(type)}
        value={controlled.value}
        placeholder={typeof placeholder === 'string' ? placeholder : undefined}
        placeholderTextColor={colors.mutedForeground}
        // An input has no width of its own: in a Row it would collapse.
        className={cn(
          textInputClassName,
          'h-10 min-w-40 native:h-12',
          fullWidth && 'w-full self-stretch',
          disabled === true && 'opacity-50',
          className,
        )}
        editable={disabled !== true && readOnly !== true}
        onChangeText={nextValue => {
          controlled.setValue(nextValue);
          action?.(nextValue);
        }}
      />
    );
  },
);

export const Textarea = createBlokComponent(
  {
    name: 'Textarea',
    schema: z
      .object({
        bind: bindSchema,
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled value.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe(
          'Initial value when uncontrolled.',
        ),
        placeholder: BlokPropSchemas.DynamicString.nullish().describe('Placeholder text.'),
        rows: numberSchema.describe('Visible rows.'),
        className: classNameSchema,
        disabled: disabledSchema,
        readOnly: boolSchema.describe('Show the value but refuse edits.'),
        onChange: actionProp('Runs after each edit. Arguments may read $event.'),
      })
      .describe('A multi-line text input.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const placeholder = useValue(blok.placeholder);
    const rows = useValue(blok.rows);
    const className = useValue(blok.className);
    const disabled = useValue(blok.disabled);
    const readOnly = useValue(blok.readOnly);
    const onChange = useEventAction(blok.onChange);
    const colors = useThemeColors();

    const controlled = useControlledValue<string>({
      bind,
      value,
      defaultValue,
      fallback: '',
      parse: asString,
    });

    return (
      <TextInput
        multiline
        textAlignVertical="top"
        numberOfLines={rows}
        value={controlled.value}
        placeholder={typeof placeholder === 'string' ? placeholder : undefined}
        placeholderTextColor={colors.mutedForeground}
        className={cn(
          textInputClassName,
          'min-w-40 py-2',
          !rows && 'min-h-20',
          disabled === true && 'opacity-50',
          className,
        )}
        // `rows` as a height: one 24pt line each, plus the vertical padding.
        style={rows ? {minHeight: rows * 24 + 16} : undefined}
        editable={disabled !== true && readOnly !== true}
        onChangeText={nextValue => {
          controlled.setValue(nextValue);
          onChange?.(nextValue);
        }}
      />
    );
  },
);

export const Label = createBlokComponent(
  {
    name: 'Label',
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('Label text.'),
        children: contentSchema,
        htmlFor: z.string().optional().describe('Id of the control this labels.'),
        className: classNameSchema,
      })
      .describe('A label for a form control.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    // `htmlFor` has no RN counterpart: a label cannot focus another view.
    return <>{renderContent(children ?? text, buildChild, cn('text-sm font-medium', className))}</>;
  },
);

// ---------------------------------------------------------------------------
// Checkbox and Switch
// ---------------------------------------------------------------------------

/** `Checkbox` and `Switch` are the same contract over two presentations. */
const createBooleanControl = (name: string, description: string, kind: 'checkbox' | 'switch') =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          bind: bindSchema,
          checked: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled checked state.'),
          defaultChecked: boolSchema.describe('Initial state when uncontrolled.'),
          label: BlokPropSchemas.DynamicString.optional().describe('Text shown beside the control.'),
          disabled: disabledSchema,
          className: classNameSchema,
          onChange: actionProp('Runs on toggle. Arguments may read $event.'),
          checks: checksSchema,
        })
        .describe(description),
    },
    ({component, schema}) => {
      const blok = useBlok(component, schema);
      const bind = useValue(blok.bind);
      const checked = useValue(blok.checked);
      const defaultChecked = useValue(blok.defaultChecked);
      const label = useValue(blok.label);
      const disabled = useValue(blok.disabled);
      const className = useValue(blok.className);
      const onChange = useEventAction(blok.onChange);
      const checks = useChecks(useValue(blok.checks));
      const colors = useThemeColors();

      const controlled = useControlledValue<boolean>({
        bind,
        value: checked,
        defaultValue: defaultChecked,
        fallback: false,
        parse: asBoolean,
      });

      const blockingReason = checks.failures[0];
      const isDisabled = disabled === true || Boolean(blockingReason);
      const toggle = (next: boolean) => {
        const nextValue = next === true;
        controlled.setValue(nextValue);
        onChange?.(nextValue);
      };

      const control =
        kind === 'switch' ? (
          <RNSwitch
            value={controlled.value}
            disabled={isDisabled}
            onValueChange={toggle}
            trackColor={{false: colors.input, true: colors.primary}}
            ios_backgroundColor={colors.input}
            accessibilityHint={blockingReason}
          />
        ) : (
          <View
            className={cn(
              'h-5 w-5 items-center justify-center rounded-sm border border-primary',
              controlled.value && 'bg-primary',
            )}
          >
            {controlled.value ? (
              <Lucide.Check size={14} color={colors.primaryForeground} strokeWidth={3} />
            ) : null}
          </View>
        );

      // The whole row is the hit target, as a web `<label>` around the control is.
      // A Switch handles its own press; with no label it stands alone.
      if (kind === 'switch' && !label) {
        return (
          <View className={cn('self-start', isDisabled && 'opacity-50', className)}>{control}</View>
        );
      }

      return (
        <Pressable
          role={kind === 'switch' ? 'switch' : 'checkbox'}
          accessibilityState={{checked: controlled.value, disabled: isDisabled}}
          accessibilityHint={blockingReason}
          disabled={isDisabled}
          hitSlop={8}
          onPress={() => toggle(!controlled.value)}
          className={cn(
            'flex-row items-center gap-2 self-start',
            isDisabled && 'opacity-50',
            className,
          )}
        >
          {control}
          {label ? <Text className="text-sm">{label}</Text> : null}
        </Pressable>
      );
    },
  );

export const Checkbox = createBooleanControl(
  'Checkbox',
  'A checkbox bound to a boolean value.',
  'checkbox',
);
export const Switch = createBooleanControl('Switch', 'A switch bound to a boolean value.', 'switch');

// ---------------------------------------------------------------------------
// Slider
// ---------------------------------------------------------------------------

/** How often a slider's `onChange` runs while it is dragged. */
const SLIDER_CHANGE_INTERVAL_MS = 150;

const THUMB_SIZE = 20;

const decimalsOf = (step: number) => (String(step).split('.')[1] ?? '').length;

/**
 * A horizontal one-thumb slider: a track, its filled part and a thumb, driven
 * by the responder props of the whole bar. A touch anywhere jumps the thumb there
 * and the drag continues from it, as Radix's slider does.
 */
export const RangeSlider = (props: {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  className?: string;
  onValueChange: (next: number) => void;
  onValueCommit: (next: number) => void;
}) => {
  const {className, disabled, max, min, step, value} = props;
  const [width, setWidth] = React.useState(0);
  // Only touched from the gesture handlers below, never during render.
  const gesture = React.useRef({startX: 0, startPageX: 0, last: value});

  const valueAt = (x: number) => {
    const track = width - THUMB_SIZE;
    if (track <= 0 || max <= min) return min;
    const ratio = Math.min(1, Math.max(0, (x - THUMB_SIZE / 2) / track));
    const raw = min + ratio * (max - min);
    const stepped = step > 0 ? min + Math.round((raw - min) / step) * step : raw;
    const clamped = Math.min(max, Math.max(min, stepped));
    return step > 0 ? Number(clamped.toFixed(decimalsOf(step))) : clamped;
  };

  const move = (x: number) => {
    const next = valueAt(x);
    if (next === gesture.current.last) return;
    gesture.current.last = next;
    props.onValueChange(next);
  };

  const end = () => props.onValueCommit(gesture.current.last);

  const onGrant = (event: GestureResponderEvent) => {
    gesture.current = {
      startX: event.nativeEvent.locationX,
      startPageX: event.nativeEvent.pageX,
      last: value,
    };
    move(event.nativeEvent.locationX);
  };

  const onMove = (event: GestureResponderEvent) =>
    move(gesture.current.startX + event.nativeEvent.pageX - gesture.current.startPageX);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const thumbLeft = ratio * Math.max(0, width - THUMB_SIZE);

  return (
    <View
      onLayout={onLayout}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      // Hold the gesture against a parent ScrollView once it has started.
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={end}
      onResponderTerminate={end}
      role="slider"
      accessibilityValue={{min, max, now: value}}
      accessibilityState={{disabled}}
      className={cn('h-8 min-w-40 justify-center self-stretch', disabled && 'opacity-50', className)}
    >
      {/* Children ignore touches, so `locationX` is always relative to the bar. */}
      <View
        pointerEvents="none"
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
        style={{marginHorizontal: THUMB_SIZE / 2}}
      >
        <View className="h-full bg-primary" style={{width: `${ratio * 100}%`}} />
      </View>
      <View
        pointerEvents="none"
        className="absolute rounded-full border-2 border-primary bg-background"
        style={{left: thumbLeft, width: THUMB_SIZE, height: THUMB_SIZE}}
      />
    </View>
  );
};

export const Slider = createBlokComponent(
  {
    name: 'Slider',
    schema: z
      .object({
        bind: bindSchema,
        value: numberSchema.describe('Controlled value.'),
        defaultValue: numberSchema.describe('Initial value when uncontrolled.'),
        min: numberSchema.describe('Minimum. Defaults to 0.'),
        max: numberSchema.describe('Maximum. Defaults to 100.'),
        step: numberSchema.describe('Step size.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp(
          'Runs while dragging, at most every 150 ms and always with the final value. Arguments may read $event.',
        ),
        onCommit: actionProp('Runs when the drag ends. Arguments may read $event.'),
      })
      .describe('A slider bound to a numeric value.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const min = useValue(blok.min);
    const max = useValue(blok.max);
    const step = useValue(blok.step);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);
    const onCommit = useEventAction(blok.onCommit);

    // A drag yields a value per pointer move, and an action is a request to an
    // agent: the thumb follows the finger, the action follows at a measured pace.
    const onChangeRef = React.useRef(onChange);
    React.useLayoutEffect(() => {
      onChangeRef.current = onChange;
    });
    const sendChange = React.useMemo(
      () => throttle((next: number) => onChangeRef.current?.(next), SLIDER_CHANGE_INTERVAL_MS),
      [],
    );
    React.useEffect(() => () => sendChange.cancel(), [sendChange]);

    const controlled = useControlledValue<number>({
      bind,
      value,
      defaultValue,
      fallback: min ?? 0,
      parse: asNumber,
    });

    return (
      <RangeSlider
        value={controlled.value}
        min={min ?? 0}
        max={max ?? 100}
        // Radix's default step.
        step={step ?? 1}
        disabled={disabled === true}
        className={className}
        onValueChange={nextValue => {
          controlled.setValue(nextValue);
          sendChange(nextValue);
        }}
        onValueCommit={nextValue => {
          // Where the drag stopped is sent before the commit, never after it.
          sendChange.flush();
          onCommit?.(nextValue);
        }}
      />
    );
  },
);

// ---------------------------------------------------------------------------
// RadioGroup
// ---------------------------------------------------------------------------

type RadioGroupContextValue = {
  value: string;
  select: (next: string) => void;
  disabled: boolean;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

export const RadioGroup = createBlokComponent(
  {
    name: 'RadioGroup',
    schema: z
      .object({
        bind: bindSchema,
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled selected value.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe(
          'Initially selected value.',
        ),
        children: childListSchema.describe('RadioGroupItem children.'),
        orientation: orientationSchema,
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp('Runs on selection. Arguments may read $event.'),
      })
      .describe('A group of mutually exclusive options.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const children = useValue(blok.children);
    const orientation = useValue(blok.orientation);
    const disabled = useValue(blok.disabled);
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
    const current = controlled.value;
    const context = React.useMemo<RadioGroupContextValue>(
      () => ({
        value: current,
        disabled: disabled === true,
        select: next => {
          // Radix reports a change only; re-pressing the checked radio is a no-op.
          if (next === current) return;
          setValue(next);
          onChange?.(next);
        },
      }),
      [current, disabled, onChange, setValue],
    );

    return (
      <RadioGroupContext.Provider value={context}>
        <View
          role="radiogroup"
          className={cn('gap-3', orientation === 'horizontal' && 'flex-row flex-wrap', className)}
        >
          {renderChildList(children, buildChild)}
        </View>
      </RadioGroupContext.Provider>
    );
  },
);

export const RadioGroupItem = createBlokComponent(
  {
    name: 'RadioGroupItem',
    schema: z
      .object({
        value: z.string().describe('The value this option selects.'),
        label: BlokPropSchemas.DynamicString.optional().describe('Text shown beside the radio.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One option inside a RadioGroup.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const label = useValue(blok.label);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const group = React.useContext(RadioGroupContext);

    const itemValue = value ?? '';
    const checked = group != null && group.value === itemValue;
    const isDisabled = disabled === true || group?.disabled === true || group == null;

    return (
      <Pressable
        role="radio"
        accessibilityState={{checked, disabled: isDisabled}}
        disabled={isDisabled}
        hitSlop={8}
        onPress={() => group?.select(itemValue)}
        className={cn('flex-row items-center gap-2 self-start', isDisabled && 'opacity-50', className)}
      >
        <View className="h-5 w-5 items-center justify-center rounded-full border border-primary">
          {checked ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
        </View>
        {label ? <Text className="text-sm">{label}</Text> : null}
      </Pressable>
    );
  },
);

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

type SelectContextValue = {
  value: string;
  select: (next: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean;
  /** Item labels by value, so the trigger can show the selected one. */
  labels: ReadonlyMap<string, string>;
  registerLabel: (value: string, label: string) => () => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

export const Select = createBlokComponent(
  {
    name: 'Select',
    schema: z
      .object({
        bind: bindSchema,
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled selected value.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe(
          'Initially selected value.',
        ),
        children: childListSchema.describe('SelectTrigger and SelectContent children.'),
        disabled: disabledSchema,
        onChange: actionProp('Runs on selection. Arguments may read $event.'),
      })
      .describe('A dropdown select. Compose SelectTrigger and SelectContent inside it.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const children = useValue(blok.children);
    const disabled = useValue(blok.disabled);
    const onChange = useEventAction(blok.onChange);

    const controlled = useControlledValue<string>({
      bind,
      value,
      defaultValue,
      fallback: '',
      parse: asString,
    });

    const [open, setOpen] = React.useState(false);
    const [labels, setLabels] = React.useState<ReadonlyMap<string, string>>(() => new Map());

    const registerLabel = React.useCallback((itemValue: string, label: string) => {
      setLabels(previous => {
        if (previous.get(itemValue) === label) return previous;
        const next = new Map(previous);
        next.set(itemValue, label);
        return next;
      });
      return () =>
        setLabels(previous => {
          if (previous.get(itemValue) !== label) return previous;
          const next = new Map(previous);
          next.delete(itemValue);
          return next;
        });
    }, []);

    const {setValue} = controlled;
    const current = controlled.value;
    const context = React.useMemo<SelectContextValue>(
      () => ({
        value: current,
        open,
        setOpen,
        disabled: disabled === true,
        labels,
        registerLabel,
        select: next => {
          setOpen(false);
          // Radix reports a change only; picking the selected item just closes.
          if (next === current) return;
          setValue(next);
          onChange?.(next);
        },
      }),
      [current, disabled, labels, onChange, open, registerLabel, setValue],
    );

    return (
      <SelectContext.Provider value={context}>
        {renderChildList(children, buildChild)}
      </SelectContext.Provider>
    );
  },
);

export const SelectTrigger = createBlokComponent(
  {
    name: 'SelectTrigger',
    schema: z
      .object({
        placeholder: BlokPropSchemas.DynamicString.optional().describe(
          'Shown while nothing is selected.',
        ),
        size: z.enum(['default', 'sm']).optional().describe('Trigger size.'),
        className: classNameSchema,
      })
      .describe('The button that opens a Select.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const placeholder = useValue(blok.placeholder);
    const size = useValue(blok.size);
    const className = useValue(blok.className);
    const select = React.useContext(SelectContext);
    const colors = useThemeColors();

    const selected = select && select.value !== '' ? select.value : undefined;
    const shown = selected !== undefined ? (select?.labels.get(selected) ?? selected) : undefined;
    const isDisabled = select == null || select.disabled;

    return (
      <Pressable
        role="combobox"
        accessibilityState={{expanded: select?.open ?? false, disabled: isDisabled}}
        disabled={isDisabled}
        onPress={() => select?.setOpen(true)}
        className={cn(
          'min-w-40 flex-row items-center justify-between gap-2 rounded-md border border-input bg-background px-3 active:bg-accent',
          size === 'sm' ? 'h-9' : 'h-10 native:h-12',
          isDisabled && 'opacity-50',
          className,
        )}
      >
        <Text
          numberOfLines={1}
          className={cn('shrink text-sm', shown === undefined && 'text-muted-foreground')}
        >
          {shown ?? placeholder ?? ''}
        </Text>
        <Lucide.ChevronDown size={16} color={colors.mutedForeground} />
      </Pressable>
    );
  },
);

export const SelectContent = createBlokComponent(
  {
    name: 'SelectContent',
    schema: z
      .object({
        children: childListSchema.describe('SelectItem and SelectGroup children.'),
        className: classNameSchema,
      })
      .describe('The popup list of a Select.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const select = React.useContext(SelectContext);

    const items = renderChildList(children, buildChild);

    // Closed, the items still mount — hidden — so each registers its label and
    // the trigger can name the selection before the sheet was ever opened.
    if (!select?.open) {
      return <View style={{display: 'none'}}>{items}</View>;
    }

    return (
      <Modal
        transparent
        visible
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => select.setOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={() => select.setOpen(false)}
          accessibilityLabel="Close"
        >
          {/* Swallow taps on the sheet itself so they do not reach the backdrop. */}
          <View
            onStartShouldSetResponder={() => true}
            className={cn('max-h-[70%] rounded-t-2xl border-t border-border bg-card pb-8 pt-2', className)}
          >
            <View className="mb-2 h-1 w-10 self-center rounded-full bg-muted" />
            <ScrollView contentContainerClassName="px-2" keyboardShouldPersistTaps="handled">
              {items}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    );
  },
);

export const SelectGroup = createBlokComponent(
  {
    name: 'SelectGroup',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('Groups related SelectItems.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return <View className={cn('py-1', className)}>{renderChildList(children, buildChild)}</View>;
  },
);

export const SelectLabel = createBlokComponent(
  {
    name: 'SelectLabel',
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('Group heading.'),
        className: classNameSchema,
      })
      .describe('A heading inside a SelectGroup.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const className = useValue(blok.className);

    return text ? (
      <Text className={cn('px-3 py-1.5 text-xs text-muted-foreground', className)}>{text}</Text>
    ) : null;
  },
);

export const SelectItem = createBlokComponent(
  {
    name: 'SelectItem',
    schema: z
      .object({
        value: z.string().describe('The value this option selects.'),
        label: BlokPropSchemas.DynamicString.optional().describe(
          'Option text. Defaults to the value.',
        ),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One option inside a SelectContent.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const label = useValue(blok.label);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const select = React.useContext(SelectContext);
    const colors = useThemeColors();

    const itemValue = value ?? '';
    const text = label ?? itemValue;
    const registerLabel = select?.registerLabel;
    React.useEffect(
      () => (registerLabel ? registerLabel(itemValue, text) : undefined),
      [itemValue, registerLabel, text],
    );

    const selected = select != null && select.value === itemValue;
    const isDisabled = disabled === true || select == null;

    return (
      <Pressable
        role="option"
        accessibilityState={{selected, disabled: isDisabled}}
        disabled={isDisabled}
        onPress={() => select?.select(itemValue)}
        className={cn(
          'min-h-11 flex-row items-center justify-between gap-2 rounded-md px-3 py-2 active:bg-accent',
          selected && 'bg-accent',
          isDisabled && 'opacity-50',
          className,
        )}
      >
        <Text className="shrink text-base">{text}</Text>
        {selected ? <Lucide.Check size={16} color={colors.foreground} /> : null}
      </Pressable>
    );
  },
);

// ---------------------------------------------------------------------------
// Toggle and ToggleGroup
// ---------------------------------------------------------------------------

type ToggleVariant = 'default' | 'outline';
type ToggleSize = 'default' | 'sm' | 'lg';

const toggleVariants = cva('flex-row items-center justify-center gap-2 rounded-md active:opacity-80', {
  variants: {
    variant: {
      default: 'bg-transparent',
      outline: 'border border-input bg-transparent',
    },
    size: {
      default: 'h-10 min-w-10 px-3',
      sm: 'h-9 min-w-9 px-2.5',
      lg: 'h-11 min-w-11 px-5',
    },
  },
  defaultVariants: {variant: 'default', size: 'default'},
});

/** The pressable shared by `Toggle` and `ToggleGroupItem`. */
const ToggleButton = (props: {
  pressed: boolean;
  variant: ToggleVariant;
  size: ToggleSize;
  disabled: boolean;
  className?: string;
  icon: unknown;
  label?: string;
  role: 'button' | 'radio' | 'checkbox';
  onPress: () => void;
}) => {
  const colors = useThemeColors();
  const checkedState =
    props.role === 'radio' ? {selected: props.pressed} : {checked: props.pressed};

  return (
    <Pressable
      role={props.role}
      accessibilityState={{...checkedState, disabled: props.disabled}}
      disabled={props.disabled}
      onPress={props.onPress}
      className={cn(
        toggleVariants({variant: props.variant, size: props.size}),
        props.pressed && 'bg-accent',
        props.disabled && 'opacity-50',
        props.className,
      )}
    >
      {renderIcon(props.icon, {
        color: props.pressed ? colors.foreground : colors.mutedForeground,
      })}
      {props.label ? (
        <Text
          className={cn(
            'text-sm font-medium',
            props.pressed ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {props.label}
        </Text>
      ) : null}
    </Pressable>
  );
};

export const Toggle = createBlokComponent(
  {
    name: 'Toggle',
    schema: z
      .object({
        bind: bindSchema,
        pressed: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled pressed state.'),
        defaultPressed: boolSchema.describe('Initial state when uncontrolled.'),
        label: BlokPropSchemas.DynamicString.optional().describe('Button text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        variant: z.enum(['default', 'outline']).optional().describe('Toggle appearance.'),
        size: z.enum(['default', 'sm', 'lg']).optional().describe('Toggle size.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp('Runs on toggle. Arguments may read $event.'),
      })
      .describe('A two-state toggle button.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const pressed = useValue(blok.pressed);
    const defaultPressed = useValue(blok.defaultPressed);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const variant = useValue(blok.variant);
    const size = useValue(blok.size);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const controlled = useControlledValue<boolean>({
      bind,
      value: pressed,
      defaultValue: defaultPressed,
      fallback: false,
      parse: asBoolean,
    });

    return (
      <ToggleButton
        role="button"
        pressed={controlled.value}
        variant={variant ?? 'default'}
        size={size ?? 'default'}
        disabled={disabled === true}
        className={cn('self-start', className)}
        icon={icon}
        label={label}
        onPress={() => {
          const next = !controlled.value;
          controlled.setValue(next);
          onChange?.(next);
        }}
      />
    );
  },
);

type ToggleGroupContextValue = {
  multiple: boolean;
  variant: ToggleVariant;
  size: ToggleSize;
  disabled: boolean;
  className?: string;
  isPressed: (value: string) => boolean;
  toggle: (value: string) => void;
};

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null);

export const ToggleGroup = createBlokComponent(
  {
    name: 'ToggleGroup',
    schema: z
      .object({
        bind: bindSchema,
        multiple: boolSchema.describe('Allow more than one item to be pressed.'),
        children: childListSchema.describe('ToggleGroupItem children.'),
        variant: z.enum(['default', 'outline']).optional().describe('Item appearance.'),
        size: z.enum(['default', 'sm', 'lg']).optional().describe('Item size.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp('Runs on change. Arguments may read $event.'),
      })
      .describe('A set of toggle buttons. Binds to a string, or to a list when multiple.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const multiple = useValue(blok.multiple);
    const children = useValue(blok.children);
    const variant = useValue(blok.variant);
    const size = useValue(blok.size);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const single = useControlledValue<string>({
      bind: multiple ? undefined : bind,
      value: undefined,
      defaultValue: undefined,
      fallback: '',
      parse: asString,
    });
    const many = useControlledValue<string[]>({
      bind: multiple ? bind : undefined,
      value: undefined,
      defaultValue: undefined,
      fallback: [],
      parse: asStringList,
    });

    const singleValue = single.value;
    const setSingle = single.setValue;
    const manyValue = many.value;
    const setMany = many.setValue;

    const context = React.useMemo<ToggleGroupContextValue>(
      () => ({
        multiple: multiple === true,
        variant: variant ?? 'default',
        size: size ?? 'default',
        disabled: disabled === true,
        // On the web the group's className reaches each item too.
        className,
        isPressed: itemValue =>
          multiple ? manyValue.includes(itemValue) : singleValue === itemValue,
        toggle: itemValue => {
          if (multiple) {
            const next = manyValue.includes(itemValue)
              ? manyValue.filter(entry => entry !== itemValue)
              : [...manyValue, itemValue];
            setMany(next);
            onChange?.(next);
            return;
          }
          // Pressing the pressed item of a single group clears it, as in Radix.
          const next = singleValue === itemValue ? '' : itemValue;
          setSingle(next);
          onChange?.(next);
        },
      }),
      [className, disabled, manyValue, multiple, onChange, setMany, setSingle, singleValue, size, variant],
    );

    return (
      <ToggleGroupContext.Provider value={context}>
        <View
          role={multiple ? 'group' : 'radiogroup'}
          className="flex-row flex-wrap items-center gap-1 self-start"
        >
          {renderChildList(children, buildChild)}
        </View>
      </ToggleGroupContext.Provider>
    );
  },
);

export const ToggleGroupItem = createBlokComponent(
  {
    name: 'ToggleGroupItem',
    schema: z
      .object({
        value: z.string().describe('The value this item contributes.'),
        label: BlokPropSchemas.DynamicString.optional().describe('Item text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One item inside a ToggleGroup.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const group = React.useContext(ToggleGroupContext);

    const itemValue = value ?? '';

    return (
      <ToggleButton
        role={group?.multiple ? 'checkbox' : 'radio'}
        pressed={group?.isPressed(itemValue) ?? false}
        variant={group?.variant ?? 'default'}
        size={group?.size ?? 'default'}
        disabled={disabled === true || group == null || group.disabled}
        className={cn(group?.className, className)}
        icon={icon}
        label={label}
        onPress={() => group?.toggle(itemValue)}
      />
    );
  },
);

// ---------------------------------------------------------------------------
// Field and FieldSet
// ---------------------------------------------------------------------------

export const FieldSet = createBlokComponent(
  {
    name: 'FieldSet',
    schema: z
      .object({
        children: childListSchema.describe('Field children.'),
        className: classNameSchema,
      })
      .describe('Groups related fields into one form section.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <View className={cn('flex-col gap-6', className)}>
        <View className="w-full flex-col gap-7">{renderChildList(children, buildChild)}</View>
      </View>
    );
  },
);

export const Field = createBlokComponent(
  {
    name: 'Field',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Field label.'),
        description: BlokPropSchemas.DynamicString.optional().describe('Helper text.'),
        error: BlokPropSchemas.DynamicString.optional().describe(
          'Error message; shown instead of the description when set.',
        ),
        children: childListSchema.describe('The control this field wraps.'),
        orientation: z
          .enum(['vertical', 'horizontal', 'responsive'])
          .optional()
          .describe('Label placement.'),
        className: classNameSchema,
      })
      .describe('A labelled form field with description and error slots.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const description = useValue(blok.description);
    const error = useValue(blok.error);
    const children = useValue(blok.children);
    const orientation = useValue(blok.orientation);
    const className = useValue(blok.className);

    // "responsive" stacks on a phone-width screen, as the web does below `md`.
    const horizontal = orientation === 'horizontal';

    return (
      <View
        className={cn(
          'w-full gap-3',
          horizontal ? 'flex-row flex-wrap items-center' : 'flex-col',
          className,
        )}
      >
        {label ? <Text className="text-sm font-medium">{label}</Text> : null}
        {renderChildList(children, buildChild)}
        {error ? (
          <Text className="text-sm text-destructive">{error}</Text>
        ) : description ? (
          <Text className="text-sm text-muted-foreground">{description}</Text>
        ) : null}
      </View>
    );
  },
);

export const formBlokComponents = [
  Button,
  ButtonGroup,
  Input,
  Textarea,
  Label,
  Checkbox,
  Switch,
  Slider,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  FieldSet,
  Field,
];
