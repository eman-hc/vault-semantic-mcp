import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import type { Root } from "mdast";
import type { Chunk } from "../types/index.js";

const TOKENS_PER_CHAR = 0.25;
const MAX_CHUNK_TOKENS = 500;
const MIN_CHUNK_CHARS = 50;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR);
}

/** Get markdown string for a slice of the AST (from start to end child indices). */
function sliceToMarkdown(children: unknown[], start: number, end: number): string {
  const slice = children.slice(start, end);
  const tree: Root = { type: "root", children: slice as Root["children"] };
  return unified().use(remarkStringify).stringify(tree);
}

function processSections(children: unknown[], chunks: Chunk[]): void {
  const nodes = children as { type: string; depth?: number }[];
  let i = 0;
  const headingPath: string[] = [];

  while (i < nodes.length) {
    const node = nodes[i];
    if (node.type === "heading" && node.depth) {
      const title = (node as { children?: { value?: string }[] }).children
        ?.map((c: { value?: string }) => c.value ?? "")
        .join("")
        .trim() ?? "";
      headingPath.length = node.depth - 1;
      headingPath.push(title);

      let j = i + 1;
      while (j < nodes.length && (nodes[j] as { type: string }).type !== "heading") j++;

      const sectionContent = sliceToMarkdown(children, i, j);
      const text = sectionContent.trim();
      if (text.length >= MIN_CHUNK_CHARS) {
        const tokenEst = estimateTokens(text);
        if (tokenEst <= MAX_CHUNK_TOKENS) {
          chunks.push({
            headingPath: headingPath.join(" > "),
            text,
            tokenEstimate: tokenEst,
          });
        } else {
          const paras = text.split(/\n\n+/);
          let acc = "";
          let accTokens = 0;
          for (const p of paras) {
            const pt = estimateTokens(p);
            if (accTokens + pt > MAX_CHUNK_TOKENS && acc) {
              chunks.push({
                headingPath: headingPath.join(" > "),
                text: acc.trim(),
                tokenEstimate: accTokens,
              });
              acc = "";
              accTokens = 0;
            }
            acc += p + "\n\n";
            accTokens += pt;
          }
          if (acc.trim()) {
            chunks.push({
              headingPath: headingPath.join(" > "),
              text: acc.trim(),
              tokenEstimate: estimateTokens(acc.trim()),
            });
          }
        }
      }
      i = j;
    } else {
      i++;
    }
  }
}

export function chunkMarkdown(content: string): Chunk[] {
  const tree = unified().use(remarkParse).parse(content) as Root;
  const children = tree.children;
  const chunks: Chunk[] = [];

  let preHeadingEnd = 0;
  while (preHeadingEnd < children.length && (children[preHeadingEnd] as { type: string }).type !== "heading") {
    preHeadingEnd++;
  }
  if (preHeadingEnd > 0) {
    const intro = sliceToMarkdown(children, 0, preHeadingEnd).trim();
    if (intro.length >= MIN_CHUNK_CHARS) {
      chunks.push({
        headingPath: "",
        text: intro,
        tokenEstimate: estimateTokens(intro),
      });
    }
  }

  processSections(children, chunks);
  return chunks;
}
