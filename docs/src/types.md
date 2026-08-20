# Types

## `PlaywrightTarget`

Union of the Playwright types which can be targeted by an assertion or interaction: a whole `Page` or a single `Locator`.

```ts
type PlaywrightTarget = Page | Locator;
```

Use it for helper functions which should accept either of both, so a helper can be applied to a page as well as to a scoped part of it:

```ts
import type { PlaywrightTarget } from "@cronn/playwright-utils";
import { expect, test } from "@playwright/test";

async function expectNoErrors(target: PlaywrightTarget): Promise<void> {
  await expect(target.getByRole("alert")).toHaveCount(0);
}

test("submits form", async ({ page }) => {
  await expectNoErrors(page);
  await expectNoErrors(page.getByRole("form"));
});
```
