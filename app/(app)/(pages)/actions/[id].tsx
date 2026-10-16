import { ActionLogo } from '@/components/actions/ActionLogo';
import { AssignForm } from '@/components/actions/AssignForm';
import { RekuestUnavailable, TasksLoadingState } from '@/components/tasks/states';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { useAssignActionQuery, useDetailTaskQuery } from '@/lib/rekuest/api/graphql';
import { argsFor, useRememberedArgs } from '@/lib/rekuest/assign/rememberedArgs';
import { parseOn } from '@/lib/rekuest/assign/runOrAsk';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

function ActionContent({ id }: { id: string }) {
  const params = useLocalSearchParams<{ on?: string; task?: string }>();
  const on = React.useMemo(() => parseOn(params.on), [params.on]);
  const { data, loading, error } = useAssignActionQuery({ variables: { id }, fetchPolicy: 'cache-and-network' });
  const task = useDetailTaskQuery({ variables: { id: params.task ?? '' }, skip: !params.task, fetchPolicy: 'cache-first' });
  const { all, remember } = useRememberedArgs();
  const action = data?.action;
  useTabTitle(action?.name);

  // The form starts once: what it starts from must all be there first.
  const waiting = !action || all === null || (!!params.task && !task.data && task.loading);
  if (waiting) {
    if (loading || all === null || task.loading) return <TasksLoadingState message="Loading action…" />;
    return <Text className="p-4 text-sm text-destructive">{error?.message ?? 'This action was not found.'}</Text>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96} className="flex-1">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View className="flex-row items-start gap-3 pb-4">
          <ActionLogo action={action} className="h-12 w-12" />
          <View className="flex-1 gap-1">
            <Text selectable className="text-xl font-semibold text-foreground">
              {action.name}
            </Text>
            {action.description ? <Text className="text-sm text-muted-foreground">{action.description}</Text> : null}
            <Text className="text-xs text-muted-foreground">{action.app.identifier}</Text>
          </View>
        </View>
        <Card className="border-border bg-card">
          <CardContent className="py-3">
            <AssignForm
              action={action}
              on={on}
              taskArgs={task.data?.task.args}
              remembered={argsFor(all, action.id)}
              onRemember={(args) => remember(action.id, args)}
            />
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** An action and the form that runs it: orkestrator's `ActionAssignForm`, as a page. */
export default function ActionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 bg-background">
      <Guard.Lok connectingFallback={<TasksLoadingState message="Connecting…" />}>
        <Guard.Rekuest fallback={<RekuestUnavailable />}>
          <ActionContent key={id} id={id} />
        </Guard.Rekuest>
      </Guard.Lok>
    </View>
  );
}
