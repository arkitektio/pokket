import { ActionForm } from '@/components/actions/ActionForm';
import { type ChosenImplementation, RunOnRow } from '@/components/actions/RunOnRow';
import { showDetail } from '@/lib/navigation';
import { prefill } from '@/lib/ports/prefill';
import type { FormPort } from '@/lib/ports/types';
import { notEmpty } from '@/lib/ports/kinds';
import type { AssignActionFragment } from '@/lib/rekuest/api/graphql';
import { objectArgs, type parseOn } from '@/lib/rekuest/assign/runOrAsk';
import { useAssign } from '@/lib/rekuest/assign/useAssignAction';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { Play } from 'lucide-react-native';
import * as React from 'react';

/**
 * The form that runs an action, once everything it starts from is known. What
 * it starts from, in order of say: the object the run was started on, the
 * task being run again, what this phone last ran it with, the action's last
 * run anywhere.
 *
 * With an `implementation` it runs there, on that agent (orkestrator's
 * `AssignForm target={{ implementation }}`); without, the viewer may pick one
 * or leave it to the server.
 */
export function AssignForm({
  action,
  on,
  taskArgs,
  remembered,
  onRemember,
  implementation,
}: {
  action: AssignActionFragment;
  on: ReturnType<typeof parseOn>;
  taskArgs: unknown;
  remembered: Record<string, unknown> | null;
  onRemember: (args: Record<string, unknown>) => void;
  implementation?: ChosenImplementation;
}) {
  const colors = useThemeColors();
  const ports = React.useMemo(() => action.args.filter(notEmpty) as FormPort[], [action.args]);
  const passed = React.useMemo(() => (on ? objectArgs(ports, on) : null), [ports, on]);
  const start = React.useMemo(
    () => prefill(ports, passed, taskArgs, remembered, action.latestTask?.args),
    [ports, passed, taskArgs, remembered, action.latestTask?.args],
  );
  const hidden = React.useMemo(() => Object.keys(passed ?? {}), [passed]);

  const [chosen, setChosen] = React.useState<ChosenImplementation | null>(null);
  const target = implementation ?? chosen;
  const [error, setError] = React.useState<string | null>(null);
  const { run, assigning } = useAssign();

  const submit = async (args: Record<string, unknown>) => {
    setError(null);
    try {
      const task = await run({ action: action.id, implementation: target?.id }, args);
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
      submitLabel={target ? `Run on ${target.agent.name}` : 'Run'}
      icon={<Play size={16} color={colors.primaryForeground} />}
      busy={assigning}
      error={error}
      onSubmit={submit}
    >
      {implementation ? null : <RunOnRow hash={action.hash} chosen={chosen} onChange={setChosen} />}
    </ActionForm>
  );
}
