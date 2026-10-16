import { AuthFlow } from '@/components/authflow/AuthFlowPanel';
import { PickerSheet } from '@/components/bank/PickerSheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { sessionOf } from '@/lib/authflow/contract';
import { MailPresetFragment, Provider, useMailPresetsQuery, useStartOAuthLinkMutation } from '@/lib/kuvert/api/graphql';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import * as React from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';

const PROVIDER_LABEL: Record<Provider, string> = {
  [Provider.Gmail]: 'Google',
  [Provider.Microsoft]: 'Microsoft',
  [Provider.Generic]: 'your provider',
};

const looksLikeAddress = (text: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text);

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  email,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  email?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View className="gap-1">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={email ? 'email-address' : 'default'}
        autoComplete={email ? 'email' : 'off'}
        style={{ color: colors.foreground }}
        className="rounded-xl border border-border bg-background px-3 py-3 text-base"
      />
    </View>
  );
}

function OAuthStep({
  preset,
  address,
  name,
  onClose,
  onBack,
}: {
  preset: MailPresetFragment;
  address: string;
  name: string;
  onClose: () => void;
  onBack: () => void;
}) {
  const [start] = useStartOAuthLinkMutation();
  const open = React.useCallback(async () => {
    const { data } = await start({
      variables: { input: { provider: preset.provider, loginHint: address || null, name: name || null } },
    });
    return data ? sessionOf(data.startOAuthLink) : null;
  }, [start, preset.provider, address, name]);
  return <AuthFlow flow="kuvert" title={address || preset.name} open={open} restart={onBack} onDone={onClose} />;
}

function LinkMailbox({ onClose }: { onClose: () => void }) {
  const colors = useThemeColors();
  const [address, setAddress] = React.useState('');
  const [name, setName] = React.useState('');
  const [signingIn, setSigningIn] = React.useState(false);
  const query = useDebounced(address.trim(), 400);
  const valid = looksLikeAddress(query);
  const { data, loading } = useMailPresetsQuery({ variables: { address: query }, skip: !valid });
  const preset = valid ? data?.mailPresets[0] : undefined;
  const oauth = !!preset?.oauth && preset.oauthConfigured;

  if (signingIn && preset && oauth) {
    return (
      <OAuthStep preset={preset} address={query} name={name} onClose={onClose} onBack={() => setSigningIn(false)} />
    );
  }

  return (
    <View className="gap-4 px-3">
      <Field label="Email address" value={address} onChangeText={setAddress} placeholder="jane@example.org" email />
      {valid && loading ? <ActivityIndicator color={colors.primary} /> : null}
      {preset && oauth ? (
        <>
          <Field label="Name (optional)" value={name} onChangeText={setName} placeholder={query} />
          <Button onPress={() => setSigningIn(true)}>
            <Text>Sign in with {PROVIDER_LABEL[preset.provider]}</Text>
          </Button>
          {preset.note ? <Text className="text-xs text-muted-foreground">{preset.note}</Text> : null}
        </>
      ) : null}
      {preset && !oauth ? (
        <Text className="text-sm text-muted-foreground">
          {preset.oauth
            ? `Sign-in with ${PROVIDER_LABEL[preset.provider]} is not set up on this server yet. `
            : `${preset.name} signs in with a password. `}
          Add this mailbox in Orkestrator on the desktop.
        </Text>
      ) : null}
      {valid && !loading && !preset ? (
        <Text className="text-sm text-muted-foreground">
          This mailbox signs in with a password. Add it in Orkestrator on the desktop.
        </Text>
      ) : null}
    </View>
  );
}

/** Add a mailbox by signing in at Google or Microsoft. Password mailboxes are added on the desktop. */
export function LinkMailboxSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <PickerSheet visible={visible} title="Add a mailbox" onClose={onClose}>
      <LinkMailbox onClose={onClose} />
    </PickerSheet>
  );
}
