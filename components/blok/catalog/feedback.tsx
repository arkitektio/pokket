import * as React from 'react';
import {ActivityIndicator, Animated, View} from 'react-native';
import * as z from 'zod';
import {BlokPropSchemas, createBlokComponent, useBlok, useValue} from '@/lib/ports/blok/runtime';
import {Text, TextClassContext} from '@/components/ui/text';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import {cn} from '@/lib/utils';
import {iconNameSchema, renderIcon} from './icons';
import {
  badgeVariantSchema,
  childListSchema,
  classNameSchema,
  contentSchema,
  cssLength,
  numberSchema,
  renderChildList,
  renderContent,
  sizeSchema,
} from './shared';

/**
 * Status, progress and empty-state bloks, after orkestrator's
 * `bloks/feedback.tsx`: the same names and schemas, drawn with React Native.
 */

/** A determinate bar, shared with the raw `progress` element in `html.tsx`. */
export const ProgressTrack = ({percent, className}: {percent: number; className?: string}) => {
  const clamped = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{min: 0, max: 100, now: Math.round(clamped)}}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-primary/20', className)}
    >
      <View className="h-full rounded-full bg-primary" style={{width: `${clamped}%`}} />
    </View>
  );
};

export const Alert = createBlokComponent(
  {
    name: 'Alert',
    schema: z
      .object({
        title: BlokPropSchemas.DynamicString.optional().describe('Alert heading.'),
        description: BlokPropSchemas.DynamicString.optional().describe('Supporting text.'),
        icon: iconNameSchema.describe('Icon shown beside the heading.'),
        children: childListSchema.describe('Extra content below the description.'),
        variant: z
          .enum(['default', 'destructive'])
          .optional()
          .describe('Alert appearance.'),
        className: classNameSchema,
      })
      .describe('A callout that draws attention to a message.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const title = useValue(blok.title);
    const description = useValue(blok.description);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const variant = useValue(blok.variant);
    const className = useValue(blok.className);
    const colors = useThemeColors();

    const destructive = variant === 'destructive';

    return (
      <View
        accessibilityRole="alert"
        className={cn(
          'w-full flex-row gap-3 rounded-lg border bg-card px-4 py-3',
          destructive ? 'border-destructive/50' : 'border-border',
          className,
        )}
      >
        {icon ? (
          <View className="pt-0.5">
            {renderIcon(icon, {color: destructive ? colors.destructive : colors.foreground})}
          </View>
        ) : null}
        <View className="min-w-0 flex-1 gap-1">
          {title ? (
            <Text
              className={cn(
                'text-sm font-medium tracking-tight',
                destructive && 'text-destructive',
              )}
            >
              {title}
            </Text>
          ) : null}
          {description ? (
            <Text
              className={cn(
                'text-sm leading-relaxed',
                destructive ? 'text-destructive/90' : 'text-muted-foreground',
              )}
            >
              {description}
            </Text>
          ) : null}
          {renderChildList(children, buildChild)}
        </View>
      </View>
    );
  },
);

type BadgeVariant = NonNullable<z.infer<typeof badgeVariantSchema>>;

const BADGE_BOX: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary',
  secondary: 'border-transparent bg-secondary',
  destructive: 'border-transparent bg-destructive',
  outline: 'border-border',
  ghost: 'border-transparent',
  link: 'border-transparent',
};

const BADGE_TEXT: Record<BadgeVariant, string> = {
  default: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  destructive: 'text-destructive-foreground',
  outline: 'text-foreground',
  ghost: 'text-foreground',
  link: 'text-primary underline',
};

export const Badge = createBlokComponent(
  {
    name: 'Badge',
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('Badge text.'),
        icon: iconNameSchema.describe('Icon rendered before the text.'),
        children: contentSchema,
        className: classNameSchema,
        variant: badgeVariantSchema,
      })
      .describe('A small status or count label.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const variant = (useValue(blok.variant) ?? 'default') as BadgeVariant;
    const colors = useThemeColors();

    const iconColor =
      variant === 'default'
        ? colors.primaryForeground
        : variant === 'destructive'
          ? colors.destructiveForeground
          : variant === 'link'
            ? colors.primary
            : colors.foreground;
    const textClassName = cn('text-xs font-medium', BADGE_TEXT[variant]);

    return (
      <TextClassContext.Provider value={textClassName}>
        <View
          className={cn(
            'shrink-0 flex-row items-center gap-1 self-start overflow-hidden rounded-md border px-2 py-0.5',
            BADGE_BOX[variant],
            className,
          )}
        >
          {renderIcon(icon, {size: 12, color: iconColor})}
          {renderContent(children ?? text, buildChild, textClassName)}
        </View>
      </TextClassContext.Provider>
    );
  },
);

export const Progress = createBlokComponent(
  {
    name: 'Progress',
    schema: z
      .object({
        value: numberSchema.describe('Completion between 0 and max.'),
        max: numberSchema.describe('Maximum value. Defaults to 100.'),
        className: classNameSchema,
      })
      .describe('A determinate progress bar.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const max = useValue(blok.max);
    const className = useValue(blok.className);

    const resolvedMax = max ?? 100;
    const percent = resolvedMax > 0 ? ((value ?? 0) / resolvedMax) * 100 : 0;

    return <ProgressTrack percent={percent} className={className} />;
  },
);

/** A muted block that pulses, like the web skeleton's `animate-pulse`. */
const PulsingBlock = ({className, width, height}: {
  className?: string;
  width?: string;
  height?: string;
}) => {
  const [opacity] = React.useState(() => new Animated.Value(1));

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {toValue: 0.5, duration: 1000, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 1, duration: 1000, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('rounded-md bg-muted', className)}
      style={{
        opacity,
        width: cssLength(width),
        // A skeleton with no height is invisible; give it a text line's.
        height: cssLength(height) ?? (className && /(?:^|\s)(?:h|size)-/.test(className) ? undefined : 16),
      }}
    />
  );
};

export const Skeleton = createBlokComponent(
  {
    name: 'Skeleton',
    schema: z
      .object({
        width: sizeSchema,
        height: sizeSchema,
        className: classNameSchema,
      })
      .describe('A placeholder block shown while content loads.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const width = useValue(blok.width);
    const height = useValue(blok.height);
    const className = useValue(blok.className);

    return <PulsingBlock className={className} width={width} height={height} />;
  },
);

export const Spinner = createBlokComponent(
  {
    name: 'Spinner',
    schema: z
      .object({
        className: classNameSchema,
      })
      .describe('An indeterminate loading indicator.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);
    const colors = useThemeColors();

    return (
      <View className={cn('self-start', className)}>
        <ActivityIndicator size="small" color={colors.mutedForeground} />
      </View>
    );
  },
);

export const Empty = createBlokComponent(
  {
    name: 'Empty',
    schema: z
      .object({
        title: BlokPropSchemas.DynamicString.optional().describe('Empty-state heading.'),
        description: BlokPropSchemas.DynamicString.optional().describe('Supporting text.'),
        icon: iconNameSchema.describe('Icon shown above the heading.'),
        children: childListSchema.describe('Actions offered in the empty state.'),
        className: classNameSchema,
      })
      .describe('The placeholder shown when there is nothing to list.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const title = useValue(blok.title);
    const description = useValue(blok.description);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <View
        className={cn(
          'min-w-0 items-center justify-center gap-6 rounded-lg border border-dashed border-border p-6',
          className,
        )}
      >
        <View className="max-w-sm items-center gap-2">
          {icon ? (
            <View className="mb-2 h-10 w-10 items-center justify-center rounded-lg bg-muted">
              {renderIcon(icon, {size: 24})}
            </View>
          ) : null}
          {title ? (
            <Text className="text-center text-lg font-medium tracking-tight">{title}</Text>
          ) : null}
          {description ? (
            <Text className="text-center text-sm leading-relaxed text-muted-foreground">
              {description}
            </Text>
          ) : null}
        </View>
        {children ? (
          <View className="w-full max-w-sm items-center gap-4">
            {renderChildList(children, buildChild)}
          </View>
        ) : null}
      </View>
    );
  },
);

export const feedbackBlokComponents = [Alert, Badge, Progress, Skeleton, Spinner, Empty];
