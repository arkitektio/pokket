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
import {
  BlokNodeErrorSurface,
  useBlok,
  usePendingAction,
  useValue,
  type Blok,
  type BlokObjectSchema,
  type BlokRenderArgs,
  type BlokRender,
} from '@arkitektio/bsx/runtime';
import {loadVocabulary} from '@arkitektio/bsx/spec/vocabulary';
import {useBrand} from '@/lib/theme/BrandProvider';
import {buildLogoPalette, type LogoPalette} from '@/lib/theme/brandTokens';

import type {logoCatalog} from '@arkitektio/bsx/catalogs';

type Logo = typeof logoCatalog.components;

/**
 * The `logo@1` catalog, after orkestrator's `bloks/logo/index.tsx`: the
 * `AgentLogo` and `ActionLogo` roots and the classic SVG elements as
 * components, drawn with react-native-svg.
 *
 * The same names and prop schemas, so a payload validates on both. What the
 * phone cannot do is still accepted and dropped: an SVG `<title>` (the root's
 * becomes its accessibility label), and the hover that plays animations.
 *
 * The root names the blok's context: an `AgentLogo` root is an agent's logo,
 * an `ActionLogo` root an action's (it reads `task`, the viewer's last task of
 * the action). A logo paints with the viewer's pens only (vocabulary
 * `theme.logo_pens`: `ink`, `brand`, ..., the status and spectral roles),
 * resolved from the brand in JS (`buildLogoPalette`), since react-native-svg
 * cannot read orkestrator's `var(--logo-*)`; or with `url(#id)` into the
 * drawing. Anything else is drawn in `ink`.
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

/** The pens a shape may name (vocabulary `theme.logo_pens`). `none` paints nothing. */
export const LOGO_PAINT_TOKENS: readonly string[] = loadVocabulary().theme.logoPens;

/** What a shape may play. */
export const LOGO_ANIMATIONS = ['spin', 'pulse', 'float', 'draw', 'march', 'blink'] as const;
type LogoAnimation = (typeof LOGO_ANIMATIONS)[number];

const isPaletteToken = (value: string) => value !== 'none' && LOGO_PAINT_TOKENS.includes(value);

/** A pen as the brand draws it; a pen the palette does not hold yet is drawn in `ink`. */
const penColor = (palette: LogoPalette, pen: string): string =>
  Object.prototype.hasOwnProperty.call(palette, pen) ? palette[pen as keyof LogoPalette] : palette.ink;

/** The brand's palette, built once per brand. */
const useLogoPalette = (): LogoPalette => {
  const {hue, chroma} = useBrand();
  return React.useMemo(() => buildLogoPalette(hue, chroma), [hue, chroma]);
};

/** A paint as drawn: a pen, a reference into the drawing; anything else in `ink`. */
const usePaint = (value: string | undefined) => {
  const palette = useLogoPalette();
  const reference = useReference(value);
  if (value === undefined || value === null) return undefined;
  const paint = String(value).trim();
  if (paint === 'none') return 'none';
  if (isPaletteToken(paint)) return penColor(palette, paint);
  if (URL_REFERENCE.test(paint)) return reference;
  return palette.ink;
};

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

/** The presentation props every shape and group shares: a `G` holds just those. */
type PresentationBlok = Blok<Logo['G']['schema']>;

/** react-native-svg drops an `undefined` prop, but not a `null` one. */
const defined = <T extends Record<string, unknown>>(props: T): Partial<T> =>
  Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined && value !== null)) as Partial<T>;

const usePresentation = (blok: PresentationBlok) => {
  const fill = usePaint(useValue(blok.fill));
  const stroke = usePaint(useValue(blok.stroke));
  const clipPath = useReference(useValue(blok.clipPath));
  // Busy while the call it started runs: a shape cannot dispatch twice.
  const {run: onPress} = usePendingAction(blok.onClick);
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
const shapeRender = (Element: unknown, keys: readonly string[]): BlokRender<Logo['Path']> => {
  const ShapeRender: BlokRender<Logo['Path']> = ({component, schema}) => {
    // The contract's geometry differs per shape; read by key, as one generic schema.
    const blok = useBlok(component, schema as BlokObjectSchema);
    const {props, animate, delay} = usePresentation(blok as unknown as PresentationBlok);
    // The geometry keys are fixed per component, so the hooks run in the same order every render.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const values = defined(Object.fromEntries(keys.map(key => [key, useValue(blok[key])] as const)));
    return <Animated Element={Element as SvgElement} animate={animate} delay={delay} props={{...props, ...values}} />;
  };
  return ShapeRender;
};

/* -------------------------------------------------------------------------- */
/* The root                                                                   */
/* -------------------------------------------------------------------------- */

/** Inside an `Svg` nothing can render a `View`: a node that fails is drawn as nothing. */
const SvgNodeError = () => <G />;

/** "minX minY width height", or null when it is not four numbers with a size. */
export const parseViewBox = (viewBox: string | undefined): Box | null => {
  const numbers = (viewBox ?? '').trim().split(/[\s,]+/).map(Number);
  if (numbers.length !== 4 || numbers.some(n => !Number.isFinite(n))) return null;
  const [x, y, width, height] = numbers;
  return width > 0 && height > 0 ? {x, y, width, height} : null;
};

/** A drawing's root: an `Svg` whose shapes paint with the pens. */
export const LogoRootRender: BlokRender<Logo['AgentLogo']> = args => {
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
        <ViewBoxContext.Provider value={box}>
          <LogoClock>
            <BlokNodeErrorSurface.Provider value={SvgNodeError}>{childrenOf(args)}</BlokNodeErrorSurface.Provider>
          </LogoClock>
        </ViewBoxContext.Provider>
      </SvgDrawingContext.Provider>
    </Svg>
  );
};

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

export const PathRender = shapeRender(Path, ['d']);

export const CircleRender = shapeRender(Circle, ['cx', 'cy', 'r']);

export const EllipseRender = shapeRender(Ellipse, ['cx', 'cy', 'rx', 'ry']);

export const RectRender = shapeRender(Rect, ['x', 'y', 'width', 'height', 'rx', 'ry']);

export const LineRender = shapeRender(Line, ['x1', 'y1', 'x2', 'y2']);

export const PolylineRender = shapeRender(Polyline, ['points']);

export const PolygonRender = shapeRender(Polygon, ['points']);

/** SVG's `dominant-baseline`, as react-native-svg spells it (`alignmentBaseline`). */
const BASELINES = {
  auto: 'baseline',
  middle: 'middle',
  central: 'central',
  hanging: 'hanging',
  alphabetic: 'alphabetic',
} as const;

export const SvgTextRender: BlokRender<Logo['SvgText']> = ({component, schema}) => {
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
};

/* -------------------------------------------------------------------------- */
/* Structure: groups, definitions, gradients, clip paths                      */
/* -------------------------------------------------------------------------- */

export const GroupRender: BlokRender<Logo['G']> = args => {
  const blok = useBlok(args.component, args.schema);
  const {props, animate, delay} = usePresentation(blok);
  return (
    <Animated Element={G as unknown as SvgElement} animate={animate} delay={delay} props={props}>
      {childrenOf(args)}
    </Animated>
  );
};

export const DefsRender: BlokRender<Logo['Defs']> = args => <Defs>{childrenOf(args)}</Defs>;

export const LinearGradientRender: BlokRender<Logo['LinearGradient']> = args => {
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
};

export const RadialGradientRender: BlokRender<Logo['RadialGradient']> = args => {
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
};

export const StopRender: BlokRender<Logo['Stop']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const stopColor = usePaint(useValue(blok.stopColor));
  return (
    <Stop {...defined({offset: useValue(blok.offset), stopColor, stopOpacity: useValue(blok.stopOpacity)})} />
  );
};

export const ClipPathRender: BlokRender<Logo['ClipPath']> = args => {
  const blok = useBlok(args.component, args.schema);
  // react-native-svg clips in user units only; `clipPathUnits` is accepted and ignored.
  useValue(blok.clipPathUnits);
  return <ClipPath id={useElementId(args.component.id)}>{childrenOf(args)}</ClipPath>;
};

/** The `logo@1` catalog: the two roots, seven shapes, text, and what shapes reference. */
