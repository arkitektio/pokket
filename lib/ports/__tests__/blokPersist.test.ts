import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createKeyedStore } from "../blok/keyedStore";
import {
  componentStateStore,
  fitsLocal,
  keptComponentId,
  keptLocalsId,
  openBlokPersistence,
  type BlokLocal,
  type KeptComponentState,
  type KeptLocals,
} from "@arkitektio/bsx/renderer/persist";
import { createBlokRuntimeStore, getValueAtPath, localValuePath, runtimeIdOf } from "@arkitektio/bsx/runtime";

// AsyncStorage is the jest mock: each store gets a prefix of its own.
const freshStore = () =>
  createKeyedStore<KeptLocals>({
    prefix: `test-${Math.random()}`,
    version: 1,
    isValue: (value): value is KeptLocals => typeof value === "object" && value !== null,
    label: "test local",
  });

const freshComponentStore = () =>
  createKeyedStore<KeptComponentState>({
    prefix: `test-components-${Math.random()}`,
    version: 1,
    isValue: (value): value is KeptComponentState => typeof value === "object" && value !== null && "state" in value,
    label: "test component",
  });

const SCOPE = { hub: "h1", user: "u1", materializedBlok: "7" };
/** The blok's locals as the tree resolves them: ports plus persist, each by its `<local>` node. */
const ITERATIONS = "Blok[0]/local[0]";
const POSE = "Blok[0]/local[1]";
const LABEL = "Blok[0]/local[2]";
/** The local inside a foreach: one value per item. */
const OPEN = "Blok[0]/foreach[0]/local[0]";
const LOCALS: BlokLocal[] = [
  { node: ITERATIONS, key: "iterations", kind: "INT", default: 15, persist: true },
  { node: POSE, key: "pose", kind: "LIST", default: [1, 0, 0, 0], persist: true },
  { node: LABEL, key: "label", kind: "STRING", default: "x" },
  { node: OPEN, key: "open", kind: "BOOL", default: false, persist: true },
];

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const open = (store: ReturnType<typeof freshStore>, locals = LOCALS) =>
  openBlokPersistence({ scope: SCOPE, locals, store, componentStore: freshComponentStore(), delay: 100 });

/** A runtime as a materialized blok seeds it: the kept values at their locals' paths. */
const runtimeFor = (initial: KeptLocals, locals: ReadonlySet<string>) => createBlokRuntimeStore({ keptValues: initial, keptLocals: locals });

/** What the runtime holds for the local of `runtimeId` (undefined: nothing written, it reads its default). */
const valueOf = (runtime: ReturnType<typeof runtimeFor>, runtimeId: string) => getValueAtPath(runtime.getState().dataModel, localValuePath(runtimeId));
const write = (runtime: ReturnType<typeof runtimeFor>, runtimeId: string, value: unknown, below = "") =>
  runtime.getState().setRuntimeValue(`${localValuePath(runtimeId)}${below}`, value);

describe("kept blok locals: <local persist>", () => {
  it("keeps only the locals declared with persist", async () => {
    const persistence = await open(freshStore());
    expect([...persistence.locals].sort()).toEqual([OPEN, ITERATIONS, POSE].sort());
  });

  it("seeds what was kept before the first render, by runtime id, and nothing for a first opening", async () => {
    const store = freshStore();
    const first = await open(store);
    expect(first.initial).toEqual({});

    await store.save(keptLocalsId(SCOPE), "locals", { [ITERATIONS]: 30, [runtimeIdOf(OPEN, ["7"])]: true });
    const again = await open(store);
    expect(again.initial).toEqual({ [ITERATIONS]: 30, [`${OPEN}@7`]: true });
    const runtime = runtimeFor(again.initial, again.locals);
    expect(valueOf(runtime, ITERATIONS)).toBe(30);
    expect(valueOf(runtime, `${OPEN}@7`)).toBe(true);
    expect(valueOf(runtime, `${OPEN}@8`)).toBeUndefined();
  });

  it("writes a change of a kept local once, after the last change settles, one value per foreach item", async () => {
    const store = freshStore();
    const save = jest.spyOn(store, "save");
    const persistence = await open(store);
    const runtime = runtimeFor(persistence.initial, persistence.locals);
    const detach = persistence.attach(runtime);

    write(runtime, POSE, [2, 0, 0, 0]);
    write(runtime, POSE, 3, "/0");
    write(runtime, LABEL, "not kept");
    write(runtime, `${OPEN}@a`, true);
    expect(save).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(100);
    expect(save).toHaveBeenCalledTimes(1);
    expect(await store.load(keptLocalsId(SCOPE), "locals")).toEqual({ [POSE]: [3, 0, 0, 0], [`${OPEN}@a`]: true });
    detach();
  });

  it("writes what is pending when the blok closes, and nothing back at the default", async () => {
    const store = freshStore();
    const persistence = await open(store);
    const runtime = runtimeFor(persistence.initial, persistence.locals);
    const detach = persistence.attach(runtime);
    write(runtime, ITERATIONS, 4);
    write(runtime, `${OPEN}@a`, false);
    detach();
    await jest.runAllTimersAsync();
    expect(await store.load(keptLocalsId(SCOPE), "locals")).toEqual({ [ITERATIONS]: 4 });
  });

  it("keeps the kept locals across a reset of the runtime values", async () => {
    const persistence = await open(freshStore());
    const runtime = runtimeFor(persistence.initial, persistence.locals);
    write(runtime, POSE, [5, 0, 0, 0]);
    write(runtime, `${OPEN}@a`, true);
    write(runtime, LABEL, "edited");
    runtime.getState().resetRuntimeValues();
    expect(valueOf(runtime, POSE)).toEqual([5, 0, 0, 0]);
    expect(valueOf(runtime, `${OPEN}@a`)).toBe(true);
    expect(valueOf(runtime, LABEL)).toBeUndefined();
  });

  it("forgets every kept local and shows the defaults again", async () => {
    const store = freshStore();
    await store.save(keptLocalsId(SCOPE), "locals", { [POSE]: [0, 1, 0, 0], [ITERATIONS]: 3 });
    const persistence = await open(store);
    const runtime = runtimeFor(persistence.initial, persistence.locals);
    persistence.attach(runtime);
    await persistence.resetLocals();
    expect(valueOf(runtime, POSE)).toBeUndefined();
    expect(await store.load(keptLocalsId(SCOPE), "locals")).toBeNull();
  });

  it("drops what no longer persists or no longer fits its port", async () => {
    const store = freshStore();
    await store.save(keptLocalsId(SCOPE), "locals", { [POSE]: { x: 1 }, [ITERATIONS]: 2.5, [LABEL]: "kept?", "Blok[0]/local[9]": true, [`${OPEN}@a`]: 3 });
    expect((await open(store)).initial).toEqual({});
    await store.save(keptLocalsId(SCOPE), "locals", { [ITERATIONS]: 2 });
    expect((await open(store)).initial).toEqual({ [ITERATIONS]: 2 });
  });

  it("drops what a blok kept by top-level key, before locals were kept by runtime id", async () => {
    const store = freshStore();
    await store.save(keptLocalsId(SCOPE), "locals", { iterations: 30 });
    expect((await open(store)).initial).toEqual({});
  });

  it("keeps nothing for another user or hub", async () => {
    const store = freshStore();
    await store.save(keptLocalsId(SCOPE), "locals", { [ITERATIONS]: 2 });
    const other = await openBlokPersistence({ scope: { ...SCOPE, user: "u2" }, locals: LOCALS, store, componentStore: freshComponentStore() });
    expect(other.initial).toEqual({});
  });

  it("checks a kept value against the local's port", () => {
    const local = (port: Omit<BlokLocal, "node">): BlokLocal => ({ node: "n", ...port });
    expect(fitsLocal(3, local({ key: "n", kind: "INT" }))).toBe(true);
    expect(fitsLocal(3.5, local({ key: "n", kind: "INT" }))).toBe(false);
    expect(fitsLocal(3.5, local({ key: "n", kind: "FLOAT" }))).toBe(true);
    expect(fitsLocal(true, local({ key: "n", kind: "FLOAT" }))).toBe(false);
    expect(fitsLocal("a", local({ key: "s", kind: "STRING" }))).toBe(true);
    expect(fitsLocal({ object: "4", __identifier: "@mikro/image" }, local({ key: "img", kind: "STRUCTURE", identifier: "@mikro/image" }))).toBe(true);
    expect(fitsLocal([1], local({ key: "l", kind: "LIST" }))).toBe(true);
    expect(fitsLocal("x", local({ key: "l", kind: "LIST" }))).toBe(false);
    expect(fitsLocal("fast", local({ key: "m", kind: "ENUM", choices: [{ value: "fast" }] }))).toBe(true);
    expect(fitsLocal("slow", local({ key: "m", kind: "ENUM", choices: [{ value: "fast" }] }))).toBe(false);
    expect(fitsLocal(null, local({ key: "n", kind: "INT" }))).toBe(true);
  });
});

describe("kept component state: persist by stable id", () => {
  it("keeps a component's state per (hub, user, materialized blok, component id)", async () => {
    const store = freshComponentStore();
    const components = componentStateStore(SCOPE, store, 50);
    components.save("main", { camera: [1, 2, 3] });
    expect(await components.load("main")).toBeNull();
    await jest.advanceTimersByTimeAsync(50);
    expect(await components.load("main")).toEqual({ camera: [1, 2, 3] });
    expect(await store.load(keptComponentId(SCOPE, "main"), "component")).toEqual({ state: { camera: [1, 2, 3] } });

    const otherBlok = componentStateStore({ ...SCOPE, materializedBlok: "8" }, store, 50);
    expect(await otherBlok.load("main")).toBeNull();
    const otherUser = componentStateStore({ ...SCOPE, user: "u2" }, store, 50);
    expect(await otherUser.load("main")).toBeNull();
    expect(await components.load("arm-pose")).toBeNull();
  });

  it("forgets what a component kept", async () => {
    const components = componentStateStore(SCOPE, freshComponentStore(), 10);
    components.save("arm-pose", [[1, 0, 0, 0]]);
    await jest.advanceTimersByTimeAsync(10);
    await components.forget("arm-pose");
    expect(await components.load("arm-pose")).toBeNull();
  });
});
