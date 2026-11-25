import * as Crypto from "expo-crypto";
import * as React from "react";
import { assignTask } from "../session/calls";
import { useRekuestSession } from "../session/hooks";

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
 * Assign an action, one implementation of it, or an agent's interface, over
 * the app's caller session. Resolves with the task as soon as the server names
 * it; rejects with why it refused (a `SessionRefusal`, its message a sentence),
 * which the caller shows. Sent while the session is down, it goes out once it
 * is back; re-sent after a drop, it is the same assign.
 */
export const useAssign = () => {
  const session = useRekuestSession();
  const [assigning, setAssigning] = React.useState(0);
  const run = React.useCallback(
    async (target: AssignTarget, args: Record<string, unknown>, reference: string = Crypto.randomUUID()): Promise<Assigned> => {
      setAssigning((count) => count + 1);
      try {
        const answer = await assignTask(session, { ...targetInput(target), args, reference, capture: false, hooks: [] });
        return { id: answer.task, reference: answer.reference };
      } finally {
        setAssigning((count) => count - 1);
      }
    },
    [session],
  );
  return { run, assigning: assigning > 0 };
};
