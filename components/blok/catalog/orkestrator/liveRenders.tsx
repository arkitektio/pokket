import * as React from 'react';
import {View, type LayoutChangeEvent} from 'react-native';
import Svg, {Line, Polyline, Text as SvgText} from 'react-native-svg';
import {useStore} from 'zustand';
import {createStore, type StoreApi} from 'zustand/vanilla';
import {useBlok, useValue, type BlokRenderArgs} from '@arkitektio/bsx/runtime';
import {Text} from '@/components/ui/text';
import {Guard} from '@/lib/app/App';
import {App} from '@/lib/app/App';
import type {LivekitClient} from '@/lib/livekit/client';
import {agentIdentity, useAgentRoom, watchData, type Connector} from '@/lib/lovekit/agentRoom';
import {StreamKind, useGetStreamQuery, useWatchAgentMutation, type DataFormatFragment} from '@/lib/lovekit/api/graphql';
import {decodeFrame} from '@/lib/lovekit/frame';
import {useThemeColors} from '@/lib/theme/BrandProvider';
import {cn} from '@/lib/utils';
import {useSceneNotice, useSceneOverlay} from '../scene/context';
import {asStructure, cssLength} from '../shared';
import {lovekitTraceSchema, lovekitVideoSchema, plotSchema} from './live';
import {plotMap, strayReferences} from './mount/frame';

/**
 * The plot and the live mounts on the phone (orkestrator `core/blok/plot`,
 * `lovekit/bloks`). The plot is SVG: a row per mount, stacked, along the
 * plot's one axis. A live trace reads its stream's data track in the agent's
 * room (`lib/lovekit/agentRoom`) and redraws at most ten times a second.
 */

const DEFAULT_COLOR = '#7dd3fc';
const DEFAULT_HEIGHT = 320;
/** How often a live row is redrawn: a phone needs no more for a spectrum to be read. */
const REDRAW_MS = 100;
const AXIS_PX = 22;

/* ------------------------------------------------------------- plot store */

type PlotRow = {
  title: string;
  color: string;
  unit: string | null;
  reference: string | null;
  /** Positions on the plot's axis (ascending) and their values; null until a frame arrived. */
  xs: Float64Array | null;
  ys: Float32Array | null;
  /** The value range shown: it grows at once and shrinks slowly, a row that rescales every frame cannot be read. */
  low: number;
  high: number;
  notice: string | null;
};

type PlotState = {
  rows: Record<string, PlotRow>;
  setRow: (id: string, row: Partial<PlotRow> | null) => void;
};

type PlotContextValue = {axis: {name: string; unit: string; reference: string | null}; store: StoreApi<PlotState>};

const PlotContext = React.createContext<PlotContextValue | null>(null);

const createPlotStore = () =>
  createStore<PlotState>(set => ({
    rows: {},
    setRow: (id, row) =>
      set(state => {
        if (row === null) {
          if (!(id in state.rows)) return state;
          const {[id]: _gone, ...rest} = state.rows;
          return {rows: rest};
        }
        const current: PlotRow = state.rows[id] ?? {
          title: '',
          color: DEFAULT_COLOR,
          unit: null,
          reference: null,
          xs: null,
          ys: null,
          low: NaN,
          high: NaN,
          notice: null,
        };
        return {rows: {...state.rows, [id]: {...current, ...row}}};
      }),
  }));

/** This mount's row in the plot it is in, for as long as it is mounted. */
const usePlotRow = (id: string) => {
  const plot = React.useContext(PlotContext);
  React.useEffect(() => {
    if (!plot) return;
    return () => plot.store.getState().setRow(id, null);
  }, [plot, id]);
  return plot;
};

/* -------------------------------------------------------------- plot draw */

const formatTick = (value: number) => {
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude >= 1e5 || magnitude < 1e-3)) return value.toExponential(1);
  return Number(value.toPrecision(4)).toString();
};

/** A row's line, one min and one max per pixel column: peaks narrower than a pixel stay visible. */
const linePoints = (row: PlotRow, x0: number, x1: number, width: number, top: number, height: number) => {
  const {xs, ys} = row;
  if (!xs || !ys || xs.length === 0 || !(row.high > row.low)) return '';
  const span = x1 - x0 || 1;
  const columns = Math.max(1, Math.floor(width));
  const lows = new Float32Array(columns).fill(Infinity);
  const highs = new Float32Array(columns).fill(-Infinity);
  for (let index = 0; index < xs.length; index++) {
    const value = ys[index];
    if (!Number.isFinite(value)) continue;
    const column = Math.min(columns - 1, Math.max(0, Math.floor(((xs[index] - x0) / span) * columns)));
    if (value < lows[column]) lows[column] = value;
    if (value > highs[column]) highs[column] = value;
  }
  const scale = height / (row.high - row.low);
  const y = (value: number) => (top + height - (value - row.low) * scale).toFixed(1);
  const points: string[] = [];
  for (let column = 0; column < columns; column++) {
    if (lows[column] === Infinity) continue;
    const x = (column + 0.5).toFixed(1);
    points.push(`${x},${y(lows[column])}`);
    if (highs[column] !== lows[column]) points.push(`${x},${y(highs[column])}`);
  }
  return points.join(' ');
};

const PlotDrawing = ({context, height}: {context: PlotContextValue; height: number}) => {
  const colors = useThemeColors();
  const rows = useStore(context.store, state => state.rows);
  const [width, setWidth] = React.useState(0);
  const entries = Object.entries(rows);

  // The window: everything the mounts have placed on the axis.
  let x0 = Infinity;
  let x1 = -Infinity;
  for (const [, row] of entries) {
    if (!row.xs || row.xs.length === 0) continue;
    x0 = Math.min(x0, row.xs[0]);
    x1 = Math.max(x1, row.xs[row.xs.length - 1]);
  }
  const placed = x0 < x1;
  const drawn = entries.filter(([, row]) => row.xs);
  const rowHeight = drawn.length ? (height - AXIS_PX) / drawn.length : 0;
  const ticks = placed ? Array.from({length: 5}, (_, index) => x0 + ((x1 - x0) * index) / 4) : [];
  const stray = strayReferences([context.axis.reference, ...entries.map(([, row]) => row.reference)]);
  const notices = [
    ...entries.flatMap(([, row]) => (row.notice ? [row.notice] : [])),
    ...(stray.length ? [`Mounts of different spaces (${stray.join(', ')}) are drawn on one axis.`] : []),
  ];

  return (
    <View className="gap-2">
      <View style={{height}} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && placed ? (
          <Svg width={width} height={height}>
            {drawn.map(([id, row], index) => {
              const top = index * rowHeight + 4;
              return (
                <React.Fragment key={id}>
                  {index > 0 ? (
                    <Line x1={0} x2={width} y1={index * rowHeight} y2={index * rowHeight} stroke={colors.border} strokeWidth={1} />
                  ) : null}
                  <Polyline
                    points={linePoints(row, x0, x1, width, top, Math.max(1, rowHeight - 8))}
                    fill="none"
                    stroke={row.color}
                    strokeWidth={1.5}
                  />
                  <SvgText x={4} y={top + 10} fontSize={10} fill={colors.mutedForeground}>
                    {row.unit ? `${row.title} (${row.unit})` : row.title}
                  </SvgText>
                </React.Fragment>
              );
            })}
            <Line x1={0} x2={width} y1={height - AXIS_PX} y2={height - AXIS_PX} stroke={colors.border} strokeWidth={1} />
            {ticks.map((tick, index) => {
              const x = ((tick - x0) / (x1 - x0)) * width;
              const anchor = index === 0 ? 'start' : index === ticks.length - 1 ? 'end' : 'middle';
              return (
                <SvgText key={index} x={x} y={height - 6} fontSize={10} textAnchor={anchor} fill={colors.mutedForeground}>
                  {formatTick(tick)}
                </SvgText>
              );
            })}
          </Svg>
        ) : (
          <View className="h-full items-center justify-center">
            <Text className="text-sm text-muted-foreground">{entries.length ? 'Waiting for data…' : 'Nothing is drawn in this plot.'}</Text>
          </View>
        )}
      </View>
      <Text className="text-xs text-muted-foreground">
        {context.axis.name} ({context.axis.unit})
      </Text>
      {notices.map(notice => (
        <Text key={notice} className="text-xs text-destructive">
          {notice}
        </Text>
      ))}
    </View>
  );
};

export const PlotRender = ({component, buildChild}: BlokRenderArgs) => {
  const blok = useBlok(component, plotSchema);
  const axis = useValue(blok.axis);
  const unit = useValue(blok.unit);
  const reference = useValue(blok.reference) ?? null;
  const heightProp = cssLength(useValue(blok.height));
  const className = useValue(blok.className);
  const [store] = React.useState(createPlotStore);
  const context = React.useMemo<PlotContextValue>(
    () => ({axis: {name: axis ?? '', unit: unit ?? '', reference}, store}),
    [axis, unit, reference, store],
  );
  const height = typeof heightProp === 'number' ? heightProp : DEFAULT_HEIGHT;

  return (
    <PlotContext.Provider value={context}>
      <View className={cn('rounded-xl border border-border bg-card p-3', className)}>
        <PlotDrawing context={context} height={height} />
      </View>
      {/* The mounts draw nothing themselves: they fill their row of the plot. */}
      {(component.children ?? []).map(child => (
        <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
      ))}
    </PlotContext.Provider>
  );
};

/* ------------------------------------------------------------ live trace */

/** Where each value of a frame sits on the plot's axis, ascending, and whether the frame runs backwards. */
const positionsOf = (format: DataFormatFragment, map: {scale: number; offset: number}) => {
  const count = format.shape[0] ?? 0;
  const calibration = format.calibration.find(candidate => candidate.axis === format.axes[0]?.name);
  const step = calibration?.scale ?? 1;
  const first = calibration?.offset ?? 0;
  const xs = new Float64Array(count);
  for (let index = 0; index < count; index++) xs[index] = map.scale * (first + step * index) + map.offset;
  const descending = count > 1 && xs[count - 1] < xs[0];
  if (descending) xs.reverse();
  return {xs, descending};
};

/** What lovekit hands out to watch an agent, where LiveKit is, and how media gets there. */
const useConnector = (): Connector => {
  const client = App.useService('livekit').client as LivekitClient;
  const [watchAgent] = useWatchAgentMutation();
  return React.useMemo(
    () => ({
      url: client.url,
      mediaPath: client.mediaPath,
      connect: async (agent: string) => {
        const connection = (await watchAgent({variables: {input: {agent}}})).data?.watchAgent;
        if (!connection) throw new Error('Lovekit handed out no connection');
        return connection;
      },
    }),
    [client, watchAgent],
  );
};

const LiveTrace = ({component}: BlokRenderArgs) => {
  const blok = useBlok(component, lovekitTraceSchema);
  const value = asStructure(useValue(blok.value));
  const transform = useValue(blok.transform);
  const output = useValue(blok.output);
  const color = useValue(blok.color) ?? DEFAULT_COLOR;
  const plot = usePlotRow(component.id);
  const {data, error} = useGetStreamQuery({variables: {id: String(value?.object ?? '')}, skip: !value});
  const stream = data?.stream;
  const format = stream?.format ?? null;

  const first = format?.axes[0];
  const calibrationUnit = format?.calibration.find(candidate => candidate.axis === first?.name)?.unit ?? null;
  const placementKey = JSON.stringify([transform ?? null, output ?? null]);
  const map = React.useMemo(
    () =>
      plotMap(
        {name: first?.name ?? 'x', type: first?.type ?? 'SPECTRUM', unit: calibrationUnit},
        {name: plot?.axis.name ?? '', unit: plot?.axis.unit ?? null},
        transform,
        output,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [first?.name, first?.type, calibrationUnit, plot, placementKey],
  );
  const placed = React.useMemo(() => (format && format.shape.length === 1 ? positionsOf(format, map) : null), [format, map]);

  const problem = !value
    ? null
    : error
      ? `The stream could not be loaded: ${error.message}`
      : stream && stream.kind !== StreamKind.Data
        ? `${stream.title} is no data stream.`
        : format && format.shape.length !== 1
          ? `${stream?.title}: only a one-axis frame is drawn as a line (this one has ${format.shape.length}).`
          : map.error && stream
            ? `${stream.title}: ${map.error}`
            : null;

  const connector = useConnector();
  const room = useAgentRoom(stream?.agent.id, stream ? connector : undefined);
  const roomProblem = room?.status === 'error' && stream ? `${stream.title}: ${room.error}` : null;

  React.useEffect(() => {
    plot?.store.getState().setRow(component.id, {
      title: stream?.title ?? 'Stream',
      color,
      unit: format?.unit ?? null,
      notice: problem ?? roomProblem,
    });
  }, [plot, component.id, stream?.title, color, format?.unit, problem, roomProblem]);

  const joined = room?.room ?? null;
  React.useEffect(() => {
    if (!plot || !stream || !format || !placed || !joined) return;
    const {xs, descending} = placed;
    let newest: Float32Array | null = null;
    let sentAt = -1;
    let drawnAt = -2;
    const range = {low: NaN, high: NaN};

    const redraw = setInterval(() => {
      const values = newest;
      if (!values || sentAt === drawnAt) return;
      drawnAt = sentAt;
      const ys = new Float32Array(xs.length);
      for (let index = 0; index < ys.length; index++) ys[index] = values[descending ? values.length - 1 - index : index] ?? NaN;
      let low = Infinity;
      let high = -Infinity;
      for (const item of ys) {
        if (!Number.isFinite(item)) continue;
        if (item < low) low = item;
        if (item > high) high = item;
      }
      if (low !== Infinity) {
        range.low = Number.isFinite(range.low) ? Math.min(low, range.low + (low - range.low) * 0.05) : low;
        range.high = Number.isFinite(range.high) ? Math.max(high, range.high + (high - range.high) * 0.05) : high;
      }
      const top = range.high > range.low ? range.high : range.low + 1;
      plot.store.getState().setRow(component.id, {xs, ys, low: range.low, high: top});
    }, REDRAW_MS);

    const stop = watchData(joined, stream.key, agentIdentity(stream.agent.id), payload => {
      const frame = decodeFrame(payload, format.dtype);
      // A frame sent again for late viewers changes nothing.
      if (!frame || frame.sentAt <= sentAt) return;
      sentAt = frame.sentAt;
      newest = Float32Array.from(frame.values);
    });
    return () => {
      stop();
      clearInterval(redraw);
    };
  }, [plot, component.id, stream, format, placed, joined]);

  return null;
};

/** Says in the plot why a mount draws nothing, as its row's notice. */
const PlotNotice = ({id, title, notice}: {id: string; title: string; notice: string}) => {
  const plot = usePlotRow(id);
  React.useEffect(() => {
    plot?.store.getState().setRow(id, {title, notice});
  }, [plot, id, title, notice]);
  return null;
};

export const LovekitTraceRender = (args: BlokRenderArgs) => {
  // The stream is lovekit's, its data comes over livekit: without either, the row says so.
  const unavailable = <PlotNotice id={args.component.id} title="Stream" notice="Live streams are not available here." />;
  return (
    <Guard.Lovekit fallback={unavailable}>
      <Guard.Livekit fallback={unavailable}>
        <LiveTrace {...args} />
      </Guard.Livekit>
    </Guard.Lovekit>
  );
};

/* ------------------------------------------------------------ live video */

const StreamPlayerById = React.lazy(() => import('@/components/streams/StreamPlayer'));

const VideoCard = ({streamId}: {streamId: string}) => {
  const unavailable = <Text className="text-sm text-muted-foreground">Live streams are not available here.</Text>;
  return (
    <Guard.Lovekit fallback={unavailable}>
      <Guard.Livekit fallback={unavailable}>
        <React.Suspense fallback={null}>
          <StreamPlayerById streamId={streamId} className="h-auto aspect-video" />
        </React.Suspense>
      </Guard.Livekit>
    </Guard.Lovekit>
  );
};

const noAnchor = () => null;

/**
 * A video stream in a Scene. The phone's WebRTC draws into a native view, not
 * a texture three.js can put on a quad, so the stream plays in a card beside
 * the scene instead of on the stage. Inside the canvas this draws nothing.
 */
export const LovekitVideoRender = ({component}: BlokRenderArgs) => {
  const blok = useBlok(component, lovekitVideoSchema);
  const value = asStructure(useValue(blok.value));
  const streamId = value ? String(value.object) : null;
  const content = React.useMemo(() => (streamId ? <VideoCard key={streamId} streamId={streamId} /> : null), [streamId]);
  useSceneOverlay({
    visible: Boolean(streamId),
    anchor: noAnchor,
    title: 'Live video',
    description: 'Played beside the scene: the phone cannot draw a stream on the stage.',
    content,
    mode: 'panel',
  });
  return null;
};

/* ----------------------------------------------------------- mikro mounts */

/** A mikro scene's 3D layers in a Scene: the phone draws no mikro volume yet, so the scene says so. */
export const MikroSceneMountRender = () => {
  useSceneNotice('Mikro scene not drawn', "The phone does not draw a mikro scene's layers yet: open it in the Orkestrator.");
  return null;
};

/** A mikro chart's lines in a Plot: not drawn on the phone yet, its row says so. */
export const MikroChartMountRender = ({component}: BlokRenderArgs) => (
  <PlotNotice id={component.id} title="Chart" notice="The phone does not draw mikro charts yet: open it in the Orkestrator." />
);
