import { describe, expect, it } from "@jest/globals";
import { parseRedirect, redirectError, redirectParams } from "../redirect";

describe("parseRedirect", () => {
  it("reads code and state from the full redirect URL", () => {
    expect(parseRedirect("https://example.org/bank/callback?code=abc&state=xyz")).toEqual({ code: "abc", state: "xyz" });
    expect(parseRedirect("orkestrator://bank/auth/callback?code=a%2Fb&state=s#frag")).toEqual({ code: "a/b", state: "s" });
  });

  it("accepts a bare query string", () => {
    expect(parseRedirect("?state=s1&code=c1")).toEqual({ code: "c1", state: "s1" });
    expect(parseRedirect("code=c1&state=s1")).toEqual({ code: "c1", state: "s1" });
  });

  it("keeps a padded value whole", () => {
    expect(parseRedirect("?code=YWJj==&state=s")).toEqual({ code: "YWJj==", state: "s" });
  });

  it("refuses anything without both", () => {
    expect(parseRedirect("https://example.org/?code=only")).toBeNull();
    expect(parseRedirect("  ")).toBeNull();
  });
});

describe("redirectError", () => {
  it("prefers the provider's description over its code", () => {
    expect(redirectError(redirectParams("?error=access_denied&error_description=User+said+no"))).toBe("User said no");
    expect(redirectError(redirectParams("?error=access_denied"))).toBe("access_denied");
    expect(redirectError(redirectParams("?code=c&state=s"))).toBeNull();
  });
});
