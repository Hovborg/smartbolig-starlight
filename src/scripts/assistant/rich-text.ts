// Safely formats model Markdown (paragraphs, headings, lists, fenced code) as DOM nodes.
import { appendInlineFormatting } from "./inline-format";

export function createRichTextRenderer(createSafeCodeBlock: (code: string, language: string) => HTMLElement) {
  function createSafeRichText(content) {
    const container = document.createElement("div");
    container.className = "smartbolig-ai__rich-text";
    const lines = String(content).replace(/\r\n?/g, "\n").split("\n");
    let paragraphLines: string[] = [];
    let list: HTMLElement | null = null;
    let listKind = "";
    let codeLanguage: string | null = null;
    let codeLines: string[] = [];

    const flushParagraph = () => {
      if (paragraphLines.length === 0) return;
      const paragraph = document.createElement("p");
      appendInlineFormatting(paragraph, paragraphLines.join(" "));
      container.append(paragraph);
      paragraphLines = [];
    };

    const closeList = () => {
      list = null;
      listKind = "";
    };

    const flushCode = () => {
      if (codeLanguage === null) return;
      container.append(createSafeCodeBlock(codeLines.join("\n"), codeLanguage));
      codeLanguage = null;
      codeLines = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const fenceMatch = line.match(/^```([a-zA-Z0-9_+-]{0,20})\s*$/);

      if (codeLanguage !== null) {
        if (fenceMatch) flushCode();
        else codeLines.push(rawLine);
        continue;
      }

      if (fenceMatch) {
        flushParagraph();
        closeList();
        codeLanguage = fenceMatch[1] || "";
        codeLines = [];
        continue;
      }

      if (!line) {
        flushParagraph();
        closeList();
        continue;
      }

      const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        closeList();
        const heading = document.createElement("h3");
        appendInlineFormatting(heading, headingMatch[1]);
        container.append(heading);
        continue;
      }

      const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
      const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
      if (unorderedMatch || orderedMatch) {
        flushParagraph();
        const nextKind = orderedMatch ? "ol" : "ul";
        if (!list || listKind !== nextKind) {
          list = nextKind === "ol" ? document.createElement("ol") : document.createElement("ul");
          listKind = nextKind;
          container.append(list);
        }
        const item = document.createElement("li");
        appendInlineFormatting(item, (orderedMatch || unorderedMatch)![1]);
        list.append(item);
        continue;
      }

      closeList();
      paragraphLines.push(line);
    }

    flushParagraph();
    flushCode();
    return container;
  }

  return createSafeRichText;
}
