# Normalizers

File snapshots must be deterministic to be comparable across runs. Values like IDs, timestamps or environment-specific URLs are therefore replaced by a stable placeholder, using the normalizers of [`@cronn/playwright-file-snapshots`](https://cronn.github.io/file-snapshots/general/normalizers).

`@cronn/playwright-utils` provides helpers to create such placeholders in a consistent format, as well as ready-to-use normalizers built on top of them.

## `maskedValue`

Serializes `name` as a masked value in the format `[NAME]`. The name is converted to upper case, and whitespace as well as punctuation characters (e.g. ` `, `-`, `.`, `:`, `;`) are replaced by underscores.

```ts
maskedValue("id"); // [ID]
maskedValue("base url"); // [BASE_URL]
maskedValue("user-agent"); // [USER_AGENT]
```

Use it wherever a normalizer returns a replacement value, for example to mask JSON properties by key:

```ts
import { maskedValue } from "@cronn/playwright-utils";
import { test } from "@playwright/test";

import { expect } from "./fixtures";

const MASKED_PROPERTIES = new Set(["id", "created at"]);

test("returns user", async () => {
  await expect({
    id: "6f1b4e2c",
    name: "Alice",
    createdAt: "2026-05-21T08:00:01Z",
  }).toMatchJsonFile({
    normalizers: [
      (value, { key }) =>
        key !== undefined && MASKED_PROPERTIES.has(key)
          ? maskedValue(key)
          : value,
    ],
  });
});
```

**Output:**

```json [returns_user.json]
{
  "id": "[ID]",
  "name": "Alice",
  "createdAt": "[CREATED_AT]"
}
```

## `maskedValueWithIndex`

Returns a function which serializes `name` together with an index as a masked value in the format `[NAME_0]`. This matches the signature expected by [`maskPattern`](https://cronn.github.io/file-snapshots/general/normalizers#maskpattern), which assigns an incrementing index to each distinct match.

```ts
const maskTimestamp = maskedValueWithIndex("timestamp");

maskTimestamp(0); // [TIMESTAMP_0]
maskTimestamp(1); // [TIMESTAMP_1]
```

```ts
import { maskPattern } from "@cronn/playwright-file-snapshots";
import { maskedValueWithIndex } from "@cronn/playwright-utils";
import { test } from "@playwright/test";

import { expect } from "./fixtures";

const TIMESTAMP_REGEX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g;

test("returns log", async () => {
  await expect(`
    2026-05-21T08:00:01Z Application started successfully
    2026-05-21T08:03:23Z User login successful
  `).toMatchTextFile({
    normalizers: [
      maskPattern(TIMESTAMP_REGEX, maskedValueWithIndex("timestamp")),
    ],
  });
});
```

**Output:**

```[returns_log.txt]
[TIMESTAMP_0] Application started successfully
[TIMESTAMP_1] User login successful
```

## `maskBaseURL`

Returns a normalizer which replaces every occurrence of `baseURL` with `[BASE_URL]`. Use it to keep snapshots independent of the environment a test runs against, e.g. a randomly assigned port of a local dev server.

The normalizer is guarded by [`stringNormalizer`](https://cronn.github.io/file-snapshots/general/normalizers#stringnormalizer), so it can be used for JSON snapshots as well: string values are masked, values of any other type are returned unchanged. The normalizer has no effect when `baseURL` is `undefined`.

```ts
import { maskBaseURL } from "@cronn/playwright-utils";
import { test } from "@playwright/test";

import { expect } from "./fixtures";

test("returns links", async ({ baseURL }) => {
  await expect({
    self: `${baseURL}/api/users/1`,
    count: 1,
  }).toMatchJsonFile({
    normalizers: [maskBaseURL(baseURL)],
  });
});
```

**Output:**

```json [returns_links.json]
{
  "self": "[BASE_URL]/api/users/1",
  "count": 1
}
```
