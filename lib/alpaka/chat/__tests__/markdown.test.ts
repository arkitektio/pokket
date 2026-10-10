import { describe, expect, it } from "@jest/globals";
import { parseBlocks, parseInline } from "../markdown";

describe("inline markdown", () => {
  it("leaves plain text alone", () => {
    expect(parseInline("hello")).toEqual(["hello"]);
  });
  it("reads bold before italic", () => {
    expect(parseInline("a **b** *c*")).toEqual([
      "a ",
      { type: "bold", key: expect.any(String), children: ["b"] },
      " ",
      { type: "italic", key: expect.any(String), children: ["c"] },
    ]);
  });
  it("reads code and links", () => {
    expect(parseInline("`x` [docs](https://a.b)")).toEqual([
      { type: "code", key: expect.any(String), text: "x" },
      " ",
      { type: "link", key: expect.any(String), url: "https://a.b", children: ["docs"] },
    ]);
  });
});

describe("markdown blocks", () => {
  it("splits headers, paragraphs and lists", () => {
    const blocks = parseBlocks("# Title\n\nSome text\nmore\n\n- one\n- two\n\n1. first");
    expect(blocks.map((b) => b.type)).toEqual(["header", "paragraph", "list", "list"]);
    expect(blocks[0]).toMatchObject({ level: 1 });
    expect(blocks[2]).toMatchObject({ ordered: false, items: [["one"], ["two"]] });
    expect(blocks[3]).toMatchObject({ ordered: true });
  });
  it("keeps fenced code verbatim", () => {
    expect(parseBlocks("```py\nx = **1**\n```")).toEqual([{ type: "code", language: "py", content: "x = **1**" }]);
  });
  it("closes a fence the message has not closed yet", () => {
    expect(parseBlocks("```\nstill streaming")).toEqual([{ type: "code", language: "", content: "still streaming" }]);
  });
  it("reads a quote", () => {
    expect(parseBlocks("> said")).toMatchObject([{ type: "blockquote" }]);
  });
});
