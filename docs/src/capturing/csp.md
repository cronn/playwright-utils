# CSP Captor

Browsers report Content Security Policy violations through the [`securitypolicyviolation`](https://developer.mozilla.org/en-US/docs/Web/API/Document/securitypolicyviolation_event) DOM event, which Playwright does not expose directly. Console messages can be filtered for CSP-related text, but that only gives free-text matching, not the structured violation data (directive, blocked URI, enforce vs. report-only, source location).

`CspCaptor` bundles the steps needed to observe this event: it registers a listener on every document of a page, collects the violations in an array, and can limit the capturing to a single action.

## Usage

```ts
import { captureCspViolations } from "@cronn/playwright-utils";
import { expect, test } from "@playwright/test";

test("does not violate its Content Security Policy", async ({ page }) => {
  const cspCaptor = captureCspViolations(page);

  await cspCaptor.during(() => page.goto("/users"));

  expect(cspCaptor.violations).toEqual([]);
});
```

Captured violations are available in the `violations` array, in the order in which they were reported by the page. The array is filled while the captor is running, so it can also be inspected inside the action.

Several captors can run on the same page at the same time, and every captor receives all violations independently.

::: warning
Because violations are captured through an init script, `startCapture` (or `during`) has to be called before the page navigates for violations of the initial load to be captured.
:::

## Manual capturing and the default fixture

`@cronn/playwright-utils` ships `cspFixtures`, ready to merge into your own test file. It installs a `cspCaptor` fixture automatically on every test and fails the test if it produced any unexpected CSP violation:

```ts
import { cspFixtures, type CspFixtures } from "@cronn/playwright-utils";
import { test as base } from "@playwright/test";

export const test = base.extend<CspFixtures>({
  ...cspFixtures,
  // ...other fixtures
});
```

To disable the automatic check for an individual test or file, use the `ignoreCspViolations` option fixture:

```ts
test.use({ ignoreCspViolations: true });
```

The `cspCaptor` fixture keeps capturing regardless, so a test targeting CSP behavior specifically can disable the automatic check and assert on the triggered violation itself:

```ts
test.use({ ignoreCspViolations: true });

test("shows a warning banner on CSP violation", async ({ page, cspCaptor }) => {
  await page.getByRole("button", { name: "Load untrusted script" }).click();

  expect(cspCaptor.violations).toMatchJsonFile();
});
```

## Clearing captured violations

`clearViolations` empties the `violations` array without affecting the capturing itself, so a running captor keeps collecting the violations reported afterwards. This is useful to ignore the output of a setup step:

```ts
const cspCaptor = captureCspViolations(page);
await cspCaptor.startCapture();

await page.goto("/users");
cspCaptor.clearViolations();

await page.getByRole("button", { name: "Load widget" }).click();
expect(cspCaptor.violations).toEqual([]);
```
