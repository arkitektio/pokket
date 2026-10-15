import * as Crypto from "expo-crypto";
import * as React from "react";
import { useAssignMutation } from "../api/graphql";

export type Assigned = { id: string; reference?: string | null };

/**
 * What to run: an action (any agent), one implementation of it, or an
 * interface of one agent — how a blok calls the agent it is bound to.
 */
export type AssignTarget =
  | { action: string; implementation?: string | null }
  | { agent: string; interface: string };

const targetInput = (target: AssignTarget) => {
  if ("agent" in target) return { agent: target.agent, interface: target.interface };
  // One or the other: naming an implementation is how an agent is chosen.
  return target.implementation ? { implementation: target.implementation } : { action: target.action };
};

/**
 * Assign an action, one implementation of it, or an agent's interface. Resolves with the task, or
 * rejects with why the server refused: the generated hook already toasts
 * errors, so a refusal comes back without data, not as a throw.
 */
export const useAssign = () => {
  const [assign, { loading }] = useAssignMutation();
  const run = React.useCallback(
    async (target: AssignTarget, args: Record<string, unknown>, reference: string = Crypto.randomUUID()): Promise<Assigned> => {
      const result = await assign({
        variables: {
          input: {
            ...targetInput(target),
            args,
            reference,
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
