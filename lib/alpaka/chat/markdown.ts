/**
 * The markdown a chat message is written in, parsed to plain data: orkestrator's
 * `core/ui/markdown.tsx` without its renderer. Headers, quotes, lists, fenced
 * code and paragraphs; bold, italic, inline code and links. No tables, images
 * or nested lists.
 */
export type InlineNode =
  | string
  | { type: "bold" | "italic"; key: string; children: InlineNode[] }
  | { type: "link"; key: string; url: string; children: InlineNode[] }
  | { type: "code"; key: string; text: string };

export type Block =
  | { type: "header"; level: number; inline: InlineNode[] }
  | { type: "blockquote"; inline: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] }
  | { type: "code"; language: string; content: string }
  | { type: "paragraph"; inline: InlineNode[] };

// Non-global patterns: `exec` is stateless, so hoisting them is safe.
const BOLD_RE = /\*\*([\s\S]+?)\*\*/;
const ITALIC_RE = /\*([\s\S]+?)\*/;
const CODE_RE = /`([\s\S]+?)`/;
const LINK_RE = /\[([\s\S]+?)\]\(([\s\S]+?)\)/;
const HEADER_RE = /^(#{1,6})\s+(.*)$/;
const ULIST_RE = /^[*\-+]\s+(.*)$/;
const OLIST_RE = /^(\d+)\.\s+(.*)$/;

// Earliest match wins; on a tie the order below wins (bold before italic, so
// `**x**` is bold rather than an italic run starting with `*`).
const INLINE_PATTERNS = [
  ["bold", BOLD_RE],
  ["italic", ITALIC_RE],
  ["code", CODE_RE],
  ["link", LINK_RE],
] as const;

export const parseInline = (input: string): InlineNode[] => {
  const nodes: InlineNode[] = [];
  let rest = input;
  let offset = 0;

  while (rest) {
    let match: RegExpExecArray | null = null;
    let type: (typeof INLINE_PATTERNS)[number][0] | null = null;
    let index = Infinity;

    for (const [candidateType, re] of INLINE_PATTERNS) {
      const m = re.exec(rest);
      if (m && m.index < index) {
        match = m;
        type = candidateType;
        index = m.index;
      }
    }

    if (!match || !type) {
      nodes.push(rest);
      break;
    }

    if (index > 0) {
      nodes.push(rest.substring(0, index));
    }

    const key = `${type}-${offset + index}`;
    const inside = match[1];
    if (type === "code") {
      nodes.push({ type, key, text: inside });
    } else if (type === "link") {
      nodes.push({ type, key, url: match[2], children: parseInline(inside) });
    } else {
      nodes.push({ type, key, children: parseInline(inside) });
    }

    const consumed = index + match[0].length;
    rest = rest.substring(consumed);
    offset += consumed;
  }

  return nodes;
};

export const parseBlocks = (markdownText: string): Block[] => {
  const lines = markdownText.split("\n");
  const blocks: Block[] = [];

  let inCodeBlock = false;
  let codeLanguage = "";
  let codeContent: string[] = [];

  let currentList: { ordered: boolean; items: InlineNode[][] } | null = null;
  let currentParagraphLines: string[] = [];

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: "list",
        ordered: currentList.ordered,
        items: currentList.items,
      });
      currentList = null;
    }
  };

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      blocks.push({
        type: "paragraph",
        inline: parseInline(currentParagraphLines.join("\n")),
      });
      currentParagraphLines = [];
    }
  };

  const flushAll = () => {
    flushList();
    flushParagraph();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inCodeBlock) {
      if (line.trim().startsWith("```")) {
        blocks.push({
          type: "code",
          language: codeLanguage,
          content: codeContent.join("\n"),
        });
        inCodeBlock = false;
        codeLanguage = "";
        codeContent = [];
      } else {
        codeContent.push(line);
      }
      continue;
    }

    if (line.trim().startsWith("```")) {
      flushAll();
      inCodeBlock = true;
      codeLanguage = line.trim().slice(3).trim();
      continue;
    }

    const headerMatch = HEADER_RE.exec(line);
    if (headerMatch) {
      flushAll();
      blocks.push({
        type: "header",
        level: headerMatch[1].length,
        inline: parseInline(headerMatch[2]),
      });
      continue;
    }

    if (line.startsWith("> ")) {
      flushAll();
      blocks.push({ type: "blockquote", inline: parseInline(line.slice(2)) });
      continue;
    }

    const uListMatch = ULIST_RE.exec(line);
    if (uListMatch) {
      flushParagraph();
      const item = parseInline(uListMatch[1]);
      if (currentList && !currentList.ordered) {
        currentList.items.push(item);
      } else {
        flushList();
        currentList = { ordered: false, items: [item] };
      }
      continue;
    }

    const oListMatch = OLIST_RE.exec(line);
    if (oListMatch) {
      flushParagraph();
      const item = parseInline(oListMatch[2]);
      if (currentList && currentList.ordered) {
        currentList.items.push(item);
      } else {
        flushList();
        currentList = { ordered: true, items: [item] };
      }
      continue;
    }

    if (line.trim() === "") {
      flushAll();
      continue;
    }

    flushList();
    currentParagraphLines.push(line);
  }

  flushAll();
  if (inCodeBlock) {
    blocks.push({
      type: "code",
      language: codeLanguage,
      content: codeContent.join("\n"),
    });
  }

  return blocks;
};
