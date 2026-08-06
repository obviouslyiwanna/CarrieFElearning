import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^\)]+\))/g);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return <a key={index} href={link[2]}>{link[1]}</a>;
    }

    return <span key={index}>{part}</span>;
  });
}

function parseTableRow(line: string) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

export default function MarkdownArticle({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  let firstHeading = true;
  let firstParagraph = true;

  while (index < lines.length) {
    const line = lines[index].trimEnd();

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(<pre key={blocks.length} data-language={language}><code>{codeLines.join("\n")}</code></pre>);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const children = renderInline(heading[2]);
      if (level === 1 && firstHeading) {
        blocks.push(<h1 key={blocks.length}>{children}</h1>);
        firstHeading = false;
      } else if (level === 2) {
        blocks.push(<h2 key={blocks.length}>{children}</h2>);
      } else {
        blocks.push(<h3 key={blocks.length}>{children}</h3>);
      }
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push(<div className="article-divider" key={blocks.length} />);
      index += 1;
      continue;
    }

    if (line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = parseTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
        rows.push(parseTableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        <table key={blocks.length}>
          <thead><tr>{headers.map((header, cellIndex) => <th key={cellIndex}>{renderInline(header)}</th>)}</tr></thead>
          <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderInline(cell)}</td>)}</tr>)}</tbody>
        </table>,
      );
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].startsWith("> ")) {
        quoteLines.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push(<blockquote key={blocks.length}>{renderInline(quoteLines.join(" "))}</blockquote>);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(<li key={items.length}>{renderInline(lines[index].replace(/^[-*]\s+/, ""))}</li>);
        index += 1;
      }
      blocks.push(<ul key={blocks.length}>{items}</ul>);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(<li key={items.length}>{renderInline(lines[index].replace(/^\d+\.\s+/, ""))}</li>);
        index += 1;
      }
      blocks.push(<ol key={blocks.length}>{items}</ol>);
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^#{1,3}\s+/.test(lines[index]) &&
      !lines[index].startsWith("```") &&
      !lines[index].startsWith("> ") &&
      !/^[-*]\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index]) &&
      !(lines[index].includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) &&
      !/^(-{3,}|\*{3,})\s*$/.test(lines[index])
    ) {
      paragraphLines.push(lines[index].trimEnd());
      index += 1;
    }

    blocks.push(
      <p className={firstParagraph ? "article-lead" : undefined} key={blocks.length}>
        {renderInline(paragraphLines.join(" "))}
      </p>,
    );
    firstParagraph = false;
  }

  return <>{blocks}</>;
}
