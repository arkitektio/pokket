import { useSyncExternalStore } from "react";
import { useService } from "../../arkitekt/hooks";
import type { RekuestService } from "../service";
import type { RekuestSession, SessionStatus, SessionSync } from "./client";

/** The app's caller session (under the rekuest guard, like `useRekuestClient`). */
export const useRekuestSession = (): RekuestSession => (useService("rekuest") as RekuestService).session;

/** The session's status, as it changes (for what shows whether live updates are flowing). */
export const useRekuestSessionStatus = (session: RekuestSession): SessionStatus =>
  useSyncExternalStore(session.subscribeStatus, session.getStatus, session.getStatus);

/** Whether live updates flow, and since when they have not (`SessionSync`). */
export const useRekuestSessionSync = (session: RekuestSession): SessionSync =>
  useSyncExternalStore(session.subscribeStatus, session.getSync, session.getSync);
