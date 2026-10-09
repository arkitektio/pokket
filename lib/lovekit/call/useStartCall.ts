import { useEnsureCallMutation } from "@/lib/lovekit/api/graphql";
import { showDetail } from "@/lib/navigation";
import { useCallback, useState } from "react";

import { callRoute, callTitle } from "./links";
import { callStore } from "./store";
import { toStructureInputs } from "./structureInput";
import { useJoinCall } from "./useJoinCall";

export type CallableStructure = { identifier: string; id: string | number; label?: string };

/**
 * "Call about this" — orkestrator's `useStartCall`: finds the live call
 * about these structures or starts one, then lands on its page, joining.
 * Lovekit finds before it creates, so a second tap, or a colleague's on the
 * same object, ends up in the same call.
 *
 * Joined here and not through `?join=1`: this is a tap, so it may ask for
 * the microphone, which an arrival by link never does.
 */
export const useStartCall = () => {
  const [ensureCall] = useEnsureCallMutation();
  const { join } = useJoinCall();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (structures: readonly CallableStructure[], title?: string) => {
      const about = toStructureInputs(structures);
      if (about.length === 0) {
        setError("This cannot be called about");
        return;
      }
      setStarting(true);
      setError(null);
      try {
        const result = await ensureCall({
          variables: { input: { about, title: title ?? callTitle(structures) } },
        });
        const call = result.data?.ensureCall;
        if (!call) throw new Error("No call came back");
        showDetail(callRoute(call.id));
        if (callStore.getState().call?.id !== call.id) await join({ id: call.id, title: call.title });
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Could not start the call");
      } finally {
        setStarting(false);
      }
    },
    [ensureCall, join],
  );

  return { start, starting, error };
};
