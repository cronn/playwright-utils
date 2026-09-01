/**
 * HTTP Methods used by {@link RouteFilter}
 */
export type HttpMethod =
  | "GET"
  | "PATCH"
  | "POST"
  | "PUT"
  | "DELETE"
  | "OPTIONS"
  | "QUERY"
  | "HEAD";

/**
 * Filters used to intercept routes with {@link RouteInterceptor}.
 *
 * @see pathPattern
 */
export interface RouteFilter {
  method?: HttpMethod | Array<HttpMethod>;
  url: (url: URL) => boolean;
}

/**
 * Helper to create a {@link RouteFilter} that applies to the specified path.
 *
 * @param pattern - The regex or string matching the pathname of the URL
 * @returns RouteFilter
 * @example
 * ```ts
 * await interceptRoute(page, pathPattern("/users/1"))
 *   .respondWith({ status: 404 })
 *   .during(() => {
 *     // ...
 *   });
 * ```
 */
export function pathPattern(pattern: RegExp | string): RouteFilter {
  return {
    url: (url) =>
      typeof pattern === "string"
        ? url.pathname === pattern
        : url.pathname.match(pattern) !== null,
  };
}
