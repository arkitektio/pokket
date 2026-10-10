import { describe, expect, it } from "@jest/globals";
import { fromDesktopPath } from "../desktopPaths";
import { parseIncomingLink } from "../incoming";
import { decodeShareRequest, encodeOpaqueScope, encodeShareScope, matchScope, normalizeLinkPath } from "../shareScope";

const scope = { baseUrl: "https://Go.Arkitekt.live/", org: "7", hub: null };

describe("share scope", () => {
  it("round-trips a scoped path, query and all", () => {
    const gate = encodeShareScope(scope, "/bank?view=spending&filterLabel=A b");
    expect(gate.startsWith("/open?")).toBe(true);
    expect(decodeShareRequest(gate.split("?")[1])).toEqual({
      scope: { baseUrl: "https://go.arkitekt.live", org: "7", hub: null },
      digest: null,
      path: "/bank?view=spending&filterLabel=A b",
    });
  });

  it("round-trips the opaque form", () => {
    const gate = encodeOpaqueScope("0a1b2c3d", "/mail/thread/9");
    expect(decodeShareRequest(gate.split("?")[1])).toEqual({ scope: null, digest: "0a1b2c3d", path: "/mail/thread/9" });
  });

  it("reads orkestrator's `+` for a space", () => {
    expect(decodeShareRequest("to=https%3A%2F%2Fx.io&path=%2Fbank%3FfilterLabel%3DA+b")?.path).toBe("/bank?filterLabel=A b");
  });

  it("refuses a link without a page or a place", () => {
    expect(decodeShareRequest("to=https%3A%2F%2Fx.io")).toBeNull();
    expect(decodeShareRequest("path=%2Fbank")).toBeNull();
  });

  it("keeps links off the screens outside the app frame", () => {
    expect(normalizeLinkPath("//evil.example/x")).toBe("/evil.example/x");
    expect(normalizeLinkPath("/mesh-selftest?key=1")).toBeNull();
    expect(normalizeLinkPath("/open?path=%2Fbank")).toBeNull();
    expect(normalizeLinkPath("/login")).toBeNull();
    expect(normalizeLinkPath("bank")).toBe("/bank");
  });

  it("matches on server and organization, the hub only when both name one", () => {
    expect(matchScope(scope, { baseUrl: "https://go.arkitekt.live", org: "7", hub: "h1" })).toBe(true);
    expect(matchScope(scope, { baseUrl: "https://go.arkitekt.live", org: "8", hub: null })).toBe(false);
    expect(matchScope(scope, { baseUrl: "https://other.live", org: "7", hub: null })).toBe(false);
    expect(matchScope({ ...scope, hub: "h1" }, { ...scope, hub: "h2" })).toBe(false);
  });
});

describe("incoming links", () => {
  const gate = encodeShareScope(scope, "/bank/transaction/5");

  it("reads a gate link however the slashes fell", () => {
    const expected = decodeShareRequest(gate.split("?")[1]);
    expect(parseIncomingLink(`pokket://${gate}`)).toEqual(expected);
    expect(parseIncomingLink(`pokket://${gate.slice(1)}`)).toEqual(expected);
  });

  it("reads a bare page as a portable link", () => {
    expect(parseIncomingLink("pokket://bank/transaction/5")).toEqual({ scope: null, digest: null, path: "/bank/transaction/5" });
    expect(parseIncomingLink("pokket:///mail?box=unread")).toEqual({ scope: null, digest: null, path: "/mail?box=unread" });
    // A call, joining on arrival (lib/lovekit/call/links.ts).
    expect(parseIncomingLink("pokket://calls/5?join=1")).toEqual({ scope: null, digest: null, path: "/calls/5?join=1" });
  });

  it("reads the arkitekt.live wrapper", () => {
    const url = `https://arkitekt.live/deeplink?pokket=${encodeURIComponent(gate)}`;
    expect(parseIncomingLink(url)).toEqual(decodeShareRequest(gate.split("?")[1]));
    // The desktop's parameter is read too, now that the app answers to its name.
    expect(parseIncomingLink("https://arkitekt.live/deeplink?orkestrator=%2Fmikro")?.path).toBe("/mikro");
    expect(parseIncomingLink("https://example.com/deeplink?pokket=%2Fbank")).toBeNull();
  });

  it("leaves everything else to the router", () => {
    expect(parseIncomingLink("pokket://")).toBeNull();
    expect(parseIncomingLink("pokket:///")).toBeNull();
    expect(parseIncomingLink("pokket://mesh-selftest?control=x")).toBeNull();
    expect(parseIncomingLink("pokket://expo-development-client/?url=http%3A%2F%2F10.0.0.2%3A8081")).toBeNull();
    expect(parseIncomingLink("exp://10.0.0.2:8081/--/bank")).toBeNull();
    expect(parseIncomingLink("/bank")).toBeNull();
    expect(parseIncomingLink("pokket://open?to=https%3A%2F%2Fx.io")).toBeNull();
  });
});

describe("links from the desktop app", () => {
  it("name the phone's page for what both apps show", () => {
    expect(fromDesktopPath("/rekuest/tasks/5")).toBe("/tasks/5");
    expect(fromDesktopPath("/rekuest/actions/5")).toBe("/actions/5");
    expect(fromDesktopPath("/kuvert/threads/9")).toBe("/mail/thread/9");
    expect(fromDesktopPath("/bank/transactions/3")).toBe("/bank/transaction/3");
    expect(fromDesktopPath("/lovekit/solobroadcasts/2")).toBe("/solo-broadcast/2");
    expect(fromDesktopPath("/lovekit/calls/2?join=1")).toBe("/calls/2?join=1");
  });
  it("keep the paths both apps share", () => {
    expect(fromDesktopPath("/mikro/arraydatasets/7")).toBe("/mikro/arraydatasets/7");
    expect(fromDesktopPath("/alpaka/rooms/4")).toBe("/alpaka/rooms/4");
    expect(fromDesktopPath("/mikro")).toBe("/mikro");
    expect(fromDesktopPath("/bank?view=spending")).toBe("/bank?view=spending");
  });
  it("open a service's front page as the phone's stand-in for it", () => {
    expect(fromDesktopPath("/rekuest")).toBe("/tasks");
    expect(fromDesktopPath("/rekuest/home")).toBe("/tasks");
    expect(fromDesktopPath("/kuvert")).toBe("/mail");
  });
  it("say so when the phone has no such page", () => {
    expect(fromDesktopPath("/rekuest/agents/3")).toBe("/not-here?path=%2Frekuest%2Fagents%2F3");
    expect(fromDesktopPath("/mikro/coordinatesystems/3")).toBe("/not-here?path=%2Fmikro%2Fcoordinatesystems%2F3");
    expect(fromDesktopPath("/bank/accounts/3")).toBe("/not-here?path=%2Fbank%2Faccounts%2F3");
    expect(fromDesktopPath("/kabinet")).toBe("/not-here?path=%2Fkabinet");
  });
  it("let a phone path through", () => {
    expect(fromDesktopPath("/tasks")).toBe("/tasks");
    expect(fromDesktopPath("/mail/thread/9")).toBe("/mail/thread/9");
    expect(fromDesktopPath("/settings")).toBe("/settings");
  });

  it("are translated when they arrive by the desktop's scheme", () => {
    expect(parseIncomingLink("orkestrator://rekuest/tasks/5")?.path).toBe("/tasks/5");
    expect(parseIncomingLink("orkestrator://tasks")?.path).toBe("/tasks");
  });
  it("are translated inside a scoped link, keeping the scope", () => {
    const gate = encodeShareScope(scope, "/kuvert/threads/9");
    expect(parseIncomingLink(`orkestrator:/${gate}`)).toEqual({
      scope: { baseUrl: "https://go.arkitekt.live", org: "7", hub: null },
      digest: null,
      path: "/mail/thread/9",
    });
  });
  it("are translated when they arrive by the desktop's wrapper parameter", () => {
    const url = `https://arkitekt.live/deeplink?orkestrator=${encodeURIComponent("/rekuest/tasks/5")}`;
    expect(parseIncomingLink(url)?.path).toBe("/tasks/5");
  });
  it("leave the phone's own links exactly as they are", () => {
    // A phone path that happens to look like a desktop one is not second-guessed.
    expect(parseIncomingLink("pokket://rekuest/tasks/5")?.path).toBe("/rekuest/tasks/5");
    const url = `https://arkitekt.live/deeplink?pokket=${encodeURIComponent("/tasks/5")}`;
    expect(parseIncomingLink(url)?.path).toBe("/tasks/5");
  });
  it("still leave the self-test and the dev client to the router", () => {
    expect(parseIncomingLink("orkestrator://mesh-selftest?key=1")).toBeNull();
    expect(parseIncomingLink("orkestrator://")).toBeNull();
  });
});
