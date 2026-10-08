# CSP Report

A Content Security Policy is only effective if it is strict enough, and a weakened policy usually goes unnoticed because the application keeps working. `cspReport` evaluates a `Content-Security-Policy` header against a set of recommended directives and returns a Markdown report, which can be stored as a file snapshot to detect any change to the policy.

## Usage

```ts
import { cspReport, getCspHeader } from "@cronn/playwright-utils";
import { expect, test } from "@playwright/test";

test("has a strict Content Security Policy", async ({ page }) => {
  const response = await page.goto("/");
  const cspHeader = await getCspHeader(response);

  expect(cspReport(cspHeader)).toMatchTextFile({
    fileExtension: "md",
  });
});
```

`getCspHeader` extracts the `Content-Security-Policy` header from a response. It accepts the nullable result of `page.goto()` and returns an empty string if the response or the header is missing, which `cspReport` reports as a policy without any directives.

The report lists all directives of the header, followed by the recommendations for the policy:

```md
# CSP Report

## Directives

| Directive                   | Value               |
| --------------------------- | ------------------- |
| `upgrade-insecure-requests` | _none_              |
| `trusted-types`             | `angular`           |
| `require-trusted-types-for` | `'script'`          |
| `default-src`               | `'self'`            |
| `script-src`                | `'strict-dynamic'`  |
| `style-src`                 | `'nonce-[NONCE_0]'` |
| `object-src`                | `'none'`            |
| `base-uri`                  | `'none'`            |
| `form-action`               | `'self'`            |
| `frame-ancestors`           | `'none'`            |

## Recommendations

- `script-src`: Add a nonce source
```

Nonces are generated per response, so they are masked as `[NONCE_0]`, `[NONCE_1]`, … to keep the report deterministic. The same nonce used by several directives is masked with the same index.

A directive is considered compliant if it only contains recommended values or is set to `'none'`, so a stricter policy does not produce a recommendation. Extra sources which are not recommended are reported individually. If a directive contains none of the recommended values, the expected value is reported instead.

If one of the fetch directives `script-src`, `style-src`, `img-src`, `font-src` or `connect-src` is missing, it is evaluated using `default-src`. Recommendations resulting from the fallback are marked as `(inherited from default-src)`.
