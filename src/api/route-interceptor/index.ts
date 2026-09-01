import type { Page, Route, Request } from "@playwright/test";

import { type RouteFilter } from "./filter";
import { type ResponseHandler } from "./response-handler";

export type Action<T> = () => Promise<T> | T;

export type FulfillOptions = Parameters<Route["fulfill"]>[0];

function isFiltered(filter: RouteFilter, request: Request) {
  if (!filter.url(new URL(request.url()))) {
    return false;
  }

  const method = filter.method;
  if (method === undefined) {
    return true;
  }

  if (typeof method === "string") {
    return method === request.method();
  } else {
    return (
      method instanceof Array &&
      (method as Array<string>).includes(request.method())
    );
  }
}

async function uninstallRoute(
  page: Page,
  filter: RouteFilter,
  handler: (route: Route, request: Request) => Promise<void>,
) {
  try {
    await page.unroute(filter.url, handler);
  } catch (error) {
    if (!page.isClosed()) {
      throw error;
    }
  }
}

async function withFulfilledRoute<T = void>(
  page: Page,
  filter: RouteFilter,
  options: FulfillOptions,
  action: Action<T>,
): Promise<T> {
  async function handler(route: Route, request: Request) {
    if (isFiltered(filter, request)) {
      await route.fulfill(options);
    } else {
      await route.fallback();
    }
  }

  await page.route(filter.url, handler);
  try {
    return await action();
  } finally {
    await uninstallRoute(page, filter, handler);
  }
}

async function withAbortedRoute<T = void>(
  page: Page,
  filter: RouteFilter,
  action: Action<T>,
): Promise<T> {
  async function handler(route: Route, request: Request) {
    if (isFiltered(filter, request)) {
      await route.abort();
    } else {
      await route.fallback();
    }
  }

  await page.route(filter.url, handler);
  try {
    return await action();
  } finally {
    await uninstallRoute(page, filter, handler);
  }
}

async function withBlockedRoute<T = void>(
  page: Page,
  filter: RouteFilter,
  action: Action<T>,
) {
  let resolver: () => void;
  const unblocked = new Promise<void>((resolve) => {
    resolver = resolve;
  });
  const blockedRoutes = new Set<Promise<void>>();

  async function handler(route: Route, request: Request) {
    if (!isFiltered(filter, request)) {
      await route.fallback();
      return;
    }

    const blockedRoute = unblocked.then(async () => {
      await route.continue();
    });

    blockedRoutes.add(blockedRoute);
    try {
      await blockedRoute;
    } finally {
      blockedRoutes.delete(blockedRoute);
    }
  }

  await page.route(filter.url, handler);
  try {
    return await action();
  } finally {
    resolver!();
    // Let every blocked request continue before the route is uninstalled,
    // otherwise Playwright handles the pending routes itself and the handler
    // fails with "Route is already handled!".
    await Promise.allSettled([...blockedRoutes]);
    await uninstallRoute(page, filter, handler);
  }
}

async function withModifiedResponse<T = void>(
  page: Page,
  filter: RouteFilter,
  interceptor: ResponseHandler,
  action: Action<T>,
): Promise<T> {
  async function handler(route: Route, request: Request) {
    if (isFiltered(filter, request)) {
      const response = await route.fetch();
      await route.fulfill(await interceptor(response));
    } else {
      await route.fallback();
    }
  }

  await page.route(filter.url, handler);
  try {
    return await action();
  } finally {
    await uninstallRoute(page, filter, handler);
  }
}

/**
 * Entrypoint to create various network interceptors using the {@link Page#route} API.
 */
export class RouteInterceptor {
  public readonly page: Page;
  public readonly filter: RouteFilter;

  public constructor(page: Page, filter: RouteFilter) {
    this.page = page;
    this.filter = filter;
  }

  /**
   * Abort the target route for the duration of the callback.
   *
   * This method returns a stub to continue chaining with.
   *
   * @returns RouteInterceptorStarter
   * @see {@link Route#abort}
   *
   * @example
   * ```ts
   * interceptor.abort().during(() => button.click())
   * ```
   */
  public abort(): RouteInterceptorStarter {
    return new RouteInterceptorStarter((action) =>
      withAbortedRoute(this.page, this.filter, action),
    );
  }

  /**
   * Block the target route for the duration of the callback.
   *
   * A blocked route will not serve the response until the callback completes,
   * this is useful to validate loading indicators.
   *
   * This method returns a stub to continue chaining with.
   *
   * @returns RouteInterceptorStarter
   *
   * @example
   * ```ts
   * interceptor.block().during(async () => {
   *   await button.click();
   *   await expect(loadingOverlay).toBeVisisble();
   * });
   * ```
   */
  public block(): RouteInterceptorStarter {
    return new RouteInterceptorStarter((action) =>
      withBlockedRoute(this.page, this.filter, action),
    );
  }

  /**
   * Replace the response on the target route for the duration of the callback.
   *
   * The request will not hit the server at all and instead immediately return the provided response.
   *
   * This method returns a stub to continue chaining with.
   *
   * @param options - The fixed response to return for the target route
   * @returns RouteInterceptorStarter
   * @see {@link Route#fulfill}
   *
   * @example
   * ```ts
   * interceptor.respondWith({ status: 500 }).during(async () => {
   *   await button.click();
   *   await expect(alert).toBeVisisble();
   * });
   * ```
   */
  public respondWith(options: FulfillOptions): RouteInterceptorStarter {
    return new RouteInterceptorStarter((action) =>
      withFulfilledRoute(this.page, this.filter, options, action),
    );
  }

  /**
   * Modify the response on the target route for the duration of the callback.
   *
   * The route will first process the request to the server
   * and then apply the provided callback to modify the content before returning it to the client.
   *
   * This method returns a stub to continue chaining with.
   *
   * @param modifier - Callback to modify the response of the server before returning it to the client
   * @returns RouteInterceptorStarter
   * @see {@link Route#fetch}, {@link Route#fulfill}
   *
   * @example
   * ```ts
   * interceptor.respondWith({ status: 500 }).during(async () => {
   *   await button.click();
   *   await expect(alert).toBeVisisble();
   * });
   * ```
   */
  public modifyResponse(modifier: ResponseHandler): RouteInterceptorStarter {
    return new RouteInterceptorStarter((action) =>
      withModifiedResponse(this.page, this.filter, modifier, action),
    );
  }
}

/**
 * Stub returned by {@link RouteInterceptor} used to intercept routes during a block.
 *
 * @example
 * ```ts
 * interceptor.respondWith({ status: 500 }).during(async () => {
 *   await button.click();
 *   await expect(alert).toBeVisisble();
 * });
 * ```
 */
export class RouteInterceptorStarter {
  private readonly runner;

  public constructor(runner: <T>(action: Action<T>) => Promise<T>) {
    this.runner = runner;
  }

  /**
   * Run the given callback and intercept the stubbed route.
   *
   * The route interceptor is automatically removed when this method returns.
   *
   * @param action - The action to run with an intercepted route
   * @returns The result of the action
   */
  public async during<T>(action: Action<T>): Promise<T> {
    return await this.runner(action);
  }
}

/**
 * Intercept a route using the provided filter.
 *
 * The returned {@link RouteInterceptor} can be used to declare how the route should be intercepted.
 *
 * @param page – The page object to intercept the route on
 * @param filter - The route to intercept
 * @returns RouteInterceptor
 * @see {@link pathPattern}
 *
 * @example
 * ```ts
 * await interceptRoute(page, pathPattern("/api/notifications"))
 *   .respondWith({ status: 500 })
 *   .during(async () => {
 *     await page.getByRole("button", {name: "View notifications"}).click();
 *     await expect(page.getByRole("alert")).toBeVisible();
 *     await expect(page.getByRole("alert")).toHaveText("Failed to load notification");
 *   });
 * ```
 */
export function interceptRoute(
  page: Page,
  filter: RouteFilter,
): RouteInterceptor {
  return new RouteInterceptor(page, filter);
}

/**
 * Base class to build re-usable route interceptors.
 *
 * This is especially useful when combined with {@link test#extend} to create a custom fixture.
 *
 * @example
 * ```ts
 * class CustomRouteInterceptorFixture extends RouteInterceptorFixture {
 *   public onGetUser(userId = 1): RouteInterceptor {
 *     return this.intercept(pathPattern(`/api/users/${userId}`));
 *   }
 * }
 *
 * const test = baseTest.extend<{ intercept: CustomRouteInterceptorFixture }>({
 *   intercept: ({ page }, use) => use(new CustomRouteInterceptorFixture(page)),
 * });
 *
 * test("Fail to get user", async ({ intercept, page }) => {
 *   await page.goto("/users");
 *   await intercept
 *     .onGetUser()
 *     .respondWith({ status: 404 })
 *     .during(async () => {
 *       await page.getByRole("button", {name: "View profile"});
 *       await expect(page.getByRole("alert")).toHaveText("User not found");
 *     });
 * });
 * ```
 */
export class RouteInterceptorFixture {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /**
   * Create a {@link RouteInterceptor} for routes matching the provided filter.
   *
   * @param filter - The filter to intercept routes with
   * @returns RouteInterceptor
   *
   * @example
   * ```ts
   * await intercept({ method: "POST", url: "/api/messages" })
   *   .abort()
   *   .during(() => sendButton.click());
   * ```
   */
  public intercept(filter: RouteFilter): RouteInterceptor {
    return interceptRoute(this.page, filter);
  }
}
