# Configuration

## `isCI`

Flag indicating whether the tests run in a CI environment. It is `true` if the environment variable `CI` is set to `"true"`, which most CI providers (e.g. GitHub Actions, GitLab CI, Jenkins) do by default.

Use it to configure a Playwright project differently on CI than locally:

```ts [playwright.config.ts]
import { isCI } from "@cronn/playwright-utils";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? "github" : "html",
});
```

> [!NOTE]
> The flag is evaluated once when the module is loaded. Changing `process.env.CI` afterwards has no effect.
