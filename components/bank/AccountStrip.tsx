import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { ListBankAccountFragment } from '@/lib/bank/api/graphql';
import { formatIban } from '@/lib/bank/format';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { AlertTriangle } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Money } from './Money';

/** The organization's accounts and their latest balances, side by side. */
export function AccountStrip({ accounts }: { accounts: ListBankAccountFragment[] }) {
  const colors = useThemeColors();
  if (accounts.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
      <View className="flex-row gap-3 px-4 py-3">
        {accounts.map((account) => (
          <Card key={account.id} className="min-w-[170px] gap-1 border-border bg-card px-4 py-3">
            <View className="flex-row items-center gap-1.5">
              <Text numberOfLines={1} className="shrink text-sm font-medium text-card-foreground">
                {account.name || account.connection?.aspspName}
              </Text>
              {account.isSyncing ? <ActivityIndicator size="small" color={colors.primary} /> : null}
              {account.connection?.needsReauth ? <AlertTriangle size={13} color="#f59e0b" /> : null}
            </View>
            {account.latestBalance ? (
              <Money
                amount={account.latestBalance.amount}
                currency={account.latestBalance.currency}
                className="text-xl font-bold"
              />
            ) : (
              <Text className="text-xl font-bold text-muted-foreground">—</Text>
            )}
            <Text numberOfLines={1} className="text-xs text-muted-foreground">
              {account.connection?.needsReauth ? 'Needs re-authorization' : formatIban(account.iban) || account.connection?.aspspName}
            </Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
