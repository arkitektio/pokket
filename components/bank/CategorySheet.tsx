import { Text } from '@/components/ui/text';
import {
  CategoryKind,
  CategoryPickerDocument,
  PickerCategoryFragment,
  TransactionFragment,
  useCategorizeTransactionMutation,
  useCategoryPickerQuery,
  useCreateCategoryMutation,
} from '@/lib/bank/api/graphql';
import { toNumber } from '@/lib/bank/format';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Check, Plus, RotateCcw } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { PickerRow, PickerSearch, PickerSectionHeader, PickerSheet } from './PickerSheet';

const SWATCHES = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

const KINDS: { kind: CategoryKind; label: string }[] = [
  { kind: CategoryKind.Expense, label: 'Expense' },
  { kind: CategoryKind.Income, label: 'Income' },
  { kind: CategoryKind.Transfer, label: 'Transfer' },
];

const Dot = ({ color }: { color?: string | null }) => (
  <View style={color ? { backgroundColor: color } : undefined} className={`h-3 w-3 rounded-full ${color ? '' : 'bg-muted'}`} />
);

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${selected ? 'border-primary bg-primary' : 'border-border bg-background'}`}
    >
      <Text className={`text-sm ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>{label}</Text>
    </Pressable>
  );
}

/**
 * A new category, made from the picker: a name, where it sits, and a color.
 * Under a parent it takes the parent's kind, so the kind is only asked for at
 * the top level.
 */
function NewCategoryForm({
  initialName,
  initialKind,
  roots,
  saving,
  onCancel,
  onCreate,
}: {
  initialName: string;
  initialKind: CategoryKind;
  roots: PickerCategoryFragment[];
  saving: boolean;
  onCancel: () => void;
  onCreate: (input: { name: string; kind: CategoryKind; parent: string | null; color: string }) => void;
}) {
  const colors = useThemeColors();
  const [name, setName] = React.useState(initialName);
  const [kind, setKind] = React.useState(initialKind);
  const [parent, setParent] = React.useState<string | null>(null);
  const [color, setColor] = React.useState(SWATCHES[0]);
  const trimmed = name.trim();

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-3 px-3 pb-2">
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Category name"
        placeholderTextColor={colors.mutedForeground}
        autoFocus
        autoCapitalize="sentences"
        style={{ color: colors.foreground }}
        className="rounded-xl border border-border bg-background px-4 py-3 text-base"
      />

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase text-muted-foreground">Inside</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="flex-row gap-2">
            <Chip label="Top level" selected={parent === null} onPress={() => setParent(null)} />
            {roots.map((root) => (
              <Chip key={root.id} label={root.name} selected={parent === root.id} onPress={() => setParent(root.id)} />
            ))}
          </View>
        </ScrollView>
      </View>

      {parent === null ? (
        <View className="gap-1.5">
          <Text className="text-xs font-semibold uppercase text-muted-foreground">Kind</Text>
          <View className="flex-row gap-2">
            {KINDS.map((k) => (
              <Chip key={k.kind} label={k.label} selected={kind === k.kind} onPress={() => setKind(k.kind)} />
            ))}
          </View>
        </View>
      ) : null}

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase text-muted-foreground">Color</Text>
        <View className="flex-row flex-wrap gap-2.5">
          {SWATCHES.map((swatch) => (
            <Pressable
              key={swatch}
              onPress={() => setColor(swatch)}
              accessibilityLabel={`Color ${swatch}`}
              style={{ backgroundColor: swatch }}
              className="h-8 w-8 items-center justify-center rounded-full"
            >
              {color === swatch ? <Check size={16} color="#ffffff" /> : null}
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mt-2 flex-row items-center justify-end gap-2">
        <Pressable onPress={onCancel} className="rounded-lg px-3 py-2 active:opacity-70">
          <Text className="text-sm text-muted-foreground">Back</Text>
        </Pressable>
        <Pressable
          onPress={() => trimmed && onCreate({ name: trimmed, kind, parent, color })}
          disabled={!trimmed || saving}
          className={`rounded-lg bg-primary px-4 py-2 active:opacity-80 ${trimmed && !saving ? '' : 'opacity-50'}`}
        >
          <Text className="text-sm font-medium text-primary-foreground">Create and use</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function CategoryPicker({
  transaction: t,
  onClose,
  onBusy,
}: {
  transaction: TransactionFragment;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const colors = useThemeColors();
  const { data, loading, error } = useCategoryPickerQuery({
    variables: { transaction: t.id },
    fetchPolicy: 'cache-and-network',
    // Suggestions are a nicety: without them the list still stands.
    errorPolicy: 'all',
  });
  const [categorize] = useCategorizeTransactionMutation();
  const [createCategory] = useCreateCategoryMutation();
  const [search, setSearch] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const categories = React.useMemo(() => data?.categories ?? [], [data]);
  const term = search.trim().toLowerCase();
  const matches = term
    ? categories.filter((c) => c.name.toLowerCase().includes(term) || c.parent?.name.toLowerCase().includes(term))
    : categories;
  const suggestions = term ? [] : (data?.suggestCategories ?? []).map((s) => s.category).filter((c) => c.id !== t.category?.id);
  const exact = categories.some((c) => c.name.toLowerCase() === term);

  const run = async (work: () => Promise<boolean>) => {
    setSaving(true);
    onBusy(true);
    try {
      if (await work()) onClose();
    } finally {
      setSaving(false);
      onBusy(false);
    }
  };

  const choose = (category: string | null) =>
    run(async () => {
      if (category === (t.category?.id ?? null)) return true;
      const result = await categorize({ variables: { input: { id: t.id, category } } });
      return !!result.data;
    });

  const create = (input: { name: string; kind: CategoryKind; parent: string | null; color: string }) =>
    run(async () => {
      const created = await createCategory({
        variables: { input: { name: input.name, color: input.color, parent: input.parent, ...(input.parent ? {} : { kind: input.kind }) } },
        refetchQueries: [CategoryPickerDocument],
      });
      const id = created.data?.createCategory.id;
      if (!id) return false;
      const result = await categorize({ variables: { input: { id: t.id, category: id } } });
      return !!result.data;
    });

  if (creating) {
    return (
      <NewCategoryForm
        initialName={search.trim()}
        initialKind={toNumber(t.amount) > 0 ? CategoryKind.Income : CategoryKind.Expense}
        roots={categories.filter((c) => !c.parent)}
        saving={saving}
        onCancel={() => setCreating(false)}
        onCreate={create}
      />
    );
  }

  const row = (c: PickerCategoryFragment) => (
    <PickerRow
      key={c.id}
      leading={<Dot color={c.color} />}
      title={c.name}
      detail={c.parent?.name}
      selected={c.id === t.category?.id}
      disabled={saving}
      onPress={() => void choose(c.id)}
    />
  );

  return (
    <>
      <PickerSearch value={search} onChangeText={setSearch} placeholder="Search or name a new category" />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" className="flex-1">
        {suggestions.length ? (
          <>
            <PickerSectionHeader title="Suggested" />
            {suggestions.map(row)}
            <PickerSectionHeader title="All categories" />
          </>
        ) : null}
        {matches.map(row)}
        {!data && loading ? <ActivityIndicator className="py-6" color={colors.primary} /> : null}
        {!data && error ? <Text className="px-3 py-4 text-sm text-destructive">{error.message}</Text> : null}
        {data && !matches.length ? (
          <Text className="px-3 py-4 text-sm text-muted-foreground">
            {term ? `No category matches “${search.trim()}”.` : 'No categories yet.'}
          </Text>
        ) : null}
      </ScrollView>
      <View className="mt-2 border-t border-border pt-2">
        {!exact ? (
          <PickerRow
            leading={<Plus size={20} color={colors.primary} />}
            title={term ? `Create “${search.trim()}”` : 'New category…'}
            tone="primary"
            disabled={saving}
            onPress={() => setCreating(true)}
          />
        ) : null}
        {t.category ? (
          <PickerRow
            leading={<RotateCcw size={18} color={colors.mutedForeground} />}
            title="Clear category"
            detail="The rules decide again"
            disabled={saving}
            onPress={() => void choose(null)}
          />
        ) : null}
      </View>
    </>
  );
}

/** Pick, clear or create the category of one transaction. */
export function CategorySheet({
  visible,
  transaction,
  onClose,
}: {
  visible: boolean;
  transaction: TransactionFragment;
  onClose: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <PickerSheet visible={visible} title="Category" busy={busy} onClose={onClose}>
      <CategoryPicker transaction={transaction} onClose={onClose} onBusy={setBusy} />
    </PickerSheet>
  );
}
