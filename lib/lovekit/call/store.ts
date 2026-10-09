import type { Room } from "livekit-client";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/**
 * The one call this app is in — orkestrator's `lovekit/call/store.ts`.
 *
 * The LiveKit connection lives in `CallConnection`, mounted at the root of
 * the app for as long as lovekit is up, so a call survives navigation: the
 * call page and the bar over the other pages (`CallBar`) are two views of
 * this store, and `room` is the connected `Room` either can drive (mute,
 * leave) through LiveKit's `RoomContext`.
 */
export type ActiveCall = { id: string; title: string };

export type CallStatus = "idle" | "connecting" | "connected" | "error";

/** What this device brings into the call. Without the microphone it listens. */
export type CallMedia = { audio: boolean };

export type CallState = {
  call: ActiveCall | null;
  token: string | null;
  status: CallStatus;
  error: string | null;
  room: Room | null;
  media: CallMedia;
  /** When this device joined, for the bar's clock. */
  joinedAt: number | null;
  /** Hand over a token: the connection mounts and connects. */
  start: (call: ActiveCall, token: string, media?: CallMedia) => void;
  setRoom: (room: Room | null) => void;
  connected: () => void;
  /**
   * The call is lost, and stays on screen as lost: the token goes, so the
   * connection unmounts, and joining again takes a fresh one. A phone changes
   * networks all day, so unlike on the desktop a drop is said, not hidden.
   */
  fail: (message: string) => void;
  /** Hang up: disconnects and forgets the call. Safe to call twice. */
  leave: () => void;
};

const IDLE = {
  call: null,
  token: null,
  status: "idle" as const,
  error: null,
  room: null,
  media: { audio: true },
  joinedAt: null,
};

export const callStore = createStore<CallState>((set, get) => ({
  ...IDLE,
  start: (call, token, media = { audio: true }) => {
    const previous = get().room;
    if (previous) void previous.disconnect();
    set({ call, token, media, status: "connecting", error: null, room: null, joinedAt: null });
  },
  setRoom: (room) => set({ room }),
  connected: () => set({ status: "connected", joinedAt: Date.now() }),
  fail: (message) => {
    if (!get().call) return;
    set({ status: "error", error: message, token: null, room: null, joinedAt: null });
  },
  leave: () => {
    const { room } = get();
    if (room) void room.disconnect();
    set(IDLE);
  },
}));

export const useCallState = <T>(selector: (state: CallState) => T): T => useStore(callStore, selector);
