import { ActionLogo } from '@/components/actions/ActionLogo';
import { AssignForm } from '@/components/actions/AssignForm';
import { RecentTasks } from '@/components/tasks/RecentTasks';
import { RekuestUnavailable, TasksLoadingState } from '@/components/tasks/states';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { agentRoute } from '@/lib/rekuest/agents/routes';
import { useDetailImplementationQuery } from '@/lib/rekuest/api/graphql';
import { argsFor, useRememberedArgs } from '@/lib/rekuest/assign/rememberedArgs';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { type Href, Link, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

function ImplementationContent({ id }: { id: string }) {
  const { data, loading, error } = useDetailImplementationQuery({ variables: { id }, fetchPolicy: 'cache-and-network' });
  const { all, remember } = useRememberedArgs();
  const implementation = data?.implementation;
  useTabTitle(implementation?.action.name);

  // The form starts once: what it starts from must all be there first.
  if (!implementation || all === null) {
    if (loading || all === null) return <TasksLoadingState message="Loading action…" />;
    return <Text className="p-4 text-sm text-destructive">{error?.message ?? 'This implementation was not found.'}</Text>;
  }

  const { action, agent } = implementation;
  const tone = agent.blocked ? 'text-destructive' : agent.connected ? 'text-primary' : 'text-muted-foreground';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96} className="flex-1">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View className="flex-row items-start gap-3">
          <ActionLogo action={action} className="h-12 w-12" />
          <View className="flex-1 gap-1">
            <Text selectable className="text-xl font-semibold text-foreground">
              {action.name}
            </Text>
            {action.description ? <Text className="text-sm text-muted-foreground">{action.description}</Text> : null}
            <View className="flex-row flex-wrap items-center gap-x-2">
              <View className={`h-2 w-2 rounded-full ${agent.blocked ? 'bg-destructive' : agent.connected ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
              <Link href={agentRoute(agent.id) as Href} asChild>
                <Pressable hitSlop={8}>
                  <Text className={`text-sm font-medium ${tone}`}>{agent.name}</Text>
                </Pressable>
              </Link>
              <Text selectable className="font-mono text-xs text-muted-foreground">
                {implementation.interface}
              </Text>
            </View>
            {!agent.connected ? (
              <Text className="text-xs text-muted-foreground">
                {agent.blocked ? 'This agent is blocked.' : 'This agent is offline right now.'}
              </Text>
            ) : null}
          </View>
        </View>

        <Card className="border-border bg-card">
          <CardContent className="py-3">
            <AssignForm
              action={action}
              on={null}
              taskArgs={undefined}
              remembered={argsFor(all, action.id)}
              onRemember={(args) => remember(action.id, args)}
              implementation={{ id: implementation.id, interface: implementation.interface, agent }}
            />
          </CardContent>
        </Card>

        <RecentTasks filter={{ implementation: implementation.id }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * One agent's implementation of an action, and the form that runs it on that
 * agent: orkestrator's `ImplementationPage`.
 */
export default function ImplementationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<TasksLoadingState message="Connecting…" />}>
        <Guard.Rekuest fallback={<RekuestUnavailable />}>
          <ImplementationContent key={id} id={id} />
        </Guard.Rekuest>
      </Guard.Lok>
    </View>
  );
}
