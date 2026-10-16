import * as React from 'react';
import {AccessibilityInfo} from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Polyline,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgTextElement,
} from 'react-native-svg';
import * as z from 'zod';
import {
  BlokNodeErrorSurface,
  createBlokComponent,
  useAction,
  useBlok,
  useValue,
  type Blok,
  type BlokComponentPlacement,
  type BlokObjectSchema,
  type BlokRenderArgs,
} from '@/lib/ports/blok/runtime';
import {useBrand} from '@/lib/theme/BrandProvider';
import {buildLogoPalette, type LogoPalette} from '@/lib/theme/brandTokens';
import {actionProp, describedString} from './shared';

/**
 * SVG drawing, after orkestrator's `bloks/logo/index.tsx`: an `SVG` root and
 * the classic SVG elements as components, drawn with react-native-svg.
 *
 * The same names and prop schemas, so a payload validates on both. What the
 * phone cannot do is still accepted and dropped: an SVG `<title>` (the root's
 * becomes its accessibility label), and the hover that plays animations.
 *
 * `ActionLogo` is the root of an action's logo (blok context ACTION_LOGO):
 * the same shapes, painted with the palette only. A paint is a palette token
 * (`ink`, `brand`, ...) resolved from the brand in JS (`buildLogoPalette`),
 * since react-native-svg cannot read orkestrator's `var(--logo-*)`. Under an
 * `SVG` any colour works beside them, under an `ActionLogo` anything else is
 * drawn in `ink`.
 *
 * A shape may `animate`. Orkestrator plays it on hover and while an action
 * logo's task runs; there is no hover here, so it plays while its host says
 * it is active (`LogoActiveContext`), and never with reduced motion on.
 */

/** Which drawing a node is in: the prefix that makes its ids unique on the page. */
const SvgDrawingContext = React.createContext<string | null>(null);

const safeId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '_');

/** The element id of node `id` inside the drawing. */
const useElementId = (id: string) => {
  const prefix = React.useContext(SvgDrawingContext);
  return `${prefix ?? 'svg'}-${safeId(id)}`;
};

const URL_REFERENCE = /^url\(\s*#([^)\s]+)\s*\)$/;

/** `url(#name)` pointed at the element `name` became in this drawing; anything else as it was. */
const useReference = (value: string | undefined) => {
  const prefix = React.useContext(SvgDrawingContext);
  if (value === undefined) return undefined;
  const match = URL_REFERENCE.exec(value.trim());
  return match ? `url(#${prefix ?? 'svg'}-${safeId(match[1])})` : value;
};

/** The palette tokens a shape may name. `none` paints nothing. */
export const LOGO_PAINT_TOKENS = ['ink', 'muted', 'brand', 'brand-strong', 'brand-soft', 'surface', 'none'] as const;

/** What a shape may play. */
export const LOGO_ANIMATIONS = ['spin', 'pulse', 'float', 'draw', 'march', 'blink'] as const;
type LogoAnimation = (typeof LOGO_ANIMATIONS)[number];

/** `free` under an `SVG`, `palette` under an `ActionLogo`. */
type PaintMode = 'free' | 'palette';
const PaintModeContext = React.createContext<PaintMode>('free');

const isPaletteToken = (value: string): value is keyof LogoPalette =>
  value !== 'none' && (LOGO_PAINT_TOKENS as readonly string[]).includes(value);

/** The brand's palette, built once per brand. */
const useLogoPalette = (): LogoPalette => {
  const {hue, chroma} = useBrand();
  return React.useMemo(() => buildLogoPalette(hue, chroma), [hue, chroma]);
};

/** A paint as drawn: a token from the palette, a reference into the drawing, or (under an `SVG` only) a colour. */
const usePaint = (value: string | undefined) => {
  const mode = React.useContext(PaintModeContext);
  const palette = useLogoPalette();
  const reference = useReference(value);
  if (value === undefined || value === null) return undefined;
  const paint = String(value).trim();
  if (paint === 'none') return 'none';
  if (isPaletteToken(paint)) return palette[paint];
  if (URL_REFERENCE.test(paint)) return reference;
  return mode === 'palette' ? palette.ink : value;
};

const length = (description: string) =>
  z.union([z.number(), z.string()]).optional().describe(description);

const IN_SVG: BlokComponentPlacement = {context: 'logo', downstreamOf: ['SVG', 'ActionLogo']};

/* -------------------------------------------------------------------------- */
/* Motion                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Whether the logo's animations play: orkestrator's `[data-logo-active]`. Set
 * by whoever hosts the drawing (an action logo, while its task runs).
 */
export const LogoActiveContext = React.createContext(false);

/** Seconds since the drawing's animations started; null while they are still. */
const LogoClockContext = React.createContext<number | null>(null);

/** Whether the system asks for reduced motion; only asked while `asking`, so a list of still logos never does. */
const useReducedMotion = (asking: boolean): boolean => {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (!asking) return;
    let current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => current && setReduced(value));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      current = false;
      subscription.remove();
    };
  }, [asking]);
  return reduced;
};

/**
 * One clock per drawing, ticking only while it plays, so a list of still logos
 * costs nothing. Its own component, so a tick re-renders the shapes that read
 * it and not the drawing around them.
 */
const LogoClock = ({children}: {children: React.ReactNode}) => (
  <LogoClockContext.Provider value={useLogoClock()}>{children}</LogoClockContext.Provider>
);

const useLogoClock = (): number | null => {
  const active = React.useContext(LogoActiveContext);
  const reducedMotion = useReducedMotion(active);
  const playing = active && !reducedMotion;
  const [time, setTime] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!playing) {
      setTime(null);
      return;
    }
    const start = Date.now();
    let frame = requestAnimationFrame(function tick() {
      setTime((Date.now() - start) / 1000);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return playing ? time : null;
};

/** Eases 0 → 1 → 0 over one period: `ease-in-out` to the 50% keyframe and back. */
const swell = (phase: number) => (1 - Math.cos(2 * Math.PI * phase)) / 2;

/** Eases 0 → 1 over one period. */
const easeInOut = (phase: number) => (1 - Math.cos(Math.PI * phase)) / 2;

type Box = {x: number; y: number; width: number; height: number};

/** What a shape answers when asked about its geometry: react-native-svg's `Shape`. */
type Measurable = {getBBox?: () => Box | undefined; getTotalLength?: () => number | undefined};

/** The frame of an animation: what wraps the shape (`group`) and what it sets on it (`shape`). */
type Frame = {
  group?: {transform?: string; opacity?: number};
  shape?: {strokeDasharray?: string; strokeDashoffset?: number};
};

/**
 * orkestrator's keyframes (`index.css`, "Logo animations") at `t` seconds.
 * `box` is the shape's own bounds (`transform-box: fill-box`), `length` its
 * stroke's (0 when unknown), both measured once the animation starts.
 */
export const frameAt = (animation: LogoAnimation, t: number, box: Box, length: number): Frame => {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  switch (animation) {
    case 'spin':
      return {group: {transform: `rotate(${((t % 1.4) / 1.4) * 360} ${cx} ${cy})`}};
    case 'pulse': {
      const k = swell((t % 1.2) / 1.2);
      const scale = 1 + 0.2 * k;
      return {
        group: {
          transform: `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`,
          opacity: 1 - 0.3 * k,
        },
      };
    }
    case 'float':
      return {group: {transform: `translate(0 ${-0.12 * box.height * swell((t % 1.6) / 1.6)})`}};
    case 'draw': {
      // A stroke whose length is not known is left drawn.
      if (length <= 0) return {};
      // `alternate`: traces the stroke, then takes it back.
      const phase = (t % 2.4) / 1.2;
      const drawn = easeInOut(phase < 1 ? phase : 2 - phase);
      return {shape: {strokeDasharray: `${length} ${length}`, strokeDashoffset: length * (1 - drawn)}};
    }
    case 'march':
      return {shape: {strokeDashoffset: -24 * ((t % 1.6) / 1.6)}};
    case 'blink': {
      // `steps(2, jump-none)` between 1 → 0.15 → 1.
      const phase = t % 1;
      return {group: {opacity: phase < 0.25 || phase >= 0.75 ? 1 : 0.15}};
    }
  }
};

/** Where a drawing's shapes turn when they cannot be measured: the middle of its viewBox. */
const ViewBoxContext = React.createContext<Box>({x: 0, y: 0, width: 24, height: 24});

/** A react-native-svg element as the shapes use it: any props, and a ref that measures. */
type SvgElement = React.ComponentType<Record<string, unknown> & {ref?: React.Ref<Measurable>}>;

/**
 * `Element` playing `animation`: reads the clock, measures the shape when it
 * starts, and draws each frame. Still while the clock is.
 */
const LogoMotion = ({
  Element,
  animation,
  delay,
  props,
  children,
}: {
  Element: SvgElement;
  animation: LogoAnimation;
  delay: number;
  props: Record<string, unknown>;
  children?: React.ReactNode;
}) => {
  const time = React.useContext(LogoClockContext);
  const fallback = React.useContext(ViewBoxContext);
  const ref = React.useRef<Measurable>(null);
  const [measured, setMeasured] = React.useState<{box: Box; length: number} | null>(null);
  const playing = time !== null;

  React.useEffect(() => {
    if (!playing) return;
    const shape = ref.current;
    // Native calls: a shape not drawn yet (or no native side, in tests) has no answer.
    const ask = <T,>(question: (() => T) | undefined): T | undefined => {
      try {
        return question?.call(shape);
      } catch {
        return undefined;
      }
    };
    const box = ask(shape?.getBBox);
    const length = ask(shape?.getTotalLength);
    setMeasured({
      box: box && box.width + box.height > 0 ? box : fallback,
      length: typeof length === 'number' && length > 0 ? length : 0,
    });
  }, [playing, fallback]);

  const local = time === null ? null : time - delay;
  const frame =
    local !== null && local >= 0 && measured ? frameAt(animation, local, measured.box, measured.length) : undefined;
  const shape = (
    <Element {...props} {...frame?.shape} ref={ref}>
      {children}
    </Element>
  );
  return frame?.group ? <G {...frame.group}>{shape}</G> : shape;
};

/* -------------------------------------------------------------------------- */
/* Presentation: what every shape and group may set                           */
/* -------------------------------------------------------------------------- */

const PAINT_HELP = `${LOGO_PAINT_TOKENS.join(', ')} (the viewer's palette), url(#gradient), or under an SVG any colour`;

const presentationFields = {
  fill: describedString(`Fill paint: ${PAINT_HELP}.`),
  fillOpacity: length('Fill opacity, 0 to 1.'),
  fillRule: z.enum(['nonzero', 'evenodd']).optional().describe('Which parts of a self-intersecting shape are inside.'),
  stroke: describedString(`Stroke paint: ${PAINT_HELP}.`),
  strokeWidth: length('Stroke width, in user units.'),
  strokeOpacity: length('Stroke opacity, 0 to 1.'),
  strokeLinecap: z.enum(['butt', 'round', 'square']).optional().describe('How open line ends are drawn.'),
  strokeLinejoin: z.enum(['miter', 'round', 'bevel']).optional().describe('How corners are drawn.'),
  strokeDasharray: describedString('Dash pattern, e.g. "4 2".'),
  opacity: length('Opacity of the whole element, 0 to 1.'),
  transform: describedString('SVG transform, e.g. "rotate(45 12 12)".'),
  clipPath: describedString('url(#clip) of a ClipPath to clip by.'),
  title: describedString('Tooltip text (an SVG <title>).'),
  onClick: actionProp('Runs when the element is clicked.'),
  animate: z
    .enum(LOGO_ANIMATIONS)
    .optional()
    .describe(
      'Plays while the logo is hovered, and while an action logo\'s task runs: spin, pulse, float, draw (traces the stroke), march (moves a dashed stroke) or blink.',
    ),
  animateDelay: length('Seconds before the animation starts, to stagger shapes.'),
};

type PresentationBlok = Blok<z.ZodObject<typeof presentationFields>>;

/** react-native-svg drops an `undefined` prop, but not a `null` one. */
const defined = <T extends Record<string, unknown>>(props: T): Partial<T> =>
  Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined && value !== null)) as Partial<T>;

const usePresentation = (blok: PresentationBlok) => {
  const fill = usePaint(useValue(blok.fill));
  const stroke = usePaint(useValue(blok.stroke));
  const clipPath = useReference(useValue(blok.clipPath));
  const onPress = useAction(blok.onClick);
  const requested = useValue(blok.animate);
  // A bound or computed value may name anything: only a known animation plays.
  const animate = (LOGO_ANIMATIONS as readonly string[]).includes(requested as string)
    ? (requested as LogoAnimation)
    : undefined;
  const delay = Number(useValue(blok.animateDelay) ?? 0);
  // Read so a bound title resolves like it does on the desktop; there is no tooltip to show it in.
  useValue(blok.title);
  return {
    animate,
    delay: Number.isFinite(delay) ? delay : 0,
    props: defined({
      fill,
      fillOpacity: useValue(blok.fillOpacity),
      fillRule: useValue(blok.fillRule),
      stroke,
      strokeWidth: useValue(blok.strokeWidth),
      strokeOpacity: useValue(blok.strokeOpacity),
      strokeLinecap: useValue(blok.strokeLinecap),
      strokeLinejoin: useValue(blok.strokeLinejoin),
      strokeDasharray: useValue(blok.strokeDasharray),
      opacity: useValue(blok.opacity),
      transform: useValue(blok.transform),
      clipPath,
      onPress,
    }),
  };
};

const childrenOf = ({component, buildChild}: BlokRenderArgs) =>
  (component.children ?? []).map(child => (
    <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
  ));

/** Draws `Element` with `props`, playing `animate` when it is set. */
const Animated = ({
  Element,
  animate,
  delay,
  props,
  children,
}: {
  Element: SvgElement;
  animate: LogoAnimation | undefined;
  delay: number;
  props: Record<string, unknown>;
  children?: React.ReactNode;
}) =>
  animate ? (
    <LogoMotion Element={Element} animation={animate} delay={delay} props={props}>
      {children}
    </LogoMotion>
  ) : (
    <Element {...props}>{children}</Element>
  );

/**
 * A shape: one SVG element, its geometry props passed through as they are,
 * plus the shared presentation.
 */
const createShape = (
  name: string,
  Element: unknown,
  description: string,
  geometry: Record<string, z.ZodTypeAny>,
) => {
  const schema: BlokObjectSchema = z.object({...geometry, ...presentationFields}).describe(description);
  const keys = Object.keys(geometry);
  return createBlokComponent({name, placement: IN_SVG, schema}, ({component, schema}) => {
    const blok = useBlok(component, schema);
    const {props, animate, delay} = usePresentation(blok as unknown as PresentationBlok);
    // The geometry keys are fixed per component, so the hooks run in the same order every render.
    const values = defined(Object.fromEntries(keys.map(key => [key, useValue(blok[key])] as const)));
    return <Animated Element={Element as SvgElement} animate={animate} delay={delay} props={{...props, ...values}} />;
  });
};

/* -------------------------------------------------------------------------- */
/* The root                                                                   */
/* -------------------------------------------------------------------------- */

/** Inside an `Svg` nothing can render a `View`: a node that fails is drawn as nothing. */
const SvgNodeError = () => <G />;

const ROOTS = ['SVG', 'ActionLogo'];

const rootSchema = (description: string) =>
  z
    .object({
      viewBox: describedString('The user coordinate system, "minX minY width height", e.g. "0 0 24 24".'),
      width: length('Width; fills its box when left out.'),
      height: length('Height; fills its box when left out.'),
      preserveAspectRatio: describedString('How the viewBox fits the box, e.g. "xMidYMid meet".'),
      title: describedString('What the drawing shows, for screen readers and as a tooltip.'),
    })
    .describe(description);

/** "minX minY width height", or null when it is not four numbers with a size. */
export const parseViewBox = (viewBox: string | undefined): Box | null => {
  const numbers = (viewBox ?? '').trim().split(/[\s,]+/).map(Number);
  if (numbers.length !== 4 || numbers.some(n => !Number.isFinite(n))) return null;
  const [x, y, width, height] = numbers;
  return width > 0 && height > 0 ? {x, y, width, height} : null;
};

/** A drawing's root: an `Svg` whose shapes paint in `mode`. */
const createSvgRoot = (name: string, mode: PaintMode, description: string) =>
  createBlokComponent(
    {
      name,
      acceptsChildren: true,
      placement: {childrenContext: 'logo', notDownstreamOf: ROOTS},
      schema: rootSchema(description),
    },
    args => {
      const blok = useBlok(args.component, args.schema);
      const viewBox = useValue(blok.viewBox);
      const width = useValue(blok.width);
      const height = useValue(blok.height);
      const preserveAspectRatio = useValue(blok.preserveAspectRatio);
      const title = useValue(blok.title);
      const prefix = `svg${React.useId().replace(/[^A-Za-z0-9]/g, '')}`;
      const box = React.useMemo(() => parseViewBox(viewBox) ?? {x: 0, y: 0, width: 24, height: 24}, [viewBox]);

      // A browser's `<svg>` fills its box; a native one with no size has none. Left
      // unsized, it takes the width it is given and the viewBox's proportions.
      const size =
        width === undefined && height === undefined
          ? {style: {width: '100%' as const, aspectRatio: box.width / box.height}}
          : defined({width, height});

      return (
        <Svg
          viewBox={viewBox}
          {...size}
          {...defined({preserveAspectRatio})}
          accessible={Boolean(title)}
          accessibilityRole={title ? 'image' : undefined}
          accessibilityLabel={title}
        >
          <SvgDrawingContext.Provider value={prefix}>
            <PaintModeContext.Provider value={mode}>
              <ViewBoxContext.Provider value={box}>
                <LogoClock>
                  <BlokNodeErrorSurface.Provider value={SvgNodeError}>{childrenOf(args)}</BlokNodeErrorSurface.Provider>
                </LogoClock>
              </ViewBoxContext.Provider>
            </PaintModeContext.Provider>
          </SvgDrawingContext.Provider>
        </Svg>
      );
    },
  );

export const SvgBlok = createSvgRoot(
  'SVG',
  'free',
  'An SVG drawing. Its children are SVG shapes; the root of a logo blok.',
);

export const ActionLogoBlok = createSvgRoot(
  'ActionLogo',
  'palette',
  "An action's logo: an SVG drawing whose shapes paint with the viewer's palette only. The root of an action logo blok, which reads @task: the viewer's last task of the action, null until they run it.",
);

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

export const PathBlok = createShape('Path', Path, 'An SVG path.', {
  d: describedString('Path data, e.g. "M2 12h20".'),
});

export const CircleBlok = createShape('Circle', Circle, 'An SVG circle.', {
  cx: length('Centre x.'),
  cy: length('Centre y.'),
  r: length('Radius.'),
});

export const EllipseBlok = createShape('Ellipse', Ellipse, 'An SVG ellipse.', {
  cx: length('Centre x.'),
  cy: length('Centre y.'),
  rx: length('Horizontal radius.'),
  ry: length('Vertical radius.'),
});

export const RectBlok = createShape('Rect', Rect, 'An SVG rectangle.', {
  x: length('Left edge.'),
  y: length('Top edge.'),
  width: length('Width.'),
  height: length('Height.'),
  rx: length('Corner radius, horizontal.'),
  ry: length('Corner radius, vertical.'),
});

export const LineBlok = createShape('Line', Line, 'An SVG line.', {
  x1: length('Start x.'),
  y1: length('Start y.'),
  x2: length('End x.'),
  y2: length('End y.'),
});

export const PolylineBlok = createShape('Polyline', Polyline, 'An open SVG polyline.', {
  points: describedString('Points, e.g. "0,0 10,5 20,0".'),
});

export const PolygonBlok = createShape('Polygon', Polygon, 'A closed SVG polygon.', {
  points: describedString('Points, e.g. "0,0 10,5 20,0".'),
});

/** SVG's `dominant-baseline`, as react-native-svg spells it (`alignmentBaseline`). */
const BASELINES = {
  auto: 'baseline',
  middle: 'middle',
  central: 'central',
  hanging: 'hanging',
  alphabetic: 'alphabetic',
} as const;

export const SvgTextBlok = createBlokComponent(
  {
    name: 'SvgText',
    placement: IN_SVG,
    schema: z
      .object({
        text: describedString('The text to draw.'),
        x: length('Anchor x.'),
        y: length('Baseline y.'),
        fontSize: length('Font size, in user units.'),
        fontFamily: describedString('Font family.'),
        fontWeight: describedString('Font weight, e.g. "bold" or "600".'),
        textAnchor: z.enum(['start', 'middle', 'end']).optional().describe('Where x is on the text.'),
        dominantBaseline: z
          .enum(['auto', 'middle', 'central', 'hanging', 'alphabetic'])
          .optional()
          .describe('Where y is on the text.'),
        ...presentationFields,
      })
      .describe('Text in an SVG drawing (the SVG <text> element).'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const {props, animate, delay} = usePresentation(blok as unknown as PresentationBlok);
    const baseline = useValue(blok.dominantBaseline);
    const text = useValue(blok.text);
    const textProps = defined({
      x: useValue(blok.x),
      y: useValue(blok.y),
      fontSize: useValue(blok.fontSize),
      fontFamily: useValue(blok.fontFamily),
      fontWeight: useValue(blok.fontWeight),
      textAnchor: useValue(blok.textAnchor),
      alignmentBaseline: baseline ? BASELINES[baseline] : undefined,
    });
    return (
      <Animated Element={SvgTextElement as unknown as SvgElement} animate={animate} delay={delay} props={{...props, ...textProps}}>
        {text ?? ''}
      </Animated>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Structure: groups, definitions, gradients, clip paths                      */
/* -------------------------------------------------------------------------- */

export const GroupBlok = createBlokComponent(
  {
    name: 'G',
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z.object(presentationFields).describe('A group of SVG elements, which share its presentation and transform.'),
  },
  args => {
    const blok = useBlok(args.component, args.schema);
    const {props, animate, delay} = usePresentation(blok);
    return (
      <Animated Element={G as unknown as SvgElement} animate={animate} delay={delay} props={props}>
        {childrenOf(args)}
      </Animated>
    );
  },
);

export const DefsBlok = createBlokComponent(
  {
    name: 'Defs',
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z.object({}).describe('Definitions (gradients, clip paths) that are referenced, not drawn.'),
  },
  args => <Defs>{childrenOf(args)}</Defs>,
);

const gradientUnits = z
  .enum(['objectBoundingBox', 'userSpaceOnUse'])
  .optional()
  .describe('Whether the coordinates are fractions of the shape (the default) or user units.');

export const LinearGradientBlok = createBlokComponent(
  {
    name: 'LinearGradient',
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z
      .object({
        x1: length('Start x.'),
        y1: length('Start y.'),
        x2: length('End x.'),
        y2: length('End y.'),
        gradientUnits,
        gradientTransform: describedString('Transform of the gradient.'),
      })
      .describe('A linear gradient, filled by its Stop children. Referenced as url(#id) by its BSX id.'),
  },
  args => {
    const blok = useBlok(args.component, args.schema);
    return (
      <LinearGradient
        id={useElementId(args.component.id)}
        {...defined({
          x1: useValue(blok.x1),
          y1: useValue(blok.y1),
          x2: useValue(blok.x2),
          y2: useValue(blok.y2),
          gradientUnits: useValue(blok.gradientUnits),
          gradientTransform: useValue(blok.gradientTransform),
        })}
      >
        {childrenOf(args)}
      </LinearGradient>
    );
  },
);

export const RadialGradientBlok = createBlokComponent(
  {
    name: 'RadialGradient',
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z
      .object({
        cx: length('Centre x.'),
        cy: length('Centre y.'),
        r: length('Radius.'),
        fx: length('Focal point x.'),
        fy: length('Focal point y.'),
        gradientUnits,
        gradientTransform: describedString('Transform of the gradient.'),
      })
      .describe('A radial gradient, filled by its Stop children. Referenced as url(#id) by its BSX id.'),
  },
  args => {
    const blok = useBlok(args.component, args.schema);
    return (
      <RadialGradient
        id={useElementId(args.component.id)}
        {...defined({
          cx: useValue(blok.cx),
          cy: useValue(blok.cy),
          r: useValue(blok.r),
          fx: useValue(blok.fx),
          fy: useValue(blok.fy),
          gradientUnits: useValue(blok.gradientUnits),
          gradientTransform: useValue(blok.gradientTransform),
        })}
      >
        {childrenOf(args)}
      </RadialGradient>
    );
  },
);

export const StopBlok = createBlokComponent(
  {
    name: 'Stop',
    placement: {context: 'logo', downstreamOf: ['LinearGradient', 'RadialGradient']},
    schema: z
      .object({
        offset: length('Where along the gradient, 0 to 1 or a percentage.'),
        stopColor: describedString(`The colour at this stop: ${PAINT_HELP}.`),
        stopOpacity: length('The opacity at this stop, 0 to 1.'),
      })
      .describe('One colour stop of a gradient.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const stopColor = usePaint(useValue(blok.stopColor));
    return (
      <Stop {...defined({offset: useValue(blok.offset), stopColor, stopOpacity: useValue(blok.stopOpacity)})} />
    );
  },
);

export const ClipPathBlok = createBlokComponent(
  {
    name: 'ClipPath',
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z
      .object({
        clipPathUnits: z
          .enum(['userSpaceOnUse', 'objectBoundingBox'])
          .optional()
          .describe('Whether its shapes are in user units (the default) or fractions of the clipped shape.'),
      })
      .describe('A clip path made of its shape children. Referenced as url(#id) by its BSX id.'),
  },
  args => {
    const blok = useBlok(args.component, args.schema);
    // react-native-svg clips in user units only; `clipPathUnits` is accepted and ignored.
    useValue(blok.clipPathUnits);
    return <ClipPath id={useElementId(args.component.id)}>{childrenOf(args)}</ClipPath>;
  },
);

/** The SVG vocabulary: the two roots, seven shapes, text, and what shapes reference. */
export const logoBlokComponents = [
  SvgBlok,
  ActionLogoBlok,
  PathBlok,
  CircleBlok,
  EllipseBlok,
  RectBlok,
  LineBlok,
  PolylineBlok,
  PolygonBlok,
  SvgTextBlok,
  GroupBlok,
  DefsBlok,
  LinearGradientBlok,
  RadialGradientBlok,
  StopBlok,
  ClipPathBlok,
];
