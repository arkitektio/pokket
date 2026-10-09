import { useJoinCallMutation } from "@/lib/lovekit/api/graphql";
import { useCallback, useState } from "react";

import { hasMicrophone, requestMicrophone } from "./permissions";
import { callStore, useCallState, type ActiveCall } from "./store";

/**
 * Join a call from any surface — orkestrator's `useJoinCall`: mints the token
 * and hands it to the store, where `CallConnection` picks it up. Joining
 * another call first leaves the one this app is in.
 *
 * A tap asks for the microphone; a refusal still joins, listening only. An
 * arrival by link (`prompt: false`) never asks: without the microphone
 * already granted it stays in the lobby, where the Join button is.
 */
export const useJoinCall = () => {
  const [joinCall] = useJoinCallMutation();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useCallState((state) => state.call);

  const join = useCallback(
    async (call: ActiveCall, { prompt = true }: { prompt?: boolean } = {}) => {
      setJoining(true);
      setError(null);
      try {
        const audio = prompt ? await requestMicrophone() : await hasMicrophone();
        if (!prompt && !audio) return;
        const result = await joinCall({ variables: { input: { call: call.id } } });
        const token = result.data?.joinCall;
        if (!token) throw new Error("The call handed out no token");
        callStore.getState().start(call, token, { audio });
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Could not join the call");
      } finally {
        setJoining(false);
      }
    },
    [joinCall],
  );

  return { join, joining, error, active };
};
