import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { TripRow, VisitRow } from "../db";

// The generated API imports its hooks from here, which pulls in the toast UI.
jest.mock("@/lib/lokate/funcs", () => ({}));
jest.mock("../tracking", () => ({ catchUp: jest.fn(async () => undefined) }));
jest.mock("../db", () => ({
  unsyncedPoints: jest.fn(),
  markPointsSynced: jest.fn(async () => undefined),
  segmentsDirtyFrom: jest.fn(),
  segmentsSince: jest.fn(),
  markSegmentsSynced: jest.fn(async () => undefined),
  unsyncedPlaces: jest.fn(),
  applyPlaceSync: jest.fn(async () => undefined),
  restorePage: jest.fn(async () => undefined),
  finishRestore: jest.fn(async () => undefined),
  resetSyncMarks: jest.fn(async () => undefined),
  isEmpty: jest.fn(async () => false),
}));

// eslint-disable-next-line import/first
import * as db from "../db";
// eslint-disable-next-line import/first
import { chunkSegments, LokateApi, pushPlaces, pushPoints, pushSegments, restore, toTripInput } from "../sync";

const mocked = db as jest.Mocked<typeof db>;

const visit = (start: number): VisitRow => ({
  id: `v${start}`,
  start_ts: start,
  end_ts: start + 10,
  lat: 52.5,
  lon: 13.4,
  radius: 20,
  point_count: 3,
  place_id: null,
});
const trip = (start: number): TripRow => ({
  id: `t${start}`,
  start_ts: start,
  end_ts: start + 5,
  from_visit: null,
  to_visit: null,
  distance_m: 1000,
  mode: "walk",
});

const fakeApi = (): jest.Mocked<LokateApi> => ({
  uploadPoints: jest.fn(async () => undefined),
  replaceSegments: jest.fn(async () => undefined),
  syncPlaces: jest.fn(async () => []),
  changes: jest.fn(async () => ({ points: [], visits: [], trips: [], places: [], deletedPlaces: [], nextCursor: null, hasMore: false })),
  deleteServerCopy: jest.fn(async () => 0),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("chunkSegments", () => {
  it("keeps everything in one call when it fits, starting at the dirty mark", () => {
    const chunks = chunkSegments(5, [visit(10), visit(30)], [trip(20)], 10);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].from).toBe(5);
    expect(chunks[0].visits.map((v) => v.id)).toEqual(["v10", "v30"]);
  });

  it("sends one empty call when nothing is left, so the server drops what went away", () => {
    expect(chunkSegments(5, [], [])).toEqual([{ from: 5, visits: [], trips: [] }]);
  });

  it("splits in time order, each later call replacing from its own first start", () => {
    const chunks = chunkSegments(0, [visit(10), visit(30), visit(50)], [trip(20), trip(40)], 2);
    expect(chunks.map((c) => c.from)).toEqual([0, 30, 50]);
    expect(chunks.flatMap((c) => [...c.visits, ...c.trips]).length).toBe(5);
  });

  it("never splits rows that share a start", () => {
    const chunks = chunkSegments(0, [visit(10), visit(20)], [trip(20)], 2);
    // A split at 20 would let the second call delete the first call's row starting at 20.
    for (const chunk of chunks.slice(1)) {
      const earlier = chunks.filter((c) => c.from < chunk.from).flatMap((c) => [...c.visits, ...c.trips]);
      expect(earlier.every((row) => row.start_ts < chunk.from)).toBe(true);
    }
  });
});

describe("mapping", () => {
  it("sends trip modes and times the way lokate expects them", () => {
    expect(toTripInput(trip(0))).toMatchObject({ clientId: "t0", mode: "WALK", start: "1970-01-01T00:00:00.000Z" });
  });
});

describe("push", () => {
  it("uploads points batch by batch and marks each batch once accepted", async () => {
    const point = (id: string) => ({ id, ts: 0, lat: 1, lon: 2, acc: null, speed: null, heading: null, alt: null });
    mocked.unsyncedPoints
      .mockResolvedValueOnce([point("a"), point("b")])
      .mockResolvedValueOnce([point("c")])
      .mockResolvedValueOnce([]);
    const api = fakeApi();
    expect(await pushPoints(api)).toBe(3);
    expect(api.uploadPoints).toHaveBeenCalledTimes(2);
    expect(mocked.markPointsSynced).toHaveBeenNthCalledWith(1, ["a", "b"]);
  });

  it("leaves points unmarked when the upload fails, so they go again", async () => {
    mocked.unsyncedPoints.mockResolvedValueOnce([{ id: "a", ts: 0, lat: 1, lon: 2, acc: null, speed: null, heading: null, alt: null }]);
    const api = fakeApi();
    api.uploadPoints.mockRejectedValueOnce(new Error("offline"));
    await expect(pushPoints(api)).rejects.toThrow("offline");
    expect(mocked.markPointsSynced).not.toHaveBeenCalled();
  });

  it("skips segments when nothing changed", async () => {
    mocked.segmentsDirtyFrom.mockResolvedValueOnce(null);
    const api = fakeApi();
    await pushSegments(api);
    expect(api.replaceSegments).not.toHaveBeenCalled();
  });

  it("replaces segments from the dirty mark, then marks that exact state synced", async () => {
    const dirty = { from: 100, version: "7" };
    mocked.segmentsDirtyFrom.mockResolvedValueOnce(dirty);
    mocked.segmentsSince.mockResolvedValueOnce({ visits: [visit(100)], trips: [trip(110)] });
    const api = fakeApi();
    await pushSegments(api);
    expect(api.replaceSegments).toHaveBeenCalledWith(new Date(100).toISOString(), [expect.objectContaining({ clientId: "v100" })], [
      expect.objectContaining({ clientId: "t110" }),
    ]);
    expect(mocked.markSegmentsSynced).toHaveBeenCalledWith(dirty);
  });

  it("takes newer places and deletions back from the server", async () => {
    const sent = {
      places: [{ id: "p1", name: "Home", lat: 1, lon: 2, radius: 100, updated_at: 5 }],
      deletions: [{ client_id: "p2", deleted_at: 6 }],
    };
    mocked.unsyncedPlaces.mockResolvedValueOnce(sent);
    const api = fakeApi();
    api.syncPlaces.mockResolvedValueOnce([
      { clientId: "p1", name: "Home (renamed)", lat: 1, lon: 2, radius: 100, updatedAt: new Date(9).toISOString() },
      { clientId: "p3", updatedAt: new Date(9).toISOString(), deletedAt: new Date(9).toISOString() },
    ]);
    await pushPlaces(api);
    expect(api.syncPlaces).toHaveBeenCalledWith(
      [expect.objectContaining({ clientId: "p1", updatedAt: new Date(5).toISOString() })],
      [{ clientId: "p2", deletedAt: new Date(6).toISOString() }],
    );
    expect(mocked.applyPlaceSync).toHaveBeenCalledWith(sent, {
      places: [expect.objectContaining({ id: "p1", name: "Home (renamed)", updated_at: 9 })],
      deleted: ["p3"],
    });
  });
});

describe("restore", () => {
  it("pages until the server is done, then hands segmentation back", async () => {
    const api = fakeApi();
    api.changes
      .mockResolvedValueOnce({
        points: [{ clientId: "a", deviceId: "d1", ts: new Date(1).toISOString(), lat: 1, lon: 2 }],
        visits: [],
        trips: [],
        places: [],
        deletedPlaces: [],
        nextCursor: "c1",
        hasMore: true,
      })
      .mockResolvedValueOnce({
        points: [],
        visits: [{ clientId: "v1", deviceId: "d1", start: new Date(1).toISOString(), end: new Date(2).toISOString(), lat: 1, lon: 2, radius: 5, pointCount: 2 }],
        trips: [],
        places: [],
        deletedPlaces: [],
        nextCursor: null,
        hasMore: false,
      });
    expect(await restore(api)).toBe(2);
    expect(api.changes).toHaveBeenNthCalledWith(2, "c1", 1000);
    expect(mocked.restorePage).toHaveBeenCalledTimes(2);
    expect(mocked.finishRestore).toHaveBeenCalledTimes(1);
  });
});
