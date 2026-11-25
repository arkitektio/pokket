import { useWatchStreamsSubscription } from "@/lib/lovekit/api/graphql";

/**
 * Keeps "live" current everywhere without polling: lovekit announces a stream
 * going live or offline (its agent publishing, unpublishing or leaving). The
 * stream in the event carries its new `live`, and its agent's `live` read at
 * the same moment; Apollo writes both over the cached ones, so every mounted
 * stream and agent shows it. One subscription for the app (orkestrator's
 * `StreamLivenessWatcher`), mounted with the calls' background (`CallHost`).
 */
export const StreamLivenessWatcher = () => {
  useWatchStreamsSubscription();
  return null;
};
