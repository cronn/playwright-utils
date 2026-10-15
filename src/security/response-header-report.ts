import type { APIResponse, Response } from "@playwright/test";

import {
  code,
  codeOrNone,
  markdownDocument,
  markdownEntriesOrNone,
  markdownTableOrNone,
} from "../utils/markdown";

import { maskCspNonces } from "./csp-report";

export type ResponseHeaderType = "document" | "api";

export interface ResponseHeaderReportOptions {
  type: ResponseHeaderType;
}

interface ResponseHeader {
  name: string;
  value: string;
}

interface RecommendedHeader {
  name: string;
  recommended?: string;
  isAccepted?: (value: string) => boolean;
}

type HeaderAction = "add" | "change" | "remove";

interface HeaderRecommendation {
  name: string;
  action: HeaderAction;
  message: string;
}

const ACTION_ORDER: Array<HeaderAction> = ["add", "change", "remove"];

const MIN_HSTS_MAX_AGE = 31_536_000;

const PERMISSIONS_POLICY = "geolocation=(), microphone=(), camera=()";

const RECOMMENDED_COMMON_HEADERS: Array<RecommendedHeader> = [
  { name: "cache-control" },
  { name: "content-security-policy" },
  { name: "content-type" },
  { name: "cross-origin-opener-policy", recommended: "same-origin" },
  {
    name: "cross-origin-resource-policy",
    recommended: "same-origin",
  },
  {
    name: "strict-transport-security",
    recommended: `max-age=${MIN_HSTS_MAX_AGE}; includeSubDomains`,
    isAccepted: isStrictHsts,
  },
  {
    name: "x-content-type-options",
    recommended: "nosniff",
  },
  {
    name: "x-robots-tag",
  },
];

const DISCOURAGED_COMMON_HEADERS = ["access-control-allow-origin"];

const RECOMMENDED_DOCUMENT_HEADERS: Array<RecommendedHeader> = [
  ...RECOMMENDED_COMMON_HEADERS,
  {
    name: "permissions-policy",
    recommended: PERMISSIONS_POLICY,
    isAccepted: isRestrictivePermissionsPolicy,
  },
  {
    name: "referrer-policy",
    recommended: "no-referrer",
  },
  {
    name: "x-frame-options",
    recommended: "DENY",
  },
];

const DISCOURAGED_DOCUMENT_HEADERS = [
  ...DISCOURAGED_COMMON_HEADERS,
  "x-xss-protection",
];

const RECOMMENDED_HEADERS: Record<
  ResponseHeaderType,
  Array<RecommendedHeader>
> = {
  document: RECOMMENDED_DOCUMENT_HEADERS,
  api: RECOMMENDED_COMMON_HEADERS,
};

const DISCOURAGED_HEADERS: Record<ResponseHeaderType, Array<string>> = {
  document: DISCOURAGED_DOCUMENT_HEADERS,
  api: DISCOURAGED_COMMON_HEADERS,
};

/**
 * Returns all headers of a response, or an empty object if the response is
 * missing. For page responses, this uses `response.allHeaders()`, which in
 * contrast to `response.headers()` includes security-related headers.
 */
export async function getResponseHeaders(
  response: Response | APIResponse | null,
): Promise<Record<string, string>> {
  if (response === null) {
    return {};
  }

  return "allHeaders" in response
    ? await response.allHeaders()
    : response.headers();
}

/**
 * Evaluates the headers of a response against a set of recommended security
 * headers and returns the result as a Markdown report.
 *
 * The report lists all evaluated headers of the response, followed by
 * recommendations for missing or deviating headers and for discouraged headers
 * to remove. Unrelated headers like `date` are omitted to keep the report
 * deterministic for file snapshots.
 *
 * @example
 * ```ts
 * const response = await page.goto("/");
 * const headers = await getResponseHeaders(response);
 *
 * expect(responseHeaderReport(headers, { type: "document" })).toMatchTextFile({
 *   fileExtension: "md",
 * });
 * ```
 */
export function responseHeaderReport(
  headers: Record<string, string>,
  options: ResponseHeaderReportOptions,
): string {
  const recommendedHeaders = RECOMMENDED_HEADERS[options.type];
  const discouragedHeaders = DISCOURAGED_HEADERS[options.type];
  const headersByName = new Map(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );
  const detectedHeaders = [
    ...recommendedHeaders.map((recommended) => recommended.name),
    ...discouragedHeaders,
  ].flatMap((name): Array<ResponseHeader> => {
    const value = headersByName.get(name);
    return value === undefined ? [] : [{ name, value }];
  });
  const recommendations = [
    ...recommendedHeaders.flatMap((recommended) =>
      evaluateHeader(recommended, headersByName.get(recommended.name)),
    ),
    ...discouragedHeaders
      .filter((name) => headersByName.has(name))
      .map((name): HeaderRecommendation => ({
        name,
        action: "remove",
        message: "Remove header",
      })),
  ].sort(
    (a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action),
  );

  return markdownDocument("Response Header Report", [
    {
      heading: "Detected Headers",
      content: markdownTableOrNone(
        ["Header", "Value"],
        detectedHeaders.map((header) => [
          code(header.name),
          formatValue(header),
        ]),
      ),
    },
    {
      heading: "Recommendations",
      content: markdownEntriesOrNone(recommendations),
    },
  ]);
}

function evaluateHeader(
  recommended: RecommendedHeader,
  value: string | undefined,
): Array<HeaderRecommendation> {
  if (value === undefined) {
    return [
      {
        name: recommended.name,
        action: "add",
        message:
          recommended.recommended === undefined
            ? "Missing, add header"
            : `Missing, add ${code(recommended.recommended)}`,
      },
    ];
  }

  if (
    recommended.recommended === undefined ||
    isAcceptedValue(recommended, value)
  ) {
    return [];
  }

  return [
    {
      name: recommended.name,
      action: "change",
      message: `Change value to ${code(recommended.recommended)}`,
    },
  ];
}

/**
 * Accepts a value if it passes the custom check of the header, or otherwise
 * if it equals the recommended value ignoring case and whitespace.
 */
function isAcceptedValue(
  recommended: RecommendedHeader,
  value: string,
): boolean {
  if (recommended.isAccepted !== undefined) {
    return recommended.isAccepted(value);
  }

  return (
    recommended.recommended === undefined ||
    normalizeValue(value) === normalizeValue(recommended.recommended)
  );
}

function isStrictHsts(value: string): boolean {
  const directives = normalizeValue(value).split("; ");
  const maxAge = directives
    .find((directive) => directive.startsWith("max-age="))
    ?.slice("max-age=".length)
    .replaceAll('"', "");

  return (
    maxAge !== undefined &&
    Number(maxAge) >= MIN_HSTS_MAX_AGE &&
    directives.includes("includesubdomains")
  );
}

/**
 * Accepts a policy if it restricts at least the recommended permissions, so
 * stricter policies restricting further permissions are accepted as well.
 */
function isRestrictivePermissionsPolicy(value: string): boolean {
  const actualPermissions = parsePermissionsPolicy(value);
  return Array.from(parsePermissionsPolicy(PERMISSIONS_POLICY)).every(
    (permission) => actualPermissions.has(permission),
  );
}

function parsePermissionsPolicy(value: string): Set<string> {
  return new Set(value.split(",").map(normalizeValue));
}

/**
 * Normalizes a header value for comparison by ignoring case, whitespace and
 * empty `;`-separated parts.
 */
function normalizeValue(value: string): string {
  return value
    .toLowerCase()
    .split(";")
    .map((part) => part.trim().replaceAll(/\s+/g, " "))
    .filter((part) => part !== "")
    .join("; ");
}

function formatValue(header: ResponseHeader): string {
  return codeOrNone(
    header.name === "content-security-policy"
      ? maskCspNonces(header.value)
      : header.value,
  );
}
