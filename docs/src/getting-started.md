# Getting Started

`@cronn/playwright-utils` is a collection of utilities for writing tests with [Playwright](https://playwright.dev/), covering API testing and file snapshots.

## Installation

::: code-group

```sh [pnpm]
pnpm add -D @cronn/playwright-utils
```

```sh [npm]
npm install -D @cronn/playwright-utils
```

```sh [yarn]
yarn add -D @cronn/playwright-utils
```

:::

`@cronn/playwright-utils` requires `@playwright/test` and `@cronn/playwright-file-snapshots` as peer dependency.

## Utilities

### API Testing

[`createFetchAdapter`](/api/fetch-adapter) turns Playwright's `APIRequestContext` into a `fetch` implementation, so API clients expecting `fetch` can send their requests through Playwright.

```ts
import { fetchAdapter } from "@cronn/playwright-utils";
import { test } from "@playwright/test";

test("returns users", async ({ request }) => {
  const fetch = fetchAdapter(request);
  const response = await fetch("/api/users");
});
```

[Learn more about `createFetchAdapter` →](/api/fetch-adapter)

### Normalizers

[Normalizers](/snapshot-normalizers) mask values which are not stable across test runs, so file snapshots stay comparable. `maskedValue` and `maskedValueWithIndex` create placeholders in a consistent format, `maskBaseURL` masks the base URL of the application under test.

```ts
import { maskBaseUrl, maskedValue } from "@cronn/playwright-utils";

maskedValue("user-agent"); // [USER_AGENT]
maskBaseUrl("http://localhost:3000"); // replaces the base URL with [BASE_URL]
```

[Learn more about Normalizers →](/snapshot-normalizers)

### Types

[`PlaywrightTarget`](/utility-types) is a union of `Page` and `Locator` for helpers which accept either of both.

[Learn more about Types →](/utility-types)
