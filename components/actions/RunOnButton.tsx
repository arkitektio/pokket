import { PickerRow, PickerSearch, PickerSheet } from '@/components/bank/PickerSheet';
import { Text } from '@/components/ui/text';
import { App } from '@/lib/app/App';
import { type CallStructure, objectForRoute, structureKindName } from '@/lib/lovekit/call/structures';
import { showDetail } from '@/lib/navigation';
import { type ObjectActionFragment, useActionsForQuery } from '@/lib/rekuest/api/graphql';
import { actionRoute, runOrAsk } from '@/lib/rekuest/assign/runOrAsk';
import { useAssign } from '@/lib/rekuest/assign/useAssignAction';
import { useThemeColors } from '@/lib/theme/BrandProvider';
import { usePathname } from 'expo-router';
import { Play } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { toast } from 'sonner-native';

/** The actions that take this object, to search and pick from. Mounted per showing. */
function Actions({ object, onDone }: { object: CallStructure; onDone: () => void }) {
  const colors = useThemeColors();
  const [term, setTerm] = React.useState('');
  const [search, setSearch] = React.useState('');
  React.useEffect(() => {
    const timeout = setTimeout(() => setSearch(term.trim()), 300);
    return () => clearTimeout(timeout);
  }, [term]);

  const { data, loading, error } = useActionsForQuery({
    variables: { identifier: object.identifier, search: search || undefined },
    fetchPolicy: 'cache-and-network',
  });
  const { run, assigning } = useAssign();

  const pick = async (action: ObjectActionFragment) => {
    const decision = runOrAsk(action.args, object);
    if (decision.kind === 'run') {
      try {
        const task = await run({ action: action.id }, decision.args);
        onDone();
        showDetail(`/tasks/${task.id}`);
      } catch (e) {
        toast.error(`Could not run ${action.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
      return;
    }
    // It takes more than the object (or the object differently): its form sorts that out.
    onDone();
    showDetail(actionRoute(action.id, decision.kind === 'ask' ? { on: object } : undefined));
  };

  const actions = data?.actions ?? [];
  return (
    <>
      <PickerSearch value={term} onChangeText={setTerm} placeholder="Search actions" />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" className="flex-1">
        {actions.map((action) => (
          <PickerRow
            key={action.id}
            leading={<Play size={15} color={colors.primary} />}
            title={action.name}
            detail={action.description ?? (action.args.length > 1 ? 'Asks for more before it runs' : 'Runs at once')}
            disabled={assigning}
            onPress={() => void pick(action)}
          />
        ))}
        {!data && loading ? <ActivityIndicator className="py-6" color={colors.primary} /> : null}
        {error ? <Text className="px-3 py-4 text-sm text-destructive">{error.message}</Text> : null}
        {data && actions.length === 0 ? (
          <Text className="px-3 py-4 text-sm text-muted-foreground">
            {search ? `No action matches “${search}”.` : `No action takes a ${structureKindName(object.identifier).toLowerCase()} yet.`}
          </Text>
        ) : null}
      </ScrollView>
    </>
  );
}

function RunButton({ object }: { object: CallStructure }) {
  const colors = useThemeColors();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Run an action on this"
        className="ml-3 active:opacity-70"
      >
        <Play size={20} color={colors.foreground} />
      </Pressable>
      <PickerSheet visible={open} title={`Run on this ${structureKindName(object.identifier).toLowerCase()}`} onClose={() => setOpen(false)}>
        <Actions object={object} onDone={() => setOpen(false)} />
      </PickerSheet>
    </>
  );
}

/**
 * "Run", in the header of the pages that show an object: orkestrator's Run
 * section of an object's menu. Lists the actions whose first argument is
 * such an object. Nothing on other pages, on an action's own page, or where
 * the organization has no rekuest.
 */
export function RunOnButton() {
  const pathname = usePathname();
  const rekuest = App.usePotentialService('rekuest');
  const object = React.useMemo(() => objectForRoute(pathname), [pathname]);
  if (!object || !rekuest || object.identifier === '@rekuest/action') return null;
  return <RunButton object={object} />;
}
