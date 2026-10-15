import { markdownTable } from "markdown-table";

interface MarkdownSection {
  heading: string;
  content: string;
}

const NONE = "None";

/**
 * Creates a Markdown document with a top-level title and a second-level
 * heading for each section.
 */
export function markdownDocument(
  title: string,
  sections: Array<MarkdownSection>,
): string {
  return [
    `# ${title}`,
    ...sections.flatMap((section) => [
      `## ${section.heading}`,
      section.content,
    ]),
  ]
    .join("\n\n")
    .concat("\n");
}

/**
 * Creates a Markdown table, or `None` if there are no rows.
 */
export function markdownTableOrNone(
  header: Array<string>,
  rows: Array<Array<string>>,
): string {
  return rows.length === 0 ? NONE : markdownTable([header, ...rows]);
}

/**
 * Creates a Markdown list with an item per entry formatted as
 * `` `name`: message ``, or `None` if there are no entries.
 */
export function markdownEntriesOrNone(
  entries: Array<{ name: string; message: string }>,
): string {
  return entries.length === 0
    ? NONE
    : entries
        .map((entry) => `- ${code(entry.name)}: ${entry.message}`)
        .join("\n");
}

/**
 * Formats a value as inline code, or as `_none_` if the value is blank.
 */
export function codeOrNone(text: string): string {
  return text.trim() === "" ? "_none_" : code(text);
}

/**
 * Formats a text as inline code. Pipes are escaped to keep tables intact.
 */
export function code(text: string): string {
  return `\`${text.replaceAll("|", "\\|")}\``;
}
