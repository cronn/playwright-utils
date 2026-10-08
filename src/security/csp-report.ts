import type { Response } from "@playwright/test";
import { markdownTable } from "markdown-table";

import { maskedValueWithIndex } from "../normalizers/masked-value";

interface CspDirective {
  name: string;
  values: Array<string>;
}

interface CspRecommendation {
  directive: string;
  message: string;
}

interface CspEvaluation {
  directives: Array<CspDirective>;
  recommendations: Array<CspRecommendation>;
}

interface RecommendedDirective {
  name: string;
  values?: Array<string>;
  requireNonce?: boolean;
  tolerated?: Array<string>;
  fallback?: string;
}

const RECOMMENDED_DIRECTIVES: Array<RecommendedDirective> = [
  { name: "upgrade-insecure-requests" },
  { name: "trusted-types" },
  { name: "require-trusted-types-for", values: ["'script'"] },
  { name: "default-src", values: ["'self'"] },
  {
    name: "script-src",
    requireNonce: true,
    tolerated: ["'strict-dynamic'"],
    fallback: "default-src",
  },
  {
    name: "style-src",
    requireNonce: true,
    fallback: "default-src",
  },
  { name: "img-src", values: ["'self'", "data:"], fallback: "default-src" },
  { name: "font-src", values: ["'self'"], fallback: "default-src" },
  { name: "connect-src", values: ["'self'"], fallback: "default-src" },
  { name: "object-src", values: ["'none'"] },
  { name: "base-uri", values: ["'self'"] },
  { name: "form-action", values: ["'self'"] },
  { name: "frame-ancestors", values: ["'none'"] },
];

const NONCE_PLACEHOLDER = "'nonce-<random>'";

const MASKED_NONCE = maskedValueWithIndex("NONCE");

/**
 * Returns the `Content-Security-Policy` header of a response, or an empty
 * string if the response or the header is missing.
 */
export async function getCspHeader(response: Response | null): Promise<string> {
  return (await response?.headerValue("content-security-policy")) ?? "";
}

/**
 * Evaluates a `Content-Security-Policy` header against a set of recommended
 * directives and returns the result as a Markdown report.
 *
 * The report lists all directives of the header, followed by recommendations
 * for missing or weak directives. Missing fetch directives are evaluated using
 * `default-src`, just like the browser falls back to it. Nonces are masked as
 * `[NONCE_0]`, `[NONCE_1]`, … to keep the report deterministic for file snapshots.
 *
 * @example
 * ```ts
 * const response = await page.goto("/");
 * const cspHeader = await getCspHeader(response);
 *
 * expect(cspReport(cspHeader)).toMatchTextFile({
 *   fileExtension: "md",
 * });
 * ```
 */
export function cspReport(header: string): string {
  const { directives, recommendations } = evaluateCsp(parseCsp(header));

  return [
    "# CSP Report",
    "## Detected Directives",
    directives.length === 0
      ? "None"
      : markdownTable([
          ["Directive", "Value"],
          ...maskNonces(directives).map((directive) => [
            code(directive.name),
            formatValues(directive.values),
          ]),
        ]),
    "## Recommendations",
    recommendations.length === 0
      ? "None"
      : recommendations
          .map(
            (recommendation) =>
              `- ${code(recommendation.directive)}: ${recommendation.message}`,
          )
          .join("\n"),
  ]
    .join("\n\n")
    .concat("\n");
}

function parseCsp(header: string): Array<CspDirective> {
  return header
    .split(";")
    .map((directive) => directive.trim())
    .filter((directive) => directive !== "")
    .map((directive) => {
      const [name = "", ...values] = directive.split(/\s+/);
      return { name: name.toLowerCase(), values };
    });
}

function evaluateCsp(directives: Array<CspDirective>): CspEvaluation {
  const directivesByName = new Map<string, CspDirective>();
  for (const directive of directives) {
    if (!directivesByName.has(directive.name)) {
      directivesByName.set(directive.name, directive);
    }
  }

  const recommendations = RECOMMENDED_DIRECTIVES.flatMap((recommended) =>
    evaluateDirective(recommended, directivesByName).map((message) => ({
      directive: recommended.name,
      message,
    })),
  );

  return { directives, recommendations };
}

function evaluateDirective(
  recommended: RecommendedDirective,
  directivesByName: Map<string, CspDirective>,
): Array<string> {
  const directive = directivesByName.get(recommended.name);
  const fallback =
    recommended.fallback !== undefined
      ? directivesByName.get(recommended.fallback)
      : undefined;
  const actual = directive ?? fallback;

  if (actual === undefined) {
    return [
      `Missing, add ${code([recommended.name, ...formatRecommendedValues(recommended)].join(" "))}`,
    ];
  }

  const inherited =
    directive === undefined ? ` (inherited from ${code(actual.name)})` : "";
  const messages: Array<string> = [];
  const recommendedValues = recommended.values;
  const extraValues = findExtraValues(recommended, actual.values);
  const hasRecommendedValue = extraValues.length < actual.values.length;

  if (
    recommendedValues !== undefined &&
    extraValues.length > 0 &&
    !hasRecommendedValue
  ) {
    messages.push(`Add ${formatValues(recommendedValues)}`);
  }

  if (recommended.requireNonce === true && !actual.values.some(isNonce)) {
    messages.push(`Add a nonce source`);
  }

  for (const value of extraValues) {
    messages.push(`Remove ${code(value)}${inherited}`);
  }

  return messages;
}

/**
 * Returns all sources which are neither recommended nor tolerated. Directives
 * without recommended sources accept any value, and `'none'` is always
 * accepted as it is stricter than any recommendation.
 */
function findExtraValues(
  recommended: RecommendedDirective,
  values: Array<string>,
): Array<string> {
  if (
    (recommended.values === undefined && recommended.requireNonce !== true) ||
    isNone(values)
  ) {
    return [];
  }

  const acceptedValues = [
    ...(recommended.values ?? []),
    ...(recommended.tolerated ?? []),
  ];

  return values.filter(
    (value) =>
      !acceptedValues.includes(value) &&
      !(recommended.requireNonce === true && isNonce(value)),
  );
}

function formatRecommendedValues(
  recommended: RecommendedDirective,
): Array<string> {
  return [
    ...(recommended.requireNonce === true ? [NONCE_PLACEHOLDER] : []),
    ...(recommended.values ?? []),
  ];
}

function maskNonces(directives: Array<CspDirective>): Array<CspDirective> {
  const nonceIndices = new Map<string, number>();

  function maskNonce(value: string): string {
    if (!isNonce(value)) {
      return value;
    }

    let index = nonceIndices.get(value);
    if (index === undefined) {
      index = nonceIndices.size;
      nonceIndices.set(value, index);
    }

    return `'nonce-${MASKED_NONCE(index)}'`;
  }

  return directives.map((directive) => ({
    ...directive,
    values: directive.values.map(maskNonce),
  }));
}

function isNone(values: Array<string>): boolean {
  return values.length === 1 && values[0] === "'none'";
}

function isNonce(value: string): boolean {
  return value.startsWith("'nonce-");
}

function formatValues(values: Array<string>): string {
  if (values.length === 0) {
    return "_none_";
  }

  return code(values.join(" "));
}

function code(text: string): string {
  return `\`${text.replaceAll("|", "\\|")}\``;
}
