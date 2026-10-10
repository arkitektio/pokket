import { describe, expect, it } from "@jest/globals";
import { asDate, clockPart, monthGrid, snap, withDay } from "../calendar";

describe("a month grid", () => {
  it("starts on Monday and fills whole weeks", () => {
    // October 2026 starts on a Thursday and has 31 days.
    const grid = monthGrid(2026, 9);
    expect(grid[0]).toEqual([null, null, null, 1, 2, 3, 4]);
    expect(grid[grid.length - 1]).toEqual([26, 27, 28, 29, 30, 31, null]);
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });
  it("handles a month that starts on Monday and one on Sunday", () => {
    expect(monthGrid(2026, 5)[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(monthGrid(2026, 10)[0]).toEqual([null, null, null, null, null, null, 1]);
  });
  it("knows February", () => {
    expect(monthGrid(2028, 1).flat().filter(Boolean)).toHaveLength(29);
  });
});

describe("dates in a form", () => {
  it("are read from a Date or an ISO string", () => {
    expect(asDate("2026-10-10T08:30:00Z")?.toISOString()).toBe("2026-10-10T08:30:00.000Z");
    expect(asDate(new Date(0))?.getTime()).toBe(0);
    expect(asDate("nope")).toBeNull();
    expect(asDate(null)).toBeNull();
  });
  it("keep their time when the day changes", () => {
    const moved = withDay(new Date(2026, 9, 10, 8, 30), 2026, 10, 2);
    expect([moved.getMonth(), moved.getDate(), moved.getHours(), moved.getMinutes()]).toEqual([10, 2, 8, 30]);
  });
  it("land on the month's last day when it is shorter", () => {
    expect(withDay(new Date(2026, 0, 31), 2026, 1, 31).getDate()).toBe(28);
  });
  it("read clock fields", () => {
    expect(clockPart("07", 23)).toBe(7);
    expect(clockPart("24", 23)).toBeNull();
    expect(clockPart("x", 59)).toBeNull();
  });
});

describe("a slider", () => {
  it("snaps to its step within its range", () => {
    expect(snap(0.5, 0, 10, 1)).toBe(5);
    expect(snap(0.33, 0, 1, 0.1)).toBe(0.3);
    expect(snap(2, 0, 10, 1)).toBe(10);
    expect(snap(-1, 5, 10, 1)).toBe(5);
  });
  it("is continuous without a step", () => {
    expect(snap(0.25, 0, 2, 0)).toBe(0.5);
  });
});
