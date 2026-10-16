import { AuthFlow } from '@/components/authflow/AuthFlowPanel';
import { Text } from '@/components/ui/text';
import { sessionOf } from '@/lib/authflow/contract';
import {
  ListBankProviderFragment,
  useBankInstitutionsQuery,
  useListBankProvidersQuery,
  useStartLinkMutation,
} from '@/lib/bank/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Image } from 'expo-image';
import { Landmark } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { PickerRow, PickerSearch, PickerSheet } from './PickerSheet';

/** What a re-link already knows: the provider, and for Enable Banking the bank. */
export type LinkBankTarget = { provider?: string | null; country?: string | null; bank?: string | null };

function ProviderStep({
  providers,
  loading,
  onPick,
}: {
  providers: ListBankProviderFragment[];
  loading: boolean;
  onPick: (provider: ListBankProviderFragment) => void;
}) {
  const colors = useThemeColors();
  if (loading && providers.length === 0) return <ActivityIndicator className="py-6" color={colors.primary} />;
  if (providers.length === 0) {
    return (
      <Text className="px-3 text-sm text-muted-foreground">
        No bank provider is set up for this organization yet. An admin adds one in Orkestrator on the desktop.
      </Text>
    );
  }
  return (
    <FlatList
      data={providers}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <PickerRow
          leading={<Landmark size={18} color={colors.mutedForeground} />}
          title={item.name}
          detail={item.kindInfo.description}
          onPress={() => onPick(item)}
        />
      )}
    />
  );
}

function BankStep({
  provider,
  initialCountry,
  onPick,
}: {
  provider: ListBankProviderFragment;
  initialCountry?: string | null;
  onPick: (bank: string, country: string) => void;
}) {
  const colors = useThemeColors();
  const [country, setCountry] = React.useState((initialCountry ?? 'AT').toUpperCase());
  const [search, setSearch] = React.useState('');
  const valid = /^[A-Z]{2}$/.test(country);
  const { data, loading, error } = useBankInstitutionsQuery({
    variables: { provider: provider.id, country },
    skip: !valid,
    fetchPolicy: 'cache-first',
  });
  const needle = search.trim().toLowerCase();
  const banks = (data?.bankInstitutions ?? []).filter((b) => !needle || b.name.toLowerCase().includes(needle));

  return (
    <View className="flex-1 gap-2">
      <View className="flex-row items-center gap-2 px-1">
        <Text className="text-sm text-muted-foreground">Country</Text>
        <TextInput
          value={country}
          onChangeText={(text) => setCountry(text.toUpperCase().slice(0, 2))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={2}
          style={{ color: colors.foreground }}
          className="w-16 rounded-xl border border-border bg-background px-3 py-2 text-center text-base"
        />
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>
      <PickerSearch value={search} onChangeText={setSearch} placeholder="Search banks" />
      {error ? <Text className="px-3 text-sm text-destructive">{error.message}</Text> : null}
      <FlatList
        data={banks}
        keyExtractor={(b) => `${b.country}:${b.name}`}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <PickerRow
            leading={
              item.logo ? (
                <Image source={{ uri: item.logo }} style={{ width: 24, height: 24 }} contentFit="contain" />
              ) : (
                <Landmark size={18} color={colors.mutedForeground} />
              )
            }
            title={item.name}
            detail={item.maximumConsentDays ? `Access for up to ${item.maximumConsentDays} days` : item.bic}
            onPress={() => onPick(item.name, item.country)}
          />
        )}
        ListEmptyComponent={
          valid && !loading ? (
            <Text className="px-3 py-4 text-sm text-muted-foreground">No bank by that name in {country}.</Text>
          ) : null
        }
      />
    </View>
  );
}

function LinkBank({ target, onClose }: { target?: LinkBankTarget; onClose: () => void }) {
  const { data, loading } = useListBankProvidersQuery({
    variables: { filters: { enabled: true } },
    fetchPolicy: 'cache-and-network',
  });
  const providers = data?.bankProviders ?? [];
  const [picked, setPicked] = React.useState<string | null>(target?.provider ?? null);
  const [bank, setBank] = React.useState<{ name: string; country: string } | null>(
    target?.bank && target.country ? { name: target.bank, country: target.country } : null,
  );
  const [round, setRound] = React.useState(0);
  const [startLink] = useStartLinkMutation();

  // One provider is no choice.
  const provider = providers.find((p) => p.id === picked) ?? (providers.length === 1 ? providers[0] : undefined);
  const withBank = !!provider?.kindInfo.hasInstitutions;

  const open = React.useCallback(async () => {
    if (!provider) return null;
    const { data } = await startLink({
      variables: {
        input: { provider: provider.id, ...(withBank && bank ? { institution: bank.name, country: bank.country } : {}) },
      },
    });
    return data ? sessionOf(data.startLink) : null;
  }, [startLink, provider, withBank, bank]);

  if (!provider) {
    return <ProviderStep providers={providers} loading={loading} onPick={(p) => setPicked(p.id)} />;
  }
  if (withBank && !bank) {
    return (
      <View className="flex-1 gap-2">
        {providers.length > 1 ? (
          <Pressable className="self-start px-3" onPress={() => setPicked(null)}>
            <Text className="text-xs text-primary">{provider.name} · change</Text>
          </Pressable>
        ) : null}
        <BankStep
          provider={provider}
          initialCountry={target?.country}
          onPick={(name, country) => setBank({ name, country })}
        />
      </View>
    );
  }
  return (
    <AuthFlow
      key={round}
      flow="bank"
      title={bank?.name ?? provider.name}
      open={open}
      restart={() => (withBank ? setBank(null) : setRound((n) => n + 1))}
      onDone={onClose}
      header={
        withBank ? (
          <Pressable onPress={() => setBank(null)}>
            <Text className="text-xs text-primary">Pick another bank</Text>
          </Pressable>
        ) : (
          <Text className="text-xs text-muted-foreground">{provider.kindInfo.description}</Text>
        )
      }
    />
  );
}

/**
 * Link a bank: pick the provider (when there is a choice), the bank (for a
 * provider with institutions), then log in at the bank. A re-link names
 * what it already knows and goes straight to the login.
 */
export function LinkBankSheet({
  visible,
  target,
  onClose,
}: {
  visible: boolean;
  target?: LinkBankTarget;
  onClose: () => void;
}) {
  return (
    <PickerSheet visible={visible} title={target ? 'Re-link bank' : 'Link a bank'} onClose={onClose}>
      <LinkBank target={target} onClose={onClose} />
    </PickerSheet>
  );
}
