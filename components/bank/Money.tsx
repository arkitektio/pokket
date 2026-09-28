import { Text } from '@/components/ui/text';
import { formatMoney, toNumber } from '@/lib/bank/format';

/**
 * An amount in its currency. Signed amounts show their sign, and money in is
 * green; money out stays the foreground colour, so a statement does not read
 * as a wall of red (as orkestrator's `Money`).
 */
export function Money({
  amount,
  currency,
  signed = false,
  className = '',
}: {
  amount: string | number | null | undefined;
  currency: string;
  signed?: boolean;
  className?: string;
}) {
  const positive = toNumber(amount) > 0;
  return (
    <Text
      style={{ fontVariant: ['tabular-nums'] }}
      className={`${signed && positive ? 'text-emerald-500' : 'text-foreground'} ${className}`}
    >
      {formatMoney(amount, currency, { signed })}
    </Text>
  );
}
