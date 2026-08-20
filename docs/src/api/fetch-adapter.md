# `fetchAdapter`

Playwright's [`request`](https://playwright.dev/docs/api-testing) fixture provides an `APIRequestContext`, which has its own request API and is not compatible with the [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch) API of the platform. `fetchAdapter` wraps an `APIRequestContext` into a function with the signature of `fetch`, so any library expecting `fetch` can send its requests through Playwright.

This is especially useful for reusing an API client of the application under test (e.g. a generated OpenAPI client) inside tests: requests are sent through Playwright, which means they share the configuration of the request context (`baseURL`, `extraHTTPHeaders`, cookies and storage state, proxy settings) and are recorded in Playwright's traces and reports.

## Usage

```ts
import { fetchAdapter } from "@cronn/playwright-utils";
import { expect, test } from "@playwright/test";

test("returns users", async ({ request }) => {
  const fetch = fetchAdapter(request);

  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Alice" }),
  });

  expect(response.status).toBe(201);
});
```

Relative URLs are resolved against the `baseURL` of the request context, which is inherited from the `baseURL` of the Playwright configuration.

### Using an API client

Clients accepting a custom `fetch` implementation can be configured with the adapter, so all their requests are sent through Playwright:

```ts
import { fetchAdapter } from "@cronn/playwright-utils";
import { expect, test } from "@playwright/test";
import createClient from "openapi-fetch";

test("returns users", async ({ request }) => {
  const client = createClient<paths>({
    baseUrl: "http://localhost:3000",
    fetch: fetchAdapter(request),
  });

  const { data } = await client.GET("/api/users");

  expect(data).toEqual([]);
});
```

## Supported request options

| `fetch` argument          | Mapped to                                                 |
| ------------------------- | --------------------------------------------------------- |
| `input` as `string`       | request URL                                               |
| `input` as `URL`          | request URL, serialized via `toString()`                  |
| `input` as `Request`      | request URL, method, headers and body                     |
| `init.method`             | `method`                                                  |
| `init.headers`            | `headers`, given as record, array of entries or `Headers` |
| `init.body`               | `data`                                                    |
| `init.body` as `FormData` | `multipart`, sent as `multipart/form-data`                |

> [!NOTE]
> If `input` is a `Request`, its method, headers and body take precedence over `init`. Pass options either as part of the `Request` or via `init`, but not both.

## Limitations

- Only `method`, `headers` and `body` are forwarded. Other properties of `RequestInit`, such as `signal`, `credentials`, `mode`, `cache` and `redirect`, are ignored.
- The returned `Response` is constructed from the status, headers and body of the Playwright response. Properties which are not part of that response, such as `statusText`, `url` and `redirected`, are not populated.
- The response body is read into memory, so streaming responses are not supported.
