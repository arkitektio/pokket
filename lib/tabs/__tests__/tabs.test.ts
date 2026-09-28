import { describe, expect, it } from "@jest/globals";
import {
  closeOtherTabs,
  closeTab,
  initialTabs,
  MAX_TABS,
  moveTab,
  openTab,
  parseStoredTabs,
  serializeTabs,
  setTabLabel,
  setTabPinned,
  setTabRoute,
  TabsState,
} from "../tabs";

const withTabs = (routes: string[]): TabsState => {
  let state = initialTabs(routes[0], 0);
  routes.slice(1).forEach((route, i) => {
    state = openTab(state, route, { now: i + 1 });
  });
  return state;
};

describe("tabs", () => {
  it("opens and focuses a new tab, labelled from its route", () => {
    const state = openTab(initialTabs("/"), "/mail?box=unread");
    expect(state.tabs).toHaveLength(2);
    expect(state.tabs[1].label).toBe("Mail · Unread");
    expect(state.activeId).toBe(state.tabs[1].id);
  });

  it("refuses at the cap unless asked to evict, and never evicts a pinned or active tab", () => {
    let state = withTabs(Array.from({ length: MAX_TABS }, (_, i) => `/p${i}`));
    state = setTabPinned(state, state.tabs[0].id, true);
    expect(openTab(state, "/x")).toBe(state);
    const evicted = openTab(state, "/x", { evict: true });
    expect(evicted.tabs).toHaveLength(MAX_TABS);
    expect(evicted.tabs.some((t) => t.route === "/p0")).toBe(true); // pinned
    expect(evicted.tabs.some((t) => t.route === "/p1")).toBe(false); // least recent
  });

  it("closing the active tab focuses its right neighbour, else its left", () => {
    const state = withTabs(["/a", "/b", "/c"]);
    const b = state.tabs[1];
    const closedB = closeTab({ ...state, activeId: b.id }, b.id);
    expect(closedB.tabs.find((t) => t.id === closedB.activeId)?.route).toBe("/c");
    const c = state.tabs[2];
    const closedC = closeTab(state, c.id);
    expect(closedC.tabs.find((t) => t.id === closedC.activeId)?.route).toBe("/b");
  });

  it("never leaves zero tabs", () => {
    const state = initialTabs("/mail");
    const closed = closeTab(state, state.activeId);
    expect(closed.tabs).toHaveLength(1);
    expect(closed.tabs[0].route).toBe("/");
  });

  it("keeps pins a block on top, and moves stay inside their block", () => {
    let state = withTabs(["/a", "/b", "/c"]);
    const c = state.tabs[2].id;
    state = setTabPinned(state, c, true);
    expect(state.tabs.map((t) => t.route)).toEqual(["/c", "/a", "/b"]);
    const a = state.tabs[1].id;
    expect(moveTab(state, a, -1)).toBe(state); // cannot join the pins
    expect(moveTab(state, a, 1).tabs.map((t) => t.route)).toEqual(["/c", "/b", "/a"]);
  });

  it("close others keeps the pinned tabs", () => {
    let state = withTabs(["/a", "/b", "/c"]);
    state = setTabPinned(state, state.tabs[0].id, true);
    const b = state.tabs.find((t) => t.route === "/b")!.id;
    expect(closeOtherTabs(state, b).tabs.map((t) => t.route)).toEqual(["/a", "/b"]);
  });

  it("a page title wins over the path label until the path changes", () => {
    let state = initialTabs("/mail/thread/1");
    state = setTabLabel(state, state.activeId, "Lunch?", "/mail/thread/1");
    expect(state.tabs[0].label).toBe("Lunch?");
    state = setTabRoute(state, state.activeId, "/bank");
    expect(state.tabs[0].label).toBe("Bank");
    // A late title for the page left behind is ignored.
    expect(setTabLabel(state, state.activeId, "Lunch?", "/mail/thread/1")).toBe(state);
  });

  it("round-trips through storage, dropping only unreadable rows", () => {
    const state = withTabs(["/a", "/b"]);
    const raw = JSON.parse(serializeTabs(state));
    raw.tabs.push({ id: "broken" });
    const parsed = parseStoredTabs(JSON.stringify(raw))!;
    expect(parsed.tabs.map((t) => t.route)).toEqual(["/a", "/b"]);
    expect(parsed.activeId).toBe(state.activeId);
    expect(parseStoredTabs(JSON.stringify({ ...raw, activeId: "gone" }))!.activeId).toBe(parsed.tabs[0].id);
    expect(parseStoredTabs("nonsense")).toBeNull();
  });
});
