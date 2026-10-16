import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { ListBankAccountFragment } from '@/lib/bank/api/graphql';
import { formatIban } from '@/lib/bank/format';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { AlertTriangle, Plus } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { LinkBankSheet, LinkBankTarget } from './LinkBankSheet';
import { Money } from './Money';

/** What a re-link of an account's connection already knows. */
const relinkOf = (connection: ListBankAccountFragment['connection']): LinkBankTarget => ({
  provider: connection?.bankProvider?.id,
  country: connection?.aspspCountry,
  bank: connection?.aspspName,
});

/**
 * The organization's accounts and their latest balances, side by side, and
 * a card to link another bank. An account whose connection needs
 * re-authorization re-links on a tap.
 */
export function AccountStrip({ accounts }: { accounts: ListBankAccountFragment[] }) {
  const colors = useThemeColors();
  // undefined: closed; null: a new link; a target: a re-link.
  const [linking, setLinking] = React.useState<LinkBankTarget | null | undefined>(undefined);
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
        <View className="flex-row gap-3 px-4 py-3">
          {accounts.map((account) => (
            <Pressable
              key={account.id}
              disabled={!account.connection?.needsReauth}
              onPress={() => setLinking(relinkOf(account.connection))}
            >
              <Card className="min-w-[170px] gap-1 border-border bg-card px-4 py-3">
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
                <Text
                  numberOfLines={1}
                  className={`text-xs ${account.connection?.needsReauth ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {account.connection?.needsReauth
                    ? 'Re-authorize'
                    : formatIban(account.iban) || account.connection?.aspspName}
                </Text>
              </Card>
            </Pressable>
          ))}
          <Pressable onPress={() => setLinking(null)}>
            <Card className="min-w-[120px] flex-1 items-center justify-center gap-1 border-dashed border-border bg-card px-4 py-3">
              <Plus size={18} color={colors.primary} />
              <Text className="text-sm font-medium text-primary">Link bank</Text>
            </Card>
          </Pressable>
        </View>
      </ScrollView>
      <LinkBankSheet
        visible={linking !== undefined}
        target={linking ?? undefined}
        onClose={() => setLinking(undefined)}
      />
    </>
  );
}
