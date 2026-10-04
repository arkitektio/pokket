import { Text } from '@/components/ui/text';
import {
  ListTransactionsDocument,
  MerchantSource,
  TransactionFragment,
  useAssignMerchantMutation,
  useCreateMerchantMutation,
  useMerchantPickerQuery,
} from '@/lib/bank/api/graphql';
import { toNumber } from '@/lib/bank/format';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Plus, RotateCcw } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { MerchantLogo } from './MerchantLogo';
import { PickerRow, PickerSearch, PickerSheet } from './PickerSheet';

const SEARCH_DEBOUNCE_MS = 250;

const useDebounced = <T,>(value: T, ms: number): T => {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
};

function MerchantPicker({
  transaction: t,
  onClose,
  onBusy,
}: {
  transaction: TransactionFragment;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const colors = useThemeColors();
  const [search, setSearch] = React.useState('');
  const name = search.trim();
  const term = useDebounced(name, SEARCH_DEBOUNCE_MS);
  const { data, previousData, loading, error } = useMerchantPickerQuery({
    variables: { search: term || undefined },
    fetchPolicy: 'cache-and-network',
  });
  const [assign] = useAssignMerchantMutation();
  const [createMerchant] = useCreateMerchantMutation();
  const [saving, setSaving] = React.useState(false);

  // The last answer stays up while the next one loads, so the list does not blink per keystroke.
  const merchants = (data ?? previousData)?.merchants ?? [];
  const settled = term === name && !loading;
  const exact = merchants.some((m) => m.name.toLowerCase() === name.toLowerCase());
  const incoming = toNumber(t.amount) > 0;

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

  const choose = (merchant: string | null) =>
    run(async () => {
      if (merchant !== null && merchant === t.merchant?.id) return true;
      const result = await assign({
        variables: { input: { transactions: [t.id], merchant: merchant ? { id: merchant } : null } },
      });
      return !!result.data;
    });

  // A new merchant learns its aliases from this line, so its other
  // transactions match too; the lists refetch to show them.
  const create = () =>
    run(async () => {
      const created = await createMerchant({
        variables: { input: { name, fromTransactions: [t.id] } },
        refetchQueries: [ListTransactionsDocument],
      });
      const id = created.data?.createMerchant.id;
      if (!id) return false;
      const result = await assign({ variables: { input: { transactions: [t.id], merchant: { id } } } });
      return !!result.data;
    });

  return (
    <>
      <PickerSearch value={search} onChangeText={setSearch} placeholder="Search or name a new merchant" />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" className="flex-1">
        {merchants.map((m) => (
          <PickerRow
            key={m.id}
            leading={<MerchantLogo logoUrl={m.logoUrl} incoming={incoming} hasMerchant size={28} />}
            title={m.name}
            detail={m.category?.name}
            selected={m.id === t.merchant?.id}
            disabled={saving}
            onPress={() => void choose(m.id)}
          />
        ))}
        {!merchants.length && loading ? <ActivityIndicator className="py-6" color={colors.primary} /> : null}
        {!merchants.length && error ? <Text className="px-3 py-4 text-sm text-destructive">{error.message}</Text> : null}
        {!merchants.length && settled && !error ? (
          <Text className="px-3 py-4 text-sm text-muted-foreground">
            {name ? `No merchant matches “${name}”.` : 'No merchants yet. Type a name to create one.'}
          </Text>
        ) : null}
      </ScrollView>
      <View className="mt-2 border-t border-border pt-2">
        {name && settled && !exact ? (
          <PickerRow
            leading={<Plus size={20} color={colors.primary} />}
            title={`Create “${name}”`}
            detail="Similar transactions are matched to it too"
            tone="primary"
            disabled={saving}
            onPress={() => void create()}
          />
        ) : null}
        {t.merchantSource === MerchantSource.Manual ? (
          <PickerRow
            leading={<RotateCcw size={18} color={colors.mutedForeground} />}
            title="Clear merchant"
            detail="Automatic matching decides again"
            disabled={saving}
            onPress={() => void choose(null)}
          />
        ) : null}
      </View>
    </>
  );
}

/** Pick, clear or create the merchant of one transaction. */
export function MerchantSheet({
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
    <PickerSheet visible={visible} title="Merchant" busy={busy} onClose={onClose}>
      <MerchantPicker transaction={transaction} onClose={onClose} onBusy={setBusy} />
    </PickerSheet>
  );
}
