# Response Header Report

Security headers protect against common attacks like clickjacking, MIME sniffing or protocol downgrades, but a missing or weakened header usually goes unnoticed because the application keeps working. `responseHeaderReport` evaluates the headers of a response against a set of recommended security headers and returns a Markdown report, which can be stored as a file snapshot to detect any change to the headers.

## Usage

```ts
import {
  getResponseHeaders,
  responseHeaderReport,
} from "@cronn/playwright-utils";
import { expect, test } from "@playwright/test";

test("has secure response headers", async ({ page }) => {
  const response = await page.goto("/");
  const headers = await getResponseHeaders(response);

  expect(responseHeaderReport(headers, { type: "document" })).toMatchTextFile({
    fileExtension: "md",
  });
});

test("has secure API response headers", async ({ request }) => {
  const response = await request.get("/api/users");
  const headers = await getResponseHeaders(response);

  expect(responseHeaderReport(headers, { type: "api" })).toMatchTextFile({
    fileExtension: "md",
  });
});
```

`getResponseHeaders` extracts all headers from a page response or an `APIRequestContext` response.

The report lists all evaluated headers of the response, followed by the recommendations:

```md
# Response Header Report

## Detected Headers

| Header                         | Value                            |
| ------------------------------ | -------------------------------- |
| `cache-control`                | `no-store`                       |
| `content-security-policy`      | `default-src 'self'`             |
| `content-type`                 | `text/html`                      |
| `cross-origin-opener-policy`   | `unsafe-none`                    |
| `cross-origin-resource-policy` | `same-origin`                    |
| `strict-transport-security`    | `max-age=3600`                   |
| `x-content-type-options`       | `nosniff`                        |
| `x-robots-tag`                 | `noindex`                        |
| `permissions-policy`           | `camera=()`                      |
| `referrer-policy`              | `unsafe-url`                     |
| `x-frame-options`              | `ALLOW-FROM https://example.com` |

## Recommendations

- `cross-origin-opener-policy`: Change value to `same-origin`
- `strict-transport-security`: Change value to `max-age=31536000; includeSubDomains`
- `permissions-policy`: Change value to `geolocation=(), microphone=(), camera=()`
- `referrer-policy`: Change value to `no-referrer`
- `x-frame-options`: Change value to `DENY`
```

Headers which are neither recommended nor discouraged, like `date` or `etag`, are omitted to keep the report deterministic. Nonces in the `Content-Security-Policy` header are masked as `[NONCE_0]`, `[NONCE_1]`, … like in the [CSP Report](./csp-report.md).

Recommendations are grouped into missing headers to add, deviating headers to change and discouraged headers to remove. Header values are compared to the recommended value ignoring case and whitespace.

## Types

The `type` option selects the recommended headers. Use `document` for HTML documents rendered by the browser, and `api` for all other responses like REST or GraphQL endpoints.
