import {useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {useRekuestTravelSource} from './context';
import type {TravelClock, TravelSource} from './travelSource';

/** A moment this close to the present is the present: letting go of the slider there goes live. */
export const LIVE_EDGE_MS = 2000;

/** Along the clock, or one revision of one agent at a time. */
export type TravelMode = 'time' | 'revisions';

/**
 * A screen's hold on travelling back (orkestrator's `useBlokTravel`): whether
 * its history bar is open, whether it shows the past, and the moves of the
 * clock. Orkestrator keeps where it stands in the URL, so a checkout can be
 * linked; a phone screen keeps it for as long as it is open.
 */
export type BlokTravel = {
  /** The source while the past is shown, `null` while live. Hand it to `BlokTravelProvider`. */
  source: TravelSource | null;
  open: boolean;
  /** Opens the bar, or closes it — which always goes back to live: a past nobody can see is a trap. */
  toggle: () => void;
  travelling: boolean;
  clock: TravelClock;
  mode: TravelMode;
  /** The agent whose revisions are stepped in `revisions` mode. */
  revisionAgent: string | null;
  /**
   * `revisions` steps through the revisions of `agentId`, from the one it is
   * at at the moment shown; `time` goes back to the clock, at the moment of
   * the revision shown. Neither moves what is shown.
   */
  setMode: (mode: TravelMode, agentId?: string) => void;
  /** Lands on one revision of the session the agent is stepped in (from live: of its latest). */
  checkoutRevision: (revision: number) => void;
  /** While the slider is dragged: moves the clock and asks sparingly. */
  scrub: (at: number) => void;
  /** The slider let go, or a time picked: lands on the moment. */
  commit: (at: number) => void;
  step: (direction: -1 | 1) => void;
  play: () => void;
  pause: () => void;
  setRate: (rate: number) => void;
  goLive: () => void;
};

/** The controller on a given source. `useBlokTravel` is this on rekuest's own. */
export const useTravelController = (source: TravelSource): BlokTravel => {
  const [travelling, setTravelling] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setModeState] = useState<TravelMode>('time');
  const [revisionAgent, setRevisionAgent] = useState<string | null>(null);
  const clock = useSyncExternalStore(source.subscribe, source.getClock, source.getClock);

  // Read by the callbacks, which stay the same across renders.
  const isTravelling = useRef(travelling);
  const currentMode = useRef(mode);
  const currentAgent = useRef(revisionAgent);
  useLayoutEffect(() => {
    isTravelling.current = travelling;
    currentMode.current = mode;
    currentAgent.current = revisionAgent;
  });

  const enter = useCallback(() => {
    isTravelling.current = true;
    setTravelling(true);
  }, []);

  const goLive = useCallback(() => {
    source.pause();
    isTravelling.current = false;
    setTravelling(false);
  }, [source]);

  const scrub = useCallback(
    (at: number) => {
      source.seek(at);
      setModeState('time');
      enter();
    },
    [enter, source],
  );

  const commit = useCallback(
    (at: number) => {
      if (at >= Date.now() - LIVE_EDGE_MS) {
        goLive();
        return;
      }
      source.seek(at, true);
      setModeState('time');
      enter();
    },
    [enter, goLive, source],
  );

  const setMode = useCallback(
    (next: TravelMode, agentId?: string) => {
      const agent = agentId ?? currentAgent.current;
      if (next === 'revisions' && agent === null) return;
      setModeState(next);
      if (next === 'revisions') setRevisionAgent(agent);
      // Live stays live: the first step is what leaves it.
      if (!isTravelling.current) return;
      if (next === 'revisions' && agent !== null) source.seekRevision(agent);
      else if (source.getClock().revision !== null) source.seek(source.getClock().at, true);
    },
    [source],
  );

  const checkoutRevision = useCallback(
    (revision: number) => {
      const agent = currentAgent.current;
      if (agent === null || !Number.isFinite(revision)) return;
      const position = {revision: Math.max(0, Math.round(revision))};
      // From live it is the agent's latest session, not the one that was stepped before going live.
      source.seekRevision(agent, isTravelling.current ? position : {...position, sessionId: null});
      enter();
    },
    [enter, source],
  );

  const step = useCallback(
    (direction: -1 | 1) => {
      // From live, the first step back starts at the present.
      if (!isTravelling.current) {
        const agent = currentMode.current === 'revisions' ? currentAgent.current : null;
        source.seek(Date.now(), agent === null);
        if (agent !== null) source.seekRevision(agent);
        enter();
      }
      source.step(direction);
    },
    [enter, source],
  );

  const play = useCallback(() => {
    if (!isTravelling.current) return;
    setModeState('time');
    source.play();
  }, [source]);
  const pause = useCallback(() => source.pause(), [source]);
  const setRate = useCallback((rate: number) => source.setRate(rate), [source]);

  const toggle = useCallback(() => {
    if (open && isTravelling.current) goLive();
    setOpen(!open);
  }, [goLive, open]);

  return useMemo(
    () => ({
      source: travelling ? source : null,
      open,
      toggle,
      travelling,
      clock,
      mode,
      revisionAgent,
      setMode,
      checkoutRevision,
      scrub,
      commit,
      step,
      play,
      pause,
      setRate,
      goLive,
    }),
    [checkoutRevision, clock, commit, goLive, mode, open, pause, play, revisionAgent, scrub, setMode, setRate, source, step, toggle, travelling],
  );
};

/** Travelling back through the state of rekuest agents, for one screen. */
export const useBlokTravel = (): BlokTravel => {
  const goLive = useRef<() => void>(() => {});
  const source = useRekuestTravelSource({onReachedLive: () => goLive.current()});
  const travel = useTravelController(source);
  useLayoutEffect(() => {
    goLive.current = travel.goLive;
  });
  return travel;
};
