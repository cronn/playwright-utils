# Console Captor

Playwright exposes the console output of a page through the [`console`](https://playwright.dev/docs/api/class-page#page-event-console) event, which requires registering a listener, collecting the messages and removing the listener again once the test no longer needs it.

`ConsoleCaptor` bundles these steps: it collects the [`ConsoleMessage`](https://playwright.dev/docs/api/class-consolemessage) objects of a page in an array, optionally filtered by level or a custom predicate, and can limit the capturing to a single action.

## Usage

```ts
import { ConsoleCaptor } from "@cronn/playwright-utils";
import { expect, test } from "@playwright/test";

test("logs the selected filter", async ({ page }) => {
  const logs = ConsoleCaptor.log(page);

  await logs.during(async () => {
    await page.goto("/users");
    await page.getByRole("button", { name: "Only enabled" }).click();
  });

  expect(logs.messages.map((message) => message.text())).toEqual([
    "filter changed: enabled",
  ]);
});
```

Captured messages are available in the `messages` array, in the order in which they were reported by the page. The array is filled while the captor is running, so it can also be inspected inside the action.

Several captors can run on the same page at the same time, each with its own filter, and every captor receives all matching messages independently.

## Filtering messages

By default a captor collects every console message of the page. The static factories create a captor restricted to one level:

```ts
ConsoleCaptor.log(page);
ConsoleCaptor.info(page);
ConsoleCaptor.warning(page);
ConsoleCaptor.error(page);
```

`ConsoleCaptor.level` accepts any of the types reported by [`consoleMessage.type`](https://playwright.dev/docs/api/class-consolemessage#console-message-type), for example `debug`, `trace` or `table`:

```ts
const captor = ConsoleCaptor.level(page, "debug");
```

Note that `console.warn` is reported as `warning`, and that messages logged by the browser itself, such as failed requests or CSP violations, are reported as `error`.

### Custom filters

The constructor and all factories accept a predicate as their last argument, which receives the `ConsoleMessage` and decides whether it is captured. This is useful to ignore known noise, or to narrow the captured messages down to the ones a test is about:

```ts
// only errors of a specific feature
const checkoutErrors = ConsoleCaptor.error(page, (message) =>
  message.text().startsWith("[checkout]"),
);

// any message originating from a specific script
const analyticsMessages = new ConsoleCaptor(page, (message) =>
  message.location().url.endsWith("/analytics.js"),
);
```

A filter passed to a level factory is combined with the level, so both have to match for a message to be captured.

## Scoping to an action

`during` starts the capturing, runs the given action and stops the capturing again once the action has finished, even if it throws. It returns the value of the action, so it can wrap an existing step of a test:

```ts
const userId = await ConsoleCaptor.error(page).during(async () => {
  await page.getByRole("button", { name: "Create user" }).click();
  return readCreatedUserId(page);
});
```

A promise returned by the action is awaited before the capturing stops, no matter when it is awaited by the test. This can be used to keep the capturing open until a request has been answered:

```ts
const captor = ConsoleCaptor.error(page);

// captures until the response arrives, not until `during` returns
const responsePromise = captor.during(() => page.waitForResponse("/api/users"));
await page.getByRole("button", { name: "Fetch users" }).click();
await responsePromise;
```

Synchronous actions are supported as well and are not wrapped in a promise:

```ts
const captor = ConsoleCaptor.error(page);
const users = captor.during(() => parseUsers(payload));
```

::: warning
Only the value returned by the action is awaited. Asynchronous work which the action starts without returning it is not covered by the capturing:

```ts
let responsePromise: Promise<Response>;

captor.during(() => {
  // not returned, so the captor stops before the response arrives
  responsePromise = page.waitForResponse("/api/users");
});

await responsePromise;
```

:::

## Manual capturing

For captures which span multiple steps, `start` and `stop` control the capturing directly. A captor registered in a fixture keeps a test free of setup and teardown, and can assert that a test produced no unexpected console errors:

```ts
import { ConsoleCaptor } from "@cronn/playwright-utils";
import { expect, test as base } from "@playwright/test";

export const test = base.extend<{ consoleErrors: ConsoleCaptor }>({
  consoleErrors: async ({ page }, use) => {
    const captor = ConsoleCaptor.error(page);
    captor.start();

    await use(captor);

    captor.stop();
    expect(captor.messages.map((message) => message.text())).toEqual([]);
  },
});
```

A captor can be started and stopped repeatedly; the collected messages are kept across restarts.
