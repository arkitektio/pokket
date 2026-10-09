import { describe, expect, it } from "@jest/globals";
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
    expect(parseIncomingLink("https://arkitekt.live/deeplink?orkestrator=%2Fmikro")).toBeNull();
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
