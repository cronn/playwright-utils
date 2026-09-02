# Route Interceptor

Playwright's [`page.route`](https://playwright.dev/docs/network#network-mocking) installs a route handler for the whole page, which has to be removed again with `page.unroute` once the test no longer needs it.
This library provides various utilities to scope these route interceptors to a function callback, to temporarily modify the behavior of a network request.

This keeps mocking close to the assertions it belongs to and makes it possible to change the behavior of the same route multiple times within one test.

## Usage

```ts
import { interceptRoute, matchPath } from "@cronn/playwright-utils";
import { expect, test } from "@playwright/test";

test("shows an error when the user cannot be loaded", async ({ page }) => {
  await interceptRoute(page, matchPath("/api/users/1"))
    .abort()
    .during(async () => {
      await page.goto("/users/1/profile");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Unknown user",
      );
    });
});
```

Requests which are not matched by the filter are passed on to the next matching route handler, so interceptions can be nested and combined with route handlers registered elsewhere.

## Filtering requests

A `RouteFilter` selects the requests to intercept. `matchPath` creates a filter matching the path of a URL, either exactly or by regular expression. Query parameters, host and protocol are ignored:

```ts
import { matchPath } from "@cronn/playwright-utils";

matchPath("/api/users/1");
matchPath(/^\/api\/users\/\d+$/);
```

Filters can also be written by hand, for example to restrict an interception to certain HTTP methods:

```ts
import type { RouteFilter } from "@cronn/playwright-utils";

const onCreateOrUpdateUser: RouteFilter = {
  method: ["POST", "PUT"],
  url: (url) => url.pathname.startsWith("/api/users"),
};
```

| Property | Type                              | Description                                         |
| -------- | --------------------------------- | --------------------------------------------------- |
| `url`    | `(url: URL) => boolean`           | Decides whether the URL of a request is matched     |
| `method` | `HttpMethod \| Array<HttpMethod>` | Optional. Matches requests of any method if omitted |

## Interceptions

All methods of a `RouteInterceptor` take the action to run while the interception is installed and return the value of that action.

### Aborting requests

`abort` fails matching requests, which is useful for testing how the application under test handles network errors:

```ts
await interceptRoute(page, matchPath("/api/users/1"))
  .abort()
  .during(async () => {
    await page.getByRole("button", { name: "Fetch user" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
  });
```

### Mocking responses

`respondWith` answers matching requests with a mocked response, which never reaches the server. It accepts the options of [`route.fulfill`](https://playwright.dev/docs/api/class-route#route-fulfill):

```ts
await interceptRoute(page, matchPath("/api/users/1"))
  .respondWith({ status: 500 })
  .during(async () => {
    await page.getByRole("button", { name: "Fetch user" }).click();
    await expect(page.getByRole("alert")).toHaveText("Something went wrong");
  });
```

### Modifying responses

`modifyResponse` sends the request to the server and passes it to a modifier before it is returned to the page.

```ts
await interceptRoute(page, matchPath("/api/users/1"))
  .modifyResponse(
    // helper to easily modify the response body with a typed function
    modifyJsonBody<ApiUserResponse>((user) => ({
      ...user, // keep original response from server
      enabled: false, // only modify one field
    })),
  )
  .during(async () => {
    await page.getByRole("button", { name: "Fetch user" }).click();
    await expect(
      page.getByRole("checkbox", { name: "Enabled" }),
    ).not.toBeChecked();
  });
```

### Suspending requests

`suspend` delays matching requests until the action has finished. This makes pending states such as loading indicators, skeletons or disabled buttons observable without relying on timing:

```ts
await interceptRoute(page, matchPath("/api/users/1"))
  .suspend()
  .during(async () => {
    await page.getByRole("button", { name: "Fetch user" }).click();
    // The loading indicator can be inspected without worrying about race-conditions
    await expect(page.getByRole("progressbar")).toBeVisible();
  });

await expect(page.getByRole("progressbar")).toHaveCount(0);
```

The suspended requests are continued once the action returns, and `suspend` resolves after all of them have been answered. Assertions on the loaded state therefore belong after the action, not inside it.

## Fixture

`RouteInterceptorFixture` creates interceptors for a page. Extending it gives the routes of the application under test descriptive names, so tests do not have to repeat their URL patterns:

```ts
import {
  matchPath,
  type RouteInterceptor,
  RouteInterceptorFixture,
} from "@cronn/playwright-utils";
import { test as base } from "@playwright/test";

class AppInterceptorFixture extends RouteInterceptorFixture {
  public onGetUser(userId = 1): RouteInterceptor {
    return this.intercept(matchPath(`/api/users/${userId}`));
  }
}

export const test = base.extend<{ intercept: AppInterceptorFixture }>({
  intercept: ({ page }, use) => use(new AppInterceptorFixture(page)),
});
```

The fixture is then available in every test:

```ts
test("shows an error when the user cannot be loaded", async ({
  page,
  intercept,
}) => {
  await intercept
    .onGetUser()
    .abort()
    .during(async () => {
      await page.getByRole("button", { name: "Fetch user" }).click();
      await expect(page.getByRole("alert")).toBeVisible();
    });
});
```
