import { Text } from '@/components/ui/text';
import { PortKind } from '@/lib/rekuest/api/graphql';
import { View } from 'react-native';

type Port = { key: string; label?: string | null; kind: PortKind; identifier?: string | null };

/** `@mikro/image` → `image`. */
const shortIdentifier = (identifier: string) => identifier.split(/[/@]/).filter(Boolean).pop() ?? identifier;

const MAX_JSON = 400;

export const formatValue = (value: unknown, port?: Port): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    return port?.kind === PortKind.Structure && port.identifier ? `${shortIdentifier(port.identifier)} ${value}` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value) && value.every((v) => v === null || typeof v !== 'object')) {
    return value.map((v) => formatValue(v)).join(', ');
  }
  const json = JSON.stringify(value, null, 1);
  return json.length > MAX_JSON ? `${json.slice(0, MAX_JSON)}…` : json;
};

/**
 * Values labelled by the action's ports, as orkestrator's args and result
 * sections: a dict is matched by key, a list (returns) by position. Values no
 * port names still show, under their key.
 */
export function PortValues({ ports, values }: { ports: readonly Port[]; values: unknown }) {
  const rows: { key: string; label: string; hint?: string | null; text: string }[] = [];

  if (Array.isArray(values)) {
    values.forEach((value, i) => {
      const port = ports[i];
      rows.push({ key: port?.key ?? String(i), label: port?.label || port?.key || `#${i + 1}`, hint: port?.identifier, text: formatValue(value, port) });
    });
  } else if (values && typeof values === 'object') {
    const record = values as Record<string, unknown>;
    const known = new Set<string>();
    ports.forEach((port) => {
      known.add(port.key);
      rows.push({ key: port.key, label: port.label || port.key, hint: port.identifier, text: formatValue(record[port.key], port) });
    });
    Object.keys(record)
      .filter((k) => !known.has(k))
      .forEach((k) => rows.push({ key: k, label: k, text: formatValue(record[k]) }));
  } else if (values !== null && values !== undefined) {
    rows.push({ key: 'value', label: ports[0]?.label || ports[0]?.key || 'Value', text: formatValue(values, ports[0]) });
  }

  if (rows.length === 0) return <Text className="text-sm text-muted-foreground">None</Text>;

  return (
    <View>
      {rows.map((row, i) => (
        <View key={row.key} className={`gap-0.5 py-2 ${i > 0 ? 'border-t border-border' : ''}`}>
          <View className="flex-row items-baseline gap-2">
            <Text className="text-xs font-medium text-muted-foreground">{row.label}</Text>
            {row.hint ? <Text className="text-[10px] text-muted-foreground/70">{row.hint}</Text> : null}
          </View>
          <Text selectable className="font-mono text-sm text-card-foreground">
            {row.text}
          </Text>
        </View>
      ))}
    </View>
  );
}
