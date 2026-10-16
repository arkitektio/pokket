import { useActiveProfileId } from "@/lib/arkitekt/hooks";
import { isProvisionalProfileId } from "@/lib/arkitekt/fakts/profileStorageSchema";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";
import { openPoll, openRedirect } from "./browser";
import { awaitCallback, completionOf } from "./inflight";
import { forgetPending, rememberPending } from "./pending";
import { AUTH_FLOWS, useServiceClient } from "./registry";
import type { AuthSession } from "./types";
import { AuthDriver, useAuthSession } from "./useAuthSession";

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong";

/**
 * One login through `flow`'s service (`AUTH_FLOWS`), from a sheet. `begin`
 * obtains the session with `open` (the service's own start or resume
 * mutation), remembers it for the callback page and sends the user to the
 * provider: the system's auth session for a REDIRECT, which hands the
 * redirect straight back here, or an in-app browser for a POLL. `onDone`
 * fires once, when the login is DONE, however it got there.
 */
export const useAuthFlow = ({
  flow,
  open,
  onDone,
}: {
  flow: string;
  open: () => Promise<AuthSession | null | undefined>;
  onDone?: (session: AuthSession) => void;
}) => {
  const handler = AUTH_FLOWS[flow];
  const client = useServiceClient(handler?.service);
  const clientRef = useRef(client);
  useEffect(() => {
    clientRef.current = client;
  }, [client]);
  const profile = useActiveProfileId();

  const driver = useMemo((): AuthDriver => {
    const resolved = () => {
      if (!handler) throw new Error(`Nothing here handles ${flow} logins`);
      if (!clientRef.current) throw new Error(`${handler.service} is not available`);
      return { handler, client: clientRef.current };
    };
    return {
      complete: async (input) => {
        const { handler, client } = resolved();
        return handler.complete(client, input);
      },
      read: async (session) => {
        const { handler, client } = resolved();
        return (await handler.read?.(client, session)) ?? null;
      },
      cancel: async (session) => {
        const { handler, client } = resolved();
        await handler.cancel?.(client, session);
      },
    };
  }, [flow, handler]);

  const auth = useAuthSession({ open, driver });
  const finishWith = auth.completeRedirect;

  const send = useCallback(
    async (session: AuthSession) => {
      if (session.finish === "POLL") {
        await openPoll(session.openUrl);
        return;
      }
      const url = await openRedirect(session.openUrl, flow);
      // Closed without coming back: the sheet offers to open it again, or a paste.
      const completion = url ? completionOf(url) : null;
      if (completion) await finishWith(completion);
    },
    [flow, finishWith],
  );

  const start = auth.begin;
  const begin = useCallback(async () => {
    const session = await start();
    if (!session) return null;
    await rememberPending(session.state, {
      namespace: flow,
      profile: profile && !isProvisionalProfileId(profile) ? profile : null,
      expiresAt: new Date(session.expiresAt).getTime(),
    });
    void send(session).catch(() => undefined);
    return session;
  }, [start, flow, profile, send]);

  const session = auth.session;
  const kind = auth.phase?.kind;
  const state = session?.state;
  const redirecting = session?.finish === "REDIRECT" && (kind === "approve" || kind === "step");

  // A deep link for this login (Android, or a second path) comes here, not to the router.
  useEffect(() => {
    if (!state || !redirecting) return;
    return awaitCallback(state, (completion) => void finishWith(completion));
  }, [state, redirecting, finishWith]);

  const done = useRef<string | null>(null);
  const finished = useEffectEvent((session: AuthSession) => onDone?.(session));
  useEffect(() => {
    if (!session || !kind || kind === "approve" || kind === "step") return;
    void forgetPending(session.state);
    if (kind !== "done" || done.current === session.state) return;
    done.current = session.state;
    finished(session);
  }, [session, kind]);

  return {
    ...auth,
    begin,
    reopen: () => session && void send(session).catch(() => undefined),
    /** The last failed request, in the service's words. */
    problem: auth.error ? (handler?.describeError?.(auth.error) ?? messageOf(auth.error)) : null,
  };
};

export type AuthFlowState = ReturnType<typeof useAuthFlow>;
