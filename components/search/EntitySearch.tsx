import { formatMailDate } from '@/components/mail/format';
import { Guard } from '@/lib/app/App';
import { useBankPaletteSearchQuery } from '@/lib/bank/api/graphql';
import { formatDay, formatIban, formatMoney } from '@/lib/bank/format';
import { useKuvertPaletteSearchQuery } from '@/lib/kuvert/api/graphql';
import { ActivityIndicator, View } from 'react-native';
import { CreditCard, Mail, Receipt, Store, Tag } from 'lucide-react-native';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { SearchItem, SearchRow, SearchSectionHeader } from './SearchRow';

/** A few rows per kind, as orkestrator's palette (`PER_TYPE_LIMIT`). */
const PER_TYPE_LIMIT = 5;

export type EntityPick = {
  identifier: string;
  id: string;
  label: string;
  description?: string;
  route: string;
};

type Props = { term: string; onPick: (pick: EntityPick) => void };

const toItem = (pick: EntityPick, icon: SearchItem['icon'], onPick: Props['onPick']): SearchItem => ({
  key: `entity:${pick.identifier}:${pick.id}`,
  title: pick.label,
  description: pick.description,
  icon,
  onSelect: () => onPick(pick),
});

function Group({ title, items, loading }: { title: string; items: SearchItem[]; loading: boolean }) {
  const colors = useThemeColors();
  if (items.length === 0 && !loading) return null;
  return (
    <View>
      <SearchSectionHeader title={title} />
      {items.length === 0 ? (
        <ActivityIndicator className="py-3" color={colors.mutedForeground} />
      ) : (
        items.map((item) => <SearchRow key={item.key} item={item} />)
      )}
    </View>
  );
}

/** Mail hits: messages by substring and meaning, opened as their conversation. */
function MailHits({ term, onPick }: Props) {
  const { data, loading } = useKuvertPaletteSearchQuery({
    variables: { search: term, limit: PER_TYPE_LIMIT },
    fetchPolicy: 'cache-first',
  });
  // A message opens as its conversation; one without a thread has nowhere to go.
  const items = (data?.messages ?? []).flatMap((m) =>
    !m.thread ? [] : toItem(
      {
        identifier: '@kuvert/message',
        id: m.id,
        label: m.subject || '(no subject)',
        description: [m.senderName || m.senderAddress, formatMailDate(m.date)].filter(Boolean).join(' · '),
        route: `/mail/thread/${m.thread.id}`,
      },
      Mail,
      onPick,
    ),
  );
  return <Group title="Mail" items={items} loading={loading} />;
}

/** Finance hits, in orkestrator's order: transactions, accounts, merchants, categories. */
function BankHits({ term, onPick }: Props) {
  const { data, loading } = useBankPaletteSearchQuery({
    variables: { search: term, limit: PER_TYPE_LIMIT },
    fetchPolicy: 'cache-first',
  });
  const filtered = (key: string, id: string, label: string) =>
    `/bank?${key}=${encodeURIComponent(id)}&filterLabel=${encodeURIComponent(label)}`;
  const items: SearchItem[] = [
    ...(data?.transactions ?? []).map((t) =>
      toItem(
        {
          identifier: '@bank/transaction',
          id: t.id,
          label: t.counterparty || t.remittance || 'Transaction',
          description: [formatMoney(t.amount, t.currency, { signed: true }), formatDay(t.bookingDate)].join(' · '),
          route: `/bank/transaction/${t.id}`,
        },
        Receipt,
        onPick,
      ),
    ),
    ...(data?.bankAccounts ?? []).map((a) => {
      const label = a.name || formatIban(a.iban) || 'Account';
      return toItem(
        {
          identifier: '@bank/account',
          id: a.id,
          label,
          description: a.iban ? formatIban(a.iban) : a.currency,
          route: filtered('account', a.id, label),
        },
        CreditCard,
        onPick,
      );
    }),
    ...(data?.merchants ?? []).map((m) =>
      toItem(
        {
          identifier: '@bank/merchant',
          id: m.id,
          label: m.name,
          description: m.description || 'Merchant',
          route: filtered('merchant', m.id, m.name),
        },
        Store,
        onPick,
      ),
    ),
    ...(data?.categories ?? []).map((c) =>
      toItem(
        {
          identifier: '@bank/category',
          id: c.id,
          label: c.name,
          description: c.description || 'Category',
          route: filtered('category', c.id, c.name),
        },
        Tag,
        onPick,
      ),
    ),
  ];
  return <Group title="Finances" items={items} loading={loading} />;
}

/**
 * The server-side searches — orkestrator's `ApplicableEntitySearch`: each
 * inside its service's guard, so no query runs without its client, and the
 * lot after every synchronous group, so late answers never move the rows
 * under the thumb.
 */
export function EntitySearch(props: Props) {
  return (
    <View>
      <Guard.Kuvert>
        <MailHits {...props} />
      </Guard.Kuvert>
      <Guard.Bank>
        <BankHits {...props} />
      </Guard.Bank>
    </View>
  );
}
