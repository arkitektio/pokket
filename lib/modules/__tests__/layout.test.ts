import { describe, expect, it } from "@jest/globals";
import { isRouteActive, labelForRoute, linkParams, MODULE_CATALOG, moduleByKey, moduleForPath as forPath, routeOf } from "../catalog";
import { layoutModuleNav } from "../layout";

const moduleForPath = (path: string) => forPath(path, MODULE_CATALOG)!;

describe("module links", () => {
  it("takes the home link out and groups the rest in first-appearance order", () => {
    const layout = layoutModuleNav({
      navLinks: [
        { label: "Overview", route: "/x", home: true },
        { label: "A", route: "/x/a", group: "One" },
        { label: "B", route: "/x/b", group: "Two", description: "b" },
        { label: "C", route: "/x/c", group: "One" },
        { label: "D", route: "/x/d" },
      ],
    });
    expect(layout.home?.label).toBe("Overview");
    expect(layout.groups.map((g) => [g.title, g.links.map((l) => l.label), g.chips])).toEqual([
      ["One", ["A", "C"], true],
      ["Two", ["B"], false],
      ["Pages", ["D"], true],
    ]);
  });

  it("finds a page's module by the longest route prefix", () => {
    expect(moduleForPath("/mail/thread/12").key).toBe("mail");
    expect(moduleForPath("/wifi/eduroam").key).toBe("phone");
    expect(moduleForPath("/timeline/place/3").key).toBe("phone");
    expect(moduleForPath("/settings").key).toBe("phone");
    expect(moduleForPath("/lokate").key).toBe("lokate");
    expect(moduleForPath("/").key).toBe("home");
    expect(moduleForPath("/somewhere").key).toBe("home");
  });

  it("lights a link only when its path and query match", () => {
    const mail = moduleByKey("mail")!;
    const params = linkParams(mail);
    expect(params).toEqual(["box"]);
    expect(isRouteActive("/mail?box=unread", "/mail", { box: "unread" }, params)).toBe(true);
    expect(isRouteActive("/mail", "/mail", { box: "unread" }, params)).toBe(false);
    expect(isRouteActive("/mail", "/mail", {}, params)).toBe(true);
  });

  it("rebuilds a route from its params, leaving out dynamic segments", () => {
    expect(routeOf("/mail", { box: "unread" })).toBe("/mail?box=unread");
    expect(routeOf("/mail/thread/12", { id: "12" })).toBe("/mail/thread/12");
    expect(routeOf("/bank", { view: "spends", merchant: "m1" })).toBe("/bank?merchant=m1&view=spends");
  });

  it("labels routes from the module links", () => {
    expect(labelForRoute("/mail?box=flagged")).toBe("Mail · Flagged");
    expect(labelForRoute("/bank")).toBe("Bank");
    expect(labelForRoute("/")).toBe("Home");
    expect(labelForRoute("/mail/thread/1")).toBe("Mail");
  });
});
