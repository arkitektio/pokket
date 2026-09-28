import { AccountStrip } from '@/components/bank/AccountStrip';
import { BankEmptyState, BankLoadingState, BankUnavailable } from '@/components/bank/states';
import { TransactionRow } from '@/components/bank/TransactionRow';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { useListBankAccountsQuery, useListTransactionsQuery } from '@/lib/bank/api/graphql';
import { useAccountSyncs } from '@/lib/bank/useAccountSyncs';
import { TRANSACTION_VIEWS, TransactionView } from '@/lib/bank/views';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import * as React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';

const PAGE = 30;
/** The top lists are a ranking, not a statement: one page of them. */
const TOP = 20;

/** The one `accountSyncs` subscription; the detail screen is pushed on top of this one. */
function AccountSyncs() {
  useAccountSyncs();
  return null;
}

function ViewChips({ active, onSelect }: { active: TransactionView['key']; onSelect: (key: TransactionView['key']) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
      <View className="flex-row gap-2 px-4 pb-2">
        {TRANSACTION_VIEWS.map((view) => {
          const selected = view.key === active;
          return (
            <Pressable
              key={view.key}
              onPress={() => onSelect(view.key)}
              className={`rounded-full border px-4 py-1.5 ${selected ? 'border-primary bg-primary' : 'border-border bg-card'}`}
            >
              <Text className={`text-sm font-medium ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>
                {view.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function BankContent() {
  const colors = useThemeColors();
  // The view and any filter are in the URL: the sidebar's links, search hits
  // (an account, a merchant, a category) and the tab all land here.
  const params = useLocalSearchParams<{
    view?: string;
    account?: string;
    merchant?: string;
    category?: string;
    filterLabel?: string;
  }>();
  const active = (TRANSACTION_VIEWS.find((v) => v.key === params.view)?.key ?? 'recent') as TransactionView['key'];
  const setActive = (key: TransactionView['key']) => router.setParams({ view: key === 'recent' ? undefined : key });
  const view = TRANSACTION_VIEWS.find((v) => v.key === active) ?? TRANSACTION_VIEWS[0];
  const ranked = view.key !== 'recent';
  const scope = params.account
    ? { kind: 'Account', filters: { accounts: [params.account] } }
    : params.merchant
      ? { kind: 'Merchant', filters: { merchants: [params.merchant] } }
      : params.category
        ? { kind: 'Category', filters: { categories: [params.category], includeChildCategories: true } }
        : null;
  const variables = React.useMemo(() => {
    const base = view.variables();
    return scope ? { ...base, filters: { ...base.filters, ...scope.filters } } : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, params.account, params.merchant, params.category]);
  const clearScope = () =>
    router.setParams({ account: undefined, merchant: undefined, category: undefined, filterLabel: undefined });
  useTabTitle(
    scope && params.filterLabel ? params.filterLabel : view.key === 'recent' ? 'Bank' : `Bank · ${view.label}`,
  );

  const accounts = useListBankAccountsQuery({ fetchPolicy: 'cache-and-network' });
  const { data, loading, error, refetch, fetchMore } = useListTransactionsQuery({
    variables: { ...variables, pagination: { limit: ranked ? TOP : PAGE, offset: 0 } },
    fetchPolicy: 'cache-and-network',
  });
  const transactions = data?.transactions ?? [];

  const [refreshing, setRefreshing] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [exhausted, setExhausted] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), accounts.refetch()]);
      setExhausted(false);
    } finally {
      setRefreshing(false);
    }
  };

  const onEndReached = async () => {
    if (ranked || exhausted || loadingMore || loading || transactions.length < PAGE) return;
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: { pagination: { limit: PAGE, offset: transactions.length } },
        updateQuery: (prev, { fetchMoreResult }) => {
          const known = new Set(prev.transactions.map((t) => t.id));
          return {
            ...prev,
            transactions: [...prev.transactions, ...fetchMoreResult.transactions.filter((t) => !known.has(t.id))],
          };
        },
      });
      if (result.data.transactions.length < PAGE) setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const select = (key: TransactionView['key']) => {
    setExhausted(false);
    setActive(key);
  };

  return (
    <FlatList
      data={transactions}
      keyExtractor={(t) => t.id}
      renderItem={({ item, index }) => <TransactionRow transaction={item} rank={ranked ? index + 1 : undefined} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <View className="border-b border-border">
          <AccountStrip accounts={accounts.data?.bankAccounts ?? []} />
          <ViewChips active={active} onSelect={select} />
          {scope ? (
            <View className="flex-row px-4 pb-2">
              <Pressable
                onPress={clearScope}
                className="flex-row items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 active:opacity-70"
              >
                <Text className="text-xs text-foreground">
                  {scope.kind}: {params.filterLabel ?? '…'}
                </Text>
                <X size={12} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ) : null}
          {ranked ? (
            <Text className="px-4 pb-2 text-xs text-muted-foreground">This month, largest first · transfers left out</Text>
          ) : null}
          {error ? (
            <Text className="px-4 pb-2 text-sm text-destructive">Could not load transactions: {error.message}</Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <BankLoadingState message="Loading transactions…" />
        ) : (
          <BankEmptyState title={view.empty.title} description={view.empty.description} />
        )
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" color={colors.primary} /> : null}
    />
  );
}

export default function BankScreen() {
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<BankLoadingState message="Connecting…" />}>
        <Guard.Bank fallback={<BankUnavailable />}>
          <AccountSyncs />
          <BankContent />
        </Guard.Bank>
      </Guard.Lok>
    </View>
  );
}
