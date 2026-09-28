import { Text } from '@/components/ui/text';
import { ListTransactionFragment, TransactionStatus } from '@/lib/bank/api/graphql';
import { formatShortDay, toNumber, transactionTitle } from '@/lib/bank/format';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import { MerchantLogo } from './MerchantLogo';
import { Money } from './Money';

/**
 * One statement line: logo, merchant or counterparty, category and date,
 * and the signed amount. `rank` numbers the rows of a top list.
 */
export function TransactionRow({ transaction: t, rank }: { transaction: ListTransactionFragment; rank?: number }) {
  const incoming = toNumber(t.amount) > 0;
  const pending = t.status === TransactionStatus.Pending;
  const detail = [t.category?.name, formatShortDay(t.bookingDate ?? t.transactionDate)].filter(Boolean).join(' · ');

  return (
    <Link href={`/bank/transaction/${t.id}`} asChild>
      <Pressable className="flex-row items-center gap-3 border-b border-border bg-background px-4 py-3 active:bg-muted">
        {rank !== undefined ? (
          <Text className="w-5 text-center text-xs font-semibold text-muted-foreground">{rank}</Text>
        ) : null}
        <MerchantLogo logoUrl={t.merchant?.logoUrl} incoming={incoming} hasMerchant={!!t.merchant} />
        <View className="flex-1">
          <Text numberOfLines={1} className="text-base font-medium text-foreground">
            {transactionTitle(t)}
          </Text>
          <View className="flex-row items-center gap-1.5">
            {t.category?.color ? (
              <View style={{ backgroundColor: t.category.color }} className="h-2 w-2 rounded-full" />
            ) : null}
            <Text numberOfLines={1} className="shrink text-xs text-muted-foreground">
              {detail}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Money amount={t.amount} currency={t.currency} signed className="text-base font-semibold" />
          {pending ? <Text className="text-xs text-amber-500">Pending</Text> : null}
        </View>
      </Pressable>
    </Link>
  );
}
