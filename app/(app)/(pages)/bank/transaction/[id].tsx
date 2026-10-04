import { CategorySheet } from '@/components/bank/CategorySheet';
import { MerchantLogo } from '@/components/bank/MerchantLogo';
import { MerchantSheet } from '@/components/bank/MerchantSheet';
import { Money } from '@/components/bank/Money';
import { BankLoadingState, BankUnavailable } from '@/components/bank/states';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { TransactionStatus, useGetTransactionQuery } from '@/lib/bank/api/graphql';
import { formatDay, formatIban, toNumber, transactionTitle } from '@/lib/bank/format';
import { useLocalSearchParams } from 'expo-router';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between gap-4 border-b border-border py-2.5">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text selectable className="shrink text-right text-sm text-card-foreground">
        {value}
      </Text>
    </View>
  );
}

/** A fact you can change: tapping the row opens its picker. */
function EditableFact({
  label,
  value,
  color,
  placeholder,
  onPress,
}: {
  label: string;
  value?: string | null;
  color?: string | null;
  placeholder: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Change ${label.toLowerCase()}`}
      className="flex-row items-center justify-between gap-4 border-b border-border py-2.5 active:opacity-60"
    >
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <View className="shrink flex-row items-center gap-1.5">
        {color ? <View style={{ backgroundColor: color }} className="h-2 w-2 rounded-full" /> : null}
        <Text numberOfLines={1} className={`shrink text-right text-sm ${value ? 'text-primary' : 'text-muted-foreground'}`}>
          {value || placeholder}
        </Text>
        <ChevronRight size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

function TransactionContent({ id }: { id: string }) {
  const { data, loading, error } = useGetTransactionQuery({ variables: { id }, fetchPolicy: 'cache-and-network' });
  const t = data?.transaction;
  useTabTitle(t ? transactionTitle(t) : null);
  const [picking, setPicking] = React.useState<'category' | 'merchant' | null>(null);

  if (!t) {
    if (loading) return <BankLoadingState message="Loading transaction…" />;
    return <Text className="p-4 text-sm text-destructive">{error?.message ?? 'Transaction not found.'}</Text>;
  }

  const place = t.merchantLocation
    ? [t.merchantLocation.name, t.merchantLocation.street, t.merchantLocation.city].filter(Boolean).join(', ')
    : null;

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="items-center gap-2 px-4 pb-6 pt-8">
        <MerchantLogo
          logoUrl={t.merchant?.logoUrl}
          incoming={toNumber(t.amount) > 0}
          hasMerchant={!!t.merchant}
          size={64}
        />
        <Text selectable className="text-center text-lg font-semibold text-foreground">
          {transactionTitle(t)}
        </Text>
        <Money amount={t.amount} currency={t.currency} signed className="text-3xl font-bold" />
        {t.status === TransactionStatus.Pending ? <Text className="text-sm text-amber-500">Pending</Text> : null}
      </View>
      <View className="px-4 pb-10">
        <Card className="border-border bg-card">
          <CardContent className="py-2">
            <EditableFact
              label="Category"
              value={t.category?.name}
              color={t.category?.color}
              placeholder="Uncategorized"
              onPress={() => setPicking('category')}
            />
            <EditableFact
              label="Merchant"
              value={t.merchant?.name}
              placeholder="Set merchant"
              onPress={() => setPicking('merchant')}
            />
            <Fact label="Booked" value={formatDay(t.bookingDate)} />
            <Fact label="Paid on" value={t.transactionDate !== t.bookingDate ? formatDay(t.transactionDate) : null} />
            <Fact label="Account" value={t.account.name || formatIban(t.account.iban)} />
            <Fact label="Counterparty" value={t.merchant ? t.counterparty : null} />
            <Fact label="Counterparty IBAN" value={formatIban(t.counterpartyIban)} />
            <Fact label="Place" value={place} />
            <Fact label="Transfer" value={t.isTransfer ? 'Between own accounts' : null} />
            <Fact label="Reference" value={t.remittance} />
            <Fact label="Note" value={t.note} />
          </CardContent>
        </Card>
      </View>
      <CategorySheet visible={picking === 'category'} transaction={t} onClose={() => setPicking(null)} />
      <MerchantSheet visible={picking === 'merchant'} transaction={t} onClose={() => setPicking(null)} />
    </ScrollView>
  );
}

export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<BankLoadingState message="Connecting…" />}>
        <Guard.Bank fallback={<BankUnavailable />}>
          <TransactionContent id={id} />
        </Guard.Bank>
      </Guard.Lok>
    </View>
  );
}
