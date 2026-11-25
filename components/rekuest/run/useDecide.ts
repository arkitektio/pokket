import * as React from 'react';
import {toast} from 'sonner-native';
import type {DecideInput} from '@/lib/rekuest/api/graphql';
import {callFailure, useTaskCalls} from '@/lib/rekuest/session/calls';

/**
 * Answer a held task over the app's caller session. A refusal is shown and
 * rejects, so a card can hand its buttons back.
 */
export const useDecide = () => {
  const {decide} = useTaskCalls();
  return React.useCallback(
    (input: DecideInput) =>
      decide(input).catch((error: unknown) => {
        toast.error(callFailure(error, 'The answer was not sent'));
        throw error;
      }),
    [decide],
  );
};
