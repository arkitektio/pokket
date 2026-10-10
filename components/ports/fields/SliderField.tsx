import { Text } from '@/components/ui/text';
import { snap } from '@/lib/ports/calendar';
import { PortKind } from '@/lib/ports/kinds';
import * as React from 'react';
import { View } from 'react-native';
import { usePortField } from '../context';
import { NumberField, type FieldProps } from './Scalars';

const THUMB = 26;

/**
 * A number picked by dragging, for a port whose widget gives a range. Pure
 * JS: a native slider would be a new native module, and new binaries.
 */
function Slider({ value, min, max, step, onChange }: { value: number | null; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const track = React.useRef<View>(null);
  // Where the track is on the screen, measured when a drag starts: touches report screen positions.
  const frame = React.useRef({ x: 0, width: 1 });

  const move = (pageX: number) => {
    const { x, width } = frame.current;
    onChange(snap((pageX - x) / width, min, max, step));
  };
  const begin = (pageX: number) =>
    track.current?.measureInWindow((x, _y, width) => {
      frame.current = { x: x + THUMB / 2, width: Math.max(1, width - THUMB) };
      move(pageX);
    });

  const fraction = value == null || max <= min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  return (
    <View
      ref={track}
      // A touch on the slider is the slider's, and stays so: the page does not scroll from here.
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => begin(event.nativeEvent.pageX)}
      onResponderMove={(event) => move(event.nativeEvent.pageX)}
      style={{ height: THUMB + 12 }}
      className="justify-center"
      accessibilityRole="adjustable"
    >
      <View style={{ marginHorizontal: THUMB / 2 }} className="h-1.5 rounded-full bg-muted">
        <View style={{ width: `${fraction * 100}%` }} className="h-1.5 rounded-full bg-primary" />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: THUMB, top: 6 }}>
        <View
          style={{ width: THUMB, height: THUMB, borderRadius: THUMB / 2, left: `${fraction * 100}%` }}
          className="border-2 border-primary bg-background"
        />
      </View>
    </View>
  );
}

export function SliderField(props: FieldProps) {
  const { port, path, widget } = props;
  const { value, onChange } = usePortField(path);
  const min = typeof widget?.min === 'number' ? widget.min : null;
  const max = typeof widget?.max === 'number' ? widget.max : null;
  // A slider without both ends has nothing to drag between.
  if (min === null || max === null || max <= min) return <NumberField {...props} />;

  const integer = port.kind === PortKind.Int;
  const step = typeof widget?.step === 'number' && widget.step > 0 ? widget.step : integer ? 1 : (max - min) / 100;
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)) ? Number(value) : null;

  return (
    <View className="gap-1">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-xs text-muted-foreground">{min}</Text>
        <Text className="text-base font-semibold text-foreground">{number ?? '—'}</Text>
        <Text className="text-xs text-muted-foreground">{max}</Text>
      </View>
      <Slider value={number} min={min} max={max} step={step} onChange={(next) => onChange(integer ? Math.round(next) : next)} />
    </View>
  );
}
