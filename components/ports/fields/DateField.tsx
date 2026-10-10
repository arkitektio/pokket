import { PickerSheet } from '@/components/bank/PickerSheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { asDate, clockPart, monthGrid, withDay } from '@/lib/ports/calendar';
import { portLabel } from '@/lib/ports/presentation';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { usePortField } from '../context';
import { PickerButton } from './ChoiceField';
import type { FieldProps } from './Scalars';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const two = (n: number) => String(n).padStart(2, '0');

/** A month to pick a day from and a clock to type. Pure JS: no native date picker is installed. */
function DatePicker({ initial, clearable, onDone }: { initial: Date | null; clearable: boolean; onDone: (date: Date | null) => void }) {
  const colors = useThemeColors();
  const [date, setDate] = React.useState(() => initial ?? new Date());
  const [shown, setShown] = React.useState(() => ({ year: date.getFullYear(), month: date.getMonth() }));
  const [hours, setHours] = React.useState(two(date.getHours()));
  const [minutes, setMinutes] = React.useState(two(date.getMinutes()));

  const turn = (by: number) =>
    setShown(({ year, month }) => {
      const next = new Date(year, month + by, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  const hour = clockPart(hours, 23);
  const minute = clockPart(minutes, 59);
  const done = () => {
    const result = new Date(date);
    result.setHours(hour ?? 0, minute ?? 0, 0, 0);
    onDone(result);
  };

  const title = new Date(shown.year, shown.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const isPicked = (day: number) => date.getFullYear() === shown.year && date.getMonth() === shown.month && date.getDate() === day;

  return (
    <View className="flex-1 px-3">
      <View className="flex-row items-center justify-between pb-2">
        <Pressable hitSlop={12} onPress={() => turn(-1)} accessibilityLabel="Previous month">
          <ChevronLeft size={22} color={colors.foreground} />
        </Pressable>
        <Text className="text-base font-semibold text-card-foreground">{title}</Text>
        <Pressable hitSlop={12} onPress={() => turn(1)} accessibilityLabel="Next month">
          <ChevronRight size={22} color={colors.foreground} />
        </Pressable>
      </View>
      <View className="flex-row">
        {WEEKDAYS.map((day) => (
          <Text key={day} className="flex-1 pb-1 text-center text-xs text-muted-foreground">
            {day}
          </Text>
        ))}
      </View>
      {monthGrid(shown.year, shown.month).map((week, row) => (
        <View key={row} className="flex-row">
          {week.map((day, column) => (
            <View key={column} className="flex-1 items-center py-0.5">
              {day ? (
                <Pressable
                  onPress={() => setDate((current) => withDay(current, shown.year, shown.month, day))}
                  className={`h-10 w-10 items-center justify-center rounded-full ${isPicked(day) ? 'bg-primary' : 'active:bg-muted'}`}
                >
                  <Text className={`text-base ${isPicked(day) ? 'font-semibold text-primary-foreground' : 'text-card-foreground'}`}>{day}</Text>
                </Pressable>
              ) : (
                <View className="h-10 w-10" />
              )}
            </View>
          ))}
        </View>
      ))}
      <View className="flex-row items-center justify-center gap-2 py-4">
        <Text className="pr-2 text-sm text-muted-foreground">Time</Text>
        <TextInput
          value={hours}
          onChangeText={setHours}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          style={{ color: hour === null ? colors.destructive : colors.foreground }}
          className="w-14 rounded-xl border border-border bg-background py-2 text-center text-lg"
        />
        <Text className="text-lg text-card-foreground">:</Text>
        <TextInput
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          style={{ color: minute === null ? colors.destructive : colors.foreground }}
          className="w-14 rounded-xl border border-border bg-background py-2 text-center text-lg"
        />
      </View>
      <View className="flex-row gap-2">
        {clearable ? (
          <Button variant="outline" className="flex-1" onPress={() => onDone(null)}>
            <Text>Clear</Text>
          </Button>
        ) : null}
        <Button className="flex-1" disabled={hour === null || minute === null} onPress={done}>
          <Text>Done</Text>
        </Button>
      </View>
    </View>
  );
}

export function DateField({ port, path }: FieldProps) {
  const { value, onChange } = usePortField(path);
  const [open, setOpen] = React.useState(false);
  const date = asDate(value);
  return (
    <>
      <PickerButton
        text={date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null}
        placeholder="Pick a date and time"
        onPress={() => setOpen(true)}
      />
      <PickerSheet visible={open} title={portLabel(port)} onClose={() => setOpen(false)}>
        <DatePicker
          initial={date}
          clearable={!!port.nullable && !!date}
          onDone={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      </PickerSheet>
    </>
  );
}
