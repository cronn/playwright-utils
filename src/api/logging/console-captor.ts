import type { ConsoleMessage, Page } from "@playwright/test";

/**
 * Filter used to select the messages collected by a {@link ConsoleCaptor}.
 */
type ConsoleMessageFilter = (message: ConsoleMessage) => boolean;

/**
 * The log level of a {@link ConsoleMessage}, e.g. `log`, `warning` or `error`.
 */
type ConsoleMessageLevel = ReturnType<ConsoleMessage["type"]>;

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
 * const logs = ConsoleCaptor.log(page);
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
  private readonly filter: ConsoleMessageFilter;
  private readonly listener: (messages: ConsoleMessage) => void;

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
   * {@link start} or by {@link during}.
   *
   * @param page - The page to capture console messages of
   * @param filter - Optional. Decides which messages are captured, captures every message if omitted
   *
   * @example
   * ```ts
   * const captor = new ConsoleCaptor(page, (message) =>
   *   message.location().url.endsWith("/analytics.js"),
   * );
   * ```
   */
  public constructor(page: Page, filter: ConsoleMessageFilter = defaultFilter) {
    this.page = page;
    this.filter = filter;
    this.listener = (event) => {
      if (this.filter(event)) {
        this.messages.push(event);
      }
    };
  }

  /**
   * Create a captor for the messages of one log level.
   *
   * Note that `console.warn` is reported as `warning`, and that messages logged
   * by the browser itself, such as failed requests or CSP violations, are
   * reported as `error`.
   *
   * @param page - The page to capture console messages of
   * @param level - The log level to capture
   * @param filter - Optional. Applied in addition to the level, so both have to match
   * @returns ConsoleCaptor
   *
   * @example
   * ```ts
   * const captor = ConsoleCaptor.level(page, "debug");
   * ```
   */
  public static level(
    page: Page,
    level: ConsoleMessageLevel,
    filter: ConsoleMessageFilter = defaultFilter,
  ): ConsoleCaptor {
    return new ConsoleCaptor(
      page,
      (message) => message.type() === level && filter(message),
    );
  }

  /**
   * Create a captor for the messages of level `log`.
   *
   * @param page - The page to capture console messages of
   * @param filter - Optional. Applied in addition to the level, so both have to match
   * @returns ConsoleCaptor
   *
   * @see level
   */
  public static log(
    page: Page,
    filter: ConsoleMessageFilter = defaultFilter,
  ): ConsoleCaptor {
    return ConsoleCaptor.level(page, "log", filter);
  }

  /**
   * Create a captor for the messages of level `info`.
   *
   * @param page - The page to capture console messages of
   * @param filter - Optional. Applied in addition to the level, so both have to match
   * @returns ConsoleCaptor
   *
   * @see level
   */
  public static info(
    page: Page,
    filter: ConsoleMessageFilter = defaultFilter,
  ): ConsoleCaptor {
    return ConsoleCaptor.level(page, "info", filter);
  }

  /**
   * Create a captor for the messages of level `warning`, as reported by `console.warn`.
   *
   * @param page - The page to capture console messages of
   * @param filter - Optional. Applied in addition to the level, so both have to match
   * @returns ConsoleCaptor
   *
   * @see level
   */
  public static warning(
    page: Page,
    filter: ConsoleMessageFilter = defaultFilter,
  ): ConsoleCaptor {
    return ConsoleCaptor.level(page, "warning", filter);
  }

  /**
   * Create a captor for the messages of level `error`.
   *
   * Besides `console.error`, this also captures the errors logged by the
   * browser itself, such as failed requests or CSP violations.
   *
   * @param page - The page to capture console messages of
   * @param filter - Optional. Applied in addition to the level, so both have to match
   * @returns ConsoleCaptor
   *
   * @see level
   *
   * @example
   * ```ts
   * const captor = ConsoleCaptor.error(page, (message) =>
   *   message.text().startsWith("[checkout]"),
   * );
   * ```
   */
  public static error(
    page: Page,
    filter: ConsoleMessageFilter = defaultFilter,
  ): ConsoleCaptor {
    return ConsoleCaptor.level(page, "error", filter);
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
   *     const captor = ConsoleCaptor.error(page);
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
  public start(): void {
    this.page.on("console", this.listener);
  }

  /**
   * Stop collecting the console messages of the page.
   *
   * The already captured {@link messages} are kept.
   */
  public stop(): void {
    this.page.off("console", this.listener);
  }

  /**
   * Collect the console messages reported while the callback runs.
   *
   * The capturing is stopped once the action has finished, even if it throws.
   * A promise returned by the action is awaited before the captor stops, no
   * matter when it is awaited by the caller, while synchronous actions are not
   * wrapped in a promise.
   *
   * Only the returned value is awaited: asynchronous work which the action
   * starts without returning it is not covered by the capturing.
   *
   * @param action - The action to capture console messages during
   * @returns The value of the action
   *
   * @example
   * ```ts
   * const captor = ConsoleCaptor.error(page);
   *
   * await captor.during(async () => {
   *   await page.getByRole("button", { name: "Create user" }).click();
   *   await expect(page.getByRole("alert")).toBeVisible();
   * });
   *
   * expect(captor.messages).toHaveLength(1);
   * ```
   */
  public during<T>(action: () => Promise<T>): Promise<T>;
  public during<T>(action: () => T): T;
  public during<T>(action: () => Promise<T> | T): Promise<T> | T {
    this.start();

    let result: Promise<T> | T;
    try {
      result = action();
    } catch (error) {
      this.stop();
      throw error;
    }

    if (result instanceof Promise) {
      return result.finally(() => this.stop());
    }

    this.stop();
    return result;
  }
}
