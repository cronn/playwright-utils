import { test } from "@playwright/test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import {
  getResponseHeaders,
  responseHeaderReport,
  type ResponseHeaderType,
} from "../src/security/response-header-report";
import { expect } from "../src/test/fixtures";

const SERVER_URL = "https://response-header-report.test";

const COMPLIANT_API_HEADERS = {
  "cache-control": "no-store",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  "content-type": "application/json",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex",
};

const COMPLIANT_DOCUMENT_HEADERS = {
  ...COMPLIANT_API_HEADERS,
  "content-security-policy": "default-src 'self'",
  "content-type": "text/html",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
};

test.describe("document", () => {
  test("recommends nothing for compliant headers", async () => {
    await testResponseHeaderReport(COMPLIANT_DOCUMENT_HEADERS, "document");
  });

  test("recommends all headers for empty headers", async () => {
    await testResponseHeaderReport({}, "document");
  });

  test("accepts stricter values", async () => {
    await testResponseHeaderReport(
      {
        ...COMPLIANT_DOCUMENT_HEADERS,
        "strict-transport-security":
          'max-age="63072000"; includeSubDomains; preload',
        "permissions-policy":
          "camera=(), microphone=(), geolocation=(), payment=()",
      },
      "document",
    );
  });

  test("recommends changing deviating values", async () => {
    await testResponseHeaderReport(
      {
        ...COMPLIANT_DOCUMENT_HEADERS,
        "strict-transport-security": "max-age=3600",
        "x-frame-options": "ALLOW-FROM https://example.com",
        "referrer-policy": "unsafe-url",
        "cross-origin-opener-policy": "unsafe-none",
        "permissions-policy": "camera=()",
      },
      "document",
    );
  });

  test("ignores unrelated headers and masks CSP nonces", async () => {
    await testResponseHeaderReport(
      {
        ...COMPLIANT_DOCUMENT_HEADERS,
        "content-security-policy":
          "default-src 'self'; script-src 'nonce-abc'; style-src 'nonce-abc'",
        date: "Wed, 07 Oct 2026 12:00:00 GMT",
        etag: '"abc"',
      },
      "document",
    );
  });

  test("recommends removing discouraged headers", async () => {
    await testResponseHeaderReport(
      {
        ...COMPLIANT_DOCUMENT_HEADERS,
        "Access-Control-Allow-Origin": "*",
        "X-XSS-Protection": "1; mode=block",
      },
      "document",
    );
  });
});

test.describe("api", () => {
  test("recommends nothing for compliant headers", async () => {
    await testResponseHeaderReport(COMPLIANT_API_HEADERS, "api");
  });

  test("recommends all headers for empty headers", async () => {
    await testResponseHeaderReport({}, "api");
  });

  test("recommends changing deviating values", async () => {
    await testResponseHeaderReport(
      {
        ...COMPLIANT_API_HEADERS,
        "cross-origin-opener-policy": "unsafe-none",
        "cross-origin-resource-policy": "cross-origin",
        "x-content-type-options": "none",
      },
      "api",
    );
  });

  test("recommends removing discouraged headers", async () => {
    await testResponseHeaderReport(
      {
        ...COMPLIANT_API_HEADERS,
        "Access-Control-Allow-Origin": "*",
        "X-XSS-Protection": "1; mode=block",
      },
      "api",
    );
  });
});

test("compares header values ignoring case and whitespace", async () => {
  await testResponseHeaderReport(
    {
      ...COMPLIANT_API_HEADERS,
      "cross-origin-opener-policy": " Same-Origin ",
      "strict-transport-security": "MAX-AGE=31536000 ;includesubdomains;",
      "x-content-type-options": "NoSniff",
    },
    "api",
  );
});

test("extracts all headers from a response", async ({ page }) => {
  await page.route(`${SERVER_URL}/**`, (route) =>
    route.fulfill({
      contentType: "text/html",
      headers: { "x-content-type-options": "nosniff" },
      body: "<!doctype html>",
    }),
  );

  const response = await page.goto(SERVER_URL);

  expect(await getResponseHeaders(response)).toMatchObject({
    "content-type": "text/html",
    "x-content-type-options": "nosniff",
  });
});

test("extracts all headers from an API response", async ({ playwright }) => {
  const server = createServer((_request, response) => {
    response.setHeader("x-content-type-options", "nosniff");
    response.end();
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const request = await playwright.request.newContext();

  try {
    const response = await request.get(`http://localhost:${port}`);

    expect(await getResponseHeaders(response)).toMatchObject({
      "x-content-type-options": "nosniff",
    });
  } finally {
    await request.dispose();
    server.close();
  }
});

test("falls back to empty headers if the response is missing", async () => {
  expect(await getResponseHeaders(null)).toEqual({});
});

async function testResponseHeaderReport(
  headers: Record<string, string>,
  type: ResponseHeaderType,
): Promise<void> {
  await expect
    .soft(responseHeaderReport(headers, { type }))
    .toMatchTextFile({ fileExtension: "md" });
}
