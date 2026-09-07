import type { ConsoleMessage, Page } from "@playwright/test";

/**
 * Filter used to select the messages collected by a {@link ConsoleCaptor}.
 */
export type ConsoleMessageFilter = (message: ConsoleMessage) => boolean;

/**
 * The log level of a {@link ConsoleMessage}, e.g. `log`, `warning` or `error`.
 */
export type ConsoleMessageLevel = ReturnType<ConsoleMessage["type"]>;

function defaultFilter(_message: ConsoleMessage) {
  return true;
}

/**
 * Collects the console messages of a page.
 *
 * Playwright reports the console output of a page through its `console` event,
 * which has to be registered and removed again by hand. A captor bundles these
 * steps, optionally filters the messages by level or a custom predicate and can
 * limit the capturing to a single action.
 *
 * Several captors can run on the same page at the same time, each with its own
 * filter, and every captor receives all matching messages independently.
 *
 * @example
 * ```ts
 * const logs = captureConsole(page);
 *
 * await logs.during(async () => {
 *   await page.goto("/users");
 *   await page.getByRole("button", { name: "Only enabled" }).click();
 * });
 *
 * expect(logs.messages.map((message) => message.text())).toEqual([
 *   "filter changed: enabled",
 * ]);
 * ```
 */
export class ConsoleCaptor {
  private readonly page: Page;
  private readonly consoleListener: (messages: ConsoleMessage) => void;

  /**
   * The captured messages, in the order in which the page reported them.
   *
   * The array is filled while the captor is running, so it can also be
   * inspected inside the action passed to {@link during}.
   */
  public readonly messages: Array<ConsoleMessage> = [];

  /**
   * Create a captor for the console messages of a page.
   *
   * The captor does not collect anything until it is started, either by
   * {@link startCapture} or by {@link during}.
   *
   * @param page - The page to capture console messages of
   * @param filter - Optional. Decides which messages are captured, captures every message if omitted
   *
   * @example
   * ```ts
   * const captor = captureConsole(page, (message) =>
   *   message.location().url.endsWith("/analytics.js"),
   * );
   * ```
   */
  public constructor(page: Page, filter: ConsoleMessageFilter = defaultFilter) {
    this.page = page;
    this.consoleListener = (event) => {
      if (filter(event)) {
        this.messages.push(event);
      }
    };
  }

  /**
   * Start collecting the console messages of the page.
   *
   * A captor can be started and stopped repeatedly; the collected messages are
   * kept across restarts.
   *
   * @example
   * ```ts
   * export const test = baseTest.extend<{ consoleErrors: ConsoleCaptor }>({
   *   consoleErrors: async ({ page }, use) => {
   *     const captor = captureConsole(page, "error");
   *     captor.start();
   *
   *     await use(captor);
   *
   *     captor.stop();
   *     expect(captor.messages.map((message) => message.text())).toEqual([]);
   *   },
   * });
   * ```
   */
  public startCapture(): void {
    this.page.on("console", this.consoleListener);
  }

  /**
   * Stop collecting the console messages of the page.
   *
   * The already captured {@link messages} are kept.
   */
  public stopCapture(): void {
    this.page.off("console", this.consoleListener);
  }

  /**
   * Collect the console messages reported while the callback runs.
   *
   * The capturing is stopped once the action has finished, even if it throws.
   * A promise returned by the action is awaited before the captor stops, no
   * matter when it is awaited by the caller.
   *
   * Only the returned value is awaited: asynchronous work which the action
   * starts without returning it is not covered by the capturing.
   *
   * @param action - The action to capture console messages during
   * @returns The value of the action
   *
   * @example
   * ```ts
   * const captor = captureConsole(page, "error");
   *
   * await captor.during(async () => {
   *   await page.getByRole("button", { name: "Create user" }).click();
   *   await expect(page.getByRole("alert")).toBeVisible();
   * });
   *
   * expect(captor.messages).toHaveLength(1);
   * ```
   */
  public async during<T>(action: () => Promise<T>): Promise<T> {
    this.startCapture();

    try {
      return await action();
    } finally {
      this.stopCapture();
    }
  }
}

/**
 * Factory method to create a {@link ConsoleCaptor} with the provided filter.
 *
 * The filter can be the log-level or a custom function on the message.
 *
 * @param page - The page to capture logs for
 * @param levelOrFilter - The level or filter to filter out messages
 * @returns ConsoleCaptor
 *
 * @example
 * ```ts
 * const errorCaptor = captureConsole(page, "error");
 * const cspCaptor = captureConsole(page, message =>
 *     hasLogLevel(message, "warning", "error") && message.text().includes("Content Security Policy")
 * );
 * ```
 */
export function captureConsole(
  page: Page,
  levelOrFilter?:
    | ConsoleMessageLevel
    | Array<ConsoleMessageLevel>
    | ConsoleMessageFilter,
): ConsoleCaptor {
  if (levelOrFilter === undefined) {
    return new ConsoleCaptor(page);
  }
  if (typeof levelOrFilter === "function") {
    return new ConsoleCaptor(page, levelOrFilter);
  }
  if (Array.isArray(levelOrFilter)) {
    return new ConsoleCaptor(page, (message) =>
      hasLogLevel(message, ...levelOrFilter),
    );
  }
  return new ConsoleCaptor(page, (message) =>
    hasLogLevel(message, levelOrFilter),
  );
}

/**
 * Tests whether the given console message has one of the specified log levels.
 *
 * This can be useful to define a filter with {@link captureConsole}.
 *
 * @param message - The console message to check
 * @param level - The log level
 * @returns True if the message has one of the given log levels
 */
export function hasLogLevel(
  message: ConsoleMessage,
  ...level: Array<ConsoleMessageLevel>
): boolean {
  return level.includes(message.type());
}
