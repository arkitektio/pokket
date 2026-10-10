import { ActionForm } from '@/components/actions/ActionForm';
import { type ChosenImplementation, RunOnRow } from '@/components/actions/RunOnRow';
import { RekuestUnavailable, TasksLoadingState } from '@/components/tasks/states';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Guard } from '@/lib/app/App';
import { showDetail } from '@/lib/navigation';
import { notEmpty } from '@/lib/ports/kinds';
import { prefill } from '@/lib/ports/prefill';
import type { FormPort } from '@/lib/ports/types';
import { type AssignActionFragment, useAssignActionQuery, useDetailTaskQuery } from '@/lib/rekuest/api/graphql';
import { argsFor, useRememberedArgs } from '@/lib/rekuest/assign/rememberedArgs';
import { objectArgs, parseOn } from '@/lib/rekuest/assign/runOrAsk';
import { useAssign } from '@/lib/rekuest/assign/useAssignAction';
import { useTabTitle } from '@/lib/tabs/TabsProvider';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { useLocalSearchParams } from 'expo-router';
import { Play } from 'lucide-react-native';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

/**
 * The form, once everything it starts from is known. What it starts from, in
 * order of say: the object the run was started on, the task being run again,
 * what this phone last ran it with, the action's last run anywhere.
 */
function Assign({ action, on, taskArgs, remembered, onRemember }: {
  action: AssignActionFragment;
  on: ReturnType<typeof parseOn>;
  taskArgs: unknown;
  remembered: Record<string, unknown> | null;
  onRemember: (args: Record<string, unknown>) => void;
}) {
  const colors = useThemeColors();
  const ports = React.useMemo(() => action.args.filter(notEmpty) as FormPort[], [action.args]);
  const passed = React.useMemo(() => (on ? objectArgs(ports, on) : null), [ports, on]);
  const start = React.useMemo(
    () => prefill(ports, passed, taskArgs, remembered, action.latestTask?.args),
    [ports, passed, taskArgs, remembered, action.latestTask?.args],
  );
  const hidden = React.useMemo(() => Object.keys(passed ?? {}), [passed]);

  const [implementation, setImplementation] = React.useState<ChosenImplementation | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { run, assigning } = useAssign();

  const submit = async (args: Record<string, unknown>) => {
    setError(null);
    try {
      const task = await run({ action: action.id, implementation: implementation?.id }, args);
      onRemember(args);
      // The task's page is live from its first event; that is where a run is followed.
      showDetail(`/tasks/${task.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <ActionForm
      ports={ports}
      groups={action.portGroups}
      start={start}
      hidden={hidden}
      submitLabel={implementation ? `Run on ${implementation.agent.name}` : 'Run'}
      icon={<Play size={16} color={colors.primaryForeground} />}
      busy={assigning}
      error={error}
      onSubmit={submit}
    >
      <RunOnRow hash={action.hash} chosen={implementation} onChange={setImplementation} />
    </ActionForm>
  );
}

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
        <View className="gap-1 pb-4">
          <Text selectable className="text-xl font-semibold text-foreground">
            {action.name}
          </Text>
          {action.description ? <Text className="text-sm text-muted-foreground">{action.description}</Text> : null}
          <Text className="text-xs text-muted-foreground">{action.app.identifier}</Text>
        </View>
        <Card className="border-border bg-card">
          <CardContent className="py-3">
            <Assign
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
