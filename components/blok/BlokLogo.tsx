import BlokRenderer from '@/components/blok/BlokRenderer';
import { LogoActiveContext } from '@/components/blok/catalog/logo';
import { BlokNodeErrorSurface, normalizeBlokComponentTree, useBlokRuntime, type BlokTaskRecord } from '@/lib/ports/blok/runtime';
import { type BlokLogoFragment, useLogoBlokQuery } from '@/lib/rekuest/api/graphql';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { View } from 'react-native';

/** Where an action logo reads its task: `@task`, null until the action is run. */
export const LOGO_TASK_ROOT = 'task';

/** Logos never act. */
const REFUSE_EVERY_ACTION = () => true;

/** In a box this small, a node that fails is left out rather than carded. */
const NoNodeError = () => null;

/**
 * A logo blok (context LOGO or ACTION_LOGO), drawn in a box sized by
 * `className`: an agent's, an action's. After orkestrator's `BlokLogo` and
 * `ActionLogo`. No blok draws nothing, so callers keep their own fallback.
 *
 * Without a `record` it shows its demo state. With one, `@task` is that
 * record, and while it runs the logo plays its animations (orkestrator's
 * `data-logo-active`; the phone has no hover to play them on).
 *
 * Orkestrator keeps each first drawing as SVG markup so a list renders no
 * bloks; React Native has no markup to keep, so the tree is fetched once per
 * blok into Apollo's cache and drawn from there.
 */
export function BlokLogo({
  blok,
  record,
  className,
}: {
  blok?: BlokLogoFragment | null;
  record?: BlokTaskRecord | null;
  className?: string;
}) {
  if (!blok) return null;
  return <LogoDrawing blokId={blok.id} record={record ?? null} className={className} />;
}

function LogoDrawing({ blokId, record, className }: { blokId: string; record: BlokTaskRecord | null; className?: string }) {
  // A logo whose blok changes while the app runs keeps its first tree until the cache is reset.
  const { data } = useLogoBlokQuery({ variables: { id: blokId }, fetchPolicy: 'cache-first' });
  const blok = data?.blok;
  const roots = React.useMemo(
    () => normalizeBlokComponentTree((blok?.componentTree as unknown[] | null) ?? null).roots,
    [blok?.componentTree],
  );
  const initialState = React.useMemo(
    () => ({
      ...((blok?.demoState as Record<string, unknown> | null) ?? {}),
      ...(record ? { [LOGO_TASK_ROOT]: record } : {}),
    }),
    // The record changes with every progress report; the sync below writes it, so the state is seeded once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blok?.demoState],
  );

  return (
    <View className={cn('shrink-0 items-center justify-center overflow-hidden', className)}>
      {blok && roots.length > 0 && (
        <LogoActiveContext.Provider value={Boolean(record?.running)}>
          <BlokNodeErrorSurface.Provider value={NoNodeError}>
            <BlokRenderer uiComponents={roots} initialState={initialState} chrome="none" refuseAction={REFUSE_EVERY_ACTION}>
              {record && <LogoTaskSync record={record} />}
            </BlokRenderer>
          </BlokNodeErrorSurface.Provider>
        </LogoActiveContext.Provider>
      )}
    </View>
  );
}

/** Keeps `@task` on the latest record. */
function LogoTaskSync({ record }: { record: BlokTaskRecord }) {
  const setRuntimeValue = useBlokRuntime((state) => state.setRuntimeValue);
  React.useEffect(() => {
    setRuntimeValue(LOGO_TASK_ROOT, record);
  }, [record, setRuntimeValue]);
  return null;
}
