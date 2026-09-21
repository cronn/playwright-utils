import type {
  Fixtures,
  Page,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
} from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * A Content Security Policy violation, as reported by the browser's
 * [`securitypolicyviolation`](https://developer.mozilla.org/en-US/docs/Web/API/Document/securitypolicyviolation_event) event.
 */
export type CspViolation = SecurityPolicyViolationEventInit;

let nextBindingId = 0;

/**
 * Collects the Content Security Policy violations of a page.
 *
 * Browsers report CSP violations through the `securitypolicyviolation` DOM event,
 * which is not otherwise exposed by Playwright. A captor registers a listener for
 * this event on every document of the page and collects the reported violations,
 * and can limit the capturing to a single action.
 *
 * Several captors can run on the same page at the same time, and every captor
 * receives all violations independently.
 *
 * @example
 * ```ts
 * const violations = captureCspViolations(page);
 *
 * await violations.during(() => page.goto("/users"));
 *
 * expect(violations.violations).toEqual([]);
 * ```
 */
export class CspCaptor {
  private readonly page: Page;
  private readonly bindingName = `__playwrightUtilsCspCaptor${nextBindingId++}__`;
  private initialized = false;
  private capturing = false;

  /**
   * The captured violations, in the order in which the page reported them.
   *
   * The array is filled while the captor is running, so it can also be
   * inspected inside the action passed to {@link during}.
   */
  public readonly violations: Array<CspViolation> = [];

  /**
   * Create a captor for the CSP violations of a page.
   *
   * The captor does not collect anything until it is started, either by
   * {@link startCapture} or by {@link during}.
   *
   * @param page - The page to capture CSP violations of
   */
  public constructor(page: Page) {
    this.page = page;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    await this.page.exposeFunction(
      this.bindingName,
      (violation: CspViolation) => {
        if (this.capturing) {
          this.violations.push(violation);
        }
      },
    );

    await this.page.addInitScript((bindingName: string) => {
      document.addEventListener("securitypolicyviolation", (event) => {
        const report = (window as unknown as Record<string, unknown>)[
          bindingName
        ] as (violation: CspViolation) => void;
        report({
          blockedURI: event.blockedURI,
          disposition: event.disposition,
          documentURI: event.documentURI,
          effectiveDirective: event.effectiveDirective,
          lineNumber: event.lineNumber,
          columnNumber: event.columnNumber,
          originalPolicy: event.originalPolicy,
          referrer: event.referrer,
          sample: event.sample,
          sourceFile: event.sourceFile,
          statusCode: event.statusCode,
          violatedDirective: event.violatedDirective,
        });
      });
    }, this.bindingName);
  }

  /**
   * Start collecting the CSP violations of the page.
   *
   * A captor can be started and stopped repeatedly; the collected violations are
   * kept across restarts.
   *
   * Because violations are captured through an init script, {@link startCapture}
   * has to be called before the page navigates for violations of the initial
   * load to be captured.
   */
  public async startCapture(): Promise<void> {
    await this.ensureInitialized();
    this.capturing = true;
  }

  /**
   * Stop collecting the CSP violations of the page.
   *
   * The already captured {@link violations} are kept.
   */
  public stopCapture(): void {
    this.capturing = false;
  }

  /**
   * Remove all captured {@link violations}.
   */
  public clearViolations(): void {
    this.violations.length = 0;
  }

  /**
   * Collect the CSP violations reported while the callback runs.
   *
   * The capturing is stopped once the action has finished, even if it throws.
   * A promise returned by the action is awaited before the captor stops, no
   * matter when it is awaited by the caller.
   *
   * @param action - The action to capture CSP violations during
   * @returns The value of the action
   *
   * @example
   * ```ts
   * const captor = captureCspViolations(page);
   *
   * await captor.during(() => page.goto("/users"));
   *
   * expect(captor.violations).toEqual([]);
   * ```
   */
  public async during<T>(action: () => Promise<T>): Promise<T> {
    await this.startCapture();

    try {
      return await action();
    } finally {
      this.stopCapture();
    }
  }
}

/**
 * Factory method to create a {@link CspCaptor}.
 *
 * @param page - The page to capture CSP violations for
 * @returns CspCaptor
 *
 * @example
 * ```ts
 * const captor = captureCspViolations(page);
 * ```
 */
export function captureCspViolations(page: Page): CspCaptor {
  return new CspCaptor(page);
}

export interface CspFixtures {
  /**
   * A {@link CspCaptor} capturing every CSP violation of the page, available for
   * tests that want to trigger and assert on a specific violation.
   */
  cspCaptor: CspCaptor;

  /**
   * Option fixture controlling whether {@link cspFixtures} skips failing
   * a test that produced unexpected CSP violations.
   *
   * @default false
   */
  ignoreCspViolations: boolean;
}

async function provideCspCaptor(
  {
    page,
    ignoreCspViolations,
  }: PlaywrightTestArgs & PlaywrightTestOptions & CspFixtures,
  use: (captor: CspCaptor) => Promise<void>,
): Promise<void> {
  const captor = captureCspViolations(page);
  await captor.startCapture();

  await use(captor);

  captor.stopCapture();
  if (!ignoreCspViolations) {
    expect(captor.violations, "Unexpected CSP violations").toEqual([]);
  }
}

/**
 * Playwright fixtures reporting Content Security Policy violations for every test.
 *
 * `cspCaptor` is installed automatically on the page fixture and, by default, fails
 * a test if it produced any CSP violation. Disable this for an individual test with
 * `test.use({ ignoreCspViolations: true })`, and inspect `cspCaptor.violations`
 * manually for tests targeting CSP behavior specifically.
 *
 * @example
 * ```ts
 * import { cspFixtures, type CspFixtures } from "@cronn/playwright-utils";
 * import { test as base } from "@playwright/test";
 *
 * export const test = base.extend<CspFixtures>({
 *   ...cspFixtures,
 *   // ...other fixtures
 * });
 * ```
 *
 * @example
 * ```ts
 * test.use({ ignoreCspViolations: true });
 *
 * test("shows a warning banner on CSP violation", async ({ page, cspCaptor }) => {
 *   await page.getByRole("button", { name: "Load untrusted script" }).click();
 *   expect(cspCaptor.violations).toHaveLength(1);
 * });
 * ```
 */
export const cspFixtures: Fixtures<
  CspFixtures,
  object,
  PlaywrightTestArgs & PlaywrightTestOptions
> = {
  ignoreCspViolations: [false, { option: true }],
  cspCaptor: [provideCspCaptor, { auto: true }],
};
