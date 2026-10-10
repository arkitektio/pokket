import { notEmpty, PortKind } from '@/lib/ports/kinds';
import { portDescription, portLabel } from '@/lib/ports/presentation';
import { effectiveWidget, isEditablePort } from '@/lib/ports/supported';
import type { FormPort } from '@/lib/ports/types';
import * as React from 'react';
import { View } from 'react-native';
import { useFieldError, usePortField, usePortShown } from './context';
import { ChoiceField } from './fields/ChoiceField';
import { DateField } from './fields/DateField';
import { ListField } from './fields/ListField';
import { BoolSwitch, type FieldProps, NumberField, StringField, StructureField, UnsupportedField } from './fields/Scalars';
import { SearchField } from './fields/SearchField';
import { SliderField } from './fields/SliderField';
import { PortRow } from './PortRow';

/**
 * The control for a port: by its widget first, then by its kind, as
 * orkestrator's registry resolves it (`core/ports/engine/Registry.tsx`). A
 * custom widget has already been swapped for its fallback.
 */
function Control(props: FieldProps) {
  const { port, widget } = props;
  if (!isEditablePort(port)) return <UnsupportedField {...props} />;
  switch (widget?.__typename) {
    case 'SearchAssignWidget':
      return <SearchField {...props} />;
    case 'SliderAssignWidget':
      return <SliderField {...props} />;
    case 'ChoiceAssignWidget':
      return <ChoiceField {...props} />;
    case 'StringAssignWidget':
      return <StringField {...props} />;
  }
  switch (port.kind) {
    case PortKind.String:
      return (port.choices?.length ?? 0) > 0 ? <ChoiceField {...props} /> : <StringField {...props} />;
    case PortKind.Int:
    case PortKind.Float:
      return <NumberField {...props} />;
    case PortKind.Enum:
      return <ChoiceField {...props} />;
    case PortKind.Date:
      return <DateField {...props} />;
    case PortKind.Structure:
      return <StructureField {...props} />;
    default:
      return <UnsupportedField {...props} />;
  }
}

/** A model's fields, set in from the edge so they read as one thing. */
function ModelFields({ port, path }: { port: FormPort; path: string[] }) {
  return (
    <View className="border-l-2 border-border pl-3">
      {(port.children?.filter(notEmpty) as FormPort[] | undefined)?.map((child) => (
        <PortField key={child.key} port={child} path={[...path, child.key]} />
      ))}
    </View>
  );
}

/**
 * One port of a form: shown or hidden by its effects, labelled, with the
 * control its widget or kind calls for and its error under it.
 */
export function PortField({ port, path }: { port: FormPort; path: string[] }) {
  const shown = usePortShown(port, path);
  // Unmounted when hidden: a field that is not on show is neither validated nor sent.
  return shown ? <ShownField port={port} path={path} /> : null;
}

function ShownField({ port, path }: { port: FormPort; path: string[] }) {
  const widget = effectiveWidget(port);
  const error = useFieldError(path);
  const row = { label: portLabel(port), description: portDescription(port, widget), error };

  if (isEditablePort(port)) {
    if (port.kind === PortKind.Bool) return <PortRow {...row} aside={<BoolSwitch path={path} />} />;
    if (port.kind === PortKind.Model) {
      return (
        <PortRow {...row}>
          <ModelFields port={port} path={path} />
        </PortRow>
      );
    }
    if (port.kind === PortKind.List) {
      return (
        <PortRow {...row}>
          <ListField port={port} path={path} widget={widget} Field={PortField} />
        </PortRow>
      );
    }
  }

  return (
    <PortRow {...row}>
      <Control port={port} path={path} widget={widget} />
    </PortRow>
  );
}

/** A port that is filled in for the user: not drawn, but in the form, so it is validated and sent. */
export function HiddenPortField({ path }: { path: string[] }) {
  usePortField(path);
  return null;
}
