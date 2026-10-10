import * as Crypto from "expo-crypto";
import * as React from "react";
import { useAssignMutation } from "../api/graphql";

export type Assigned = { id: string; reference?: string | null };

/**
 * Assign an action, or one implementation of it. Resolves with the task, or
 * rejects with why the server refused: the generated hook already toasts
 * errors, so a refusal comes back without data, not as a throw.
 */
export const useAssign = () => {
  const [assign, { loading }] = useAssignMutation();
  const run = React.useCallback(
    async (target: { action: string; implementation?: string | null }, args: Record<string, unknown>): Promise<Assigned> => {
      const result = await assign({
        variables: {
          input: {
            // One or the other: naming an implementation is how an agent is chosen.
            ...(target.implementation ? { implementation: target.implementation } : { action: target.action }),
            args,
            reference: Crypto.randomUUID(),
            capture: false,
          },
        },
      });
      const task = result.data?.assign;
      if (!task) throw new Error(result.errors?.[0]?.message ?? "The action was not assigned.");
      return task;
    },
    [assign],
  );
  return { run, assigning: loading };
};
