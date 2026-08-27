# File Handling

## `resolveFromPackageRoot`

Resolves path segments against the root of the closest package and returns an absolute path. The package root is the closest directory containing a `package.json`, searched upwards from the current working directory.

```ts
import { resolveFromPackageRoot } from "@cronn/playwright-utils";

resolveFromPackageRoot("data", "users.json");
// /path/to/package/data/users.json
```

Relative paths in a Playwright configuration are resolved against the working directory of the process. Resolving them from the package root keeps them stable, even if the run is started from a subdirectory of the package:

```ts [playwright.config.ts]
import { resolveFromPackageRoot } from "@cronn/playwright-utils";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: resolveFromPackageRoot("tests"),
  outputDir: resolveFromPackageRoot("test-results"),
});
```

The same applies to test data read within a test:

```ts
import { readFile } from "node:fs/promises";

import { resolveFromPackageRoot } from "@cronn/playwright-utils";
import { test } from "@playwright/test";

test("imports users", async ({ page }) => {
  const users = await readFile(
    resolveFromPackageRoot("data", "users.json"),
    "utf-8",
  );
});
```

Path segments are resolved with [`path.resolve`](https://nodejs.org/api/path.html#pathresolvepaths), so an absolute segment is returned as is. Calling the function without segments returns the package root itself.

> [!NOTE]
> In a monorepo, the closest package is the one the working directory belongs to. Starting the run from the repository root therefore resolves against the root `package.json`. An error is thrown if no `package.json` is found at all.
