export { isCI } from "./environment";

export { createFetchAdapter } from "./api/fetch-adapter";

export {
  interceptRoute,
  RouteInterceptor,
  RouteInterceptorFixture,
} from "./api/route-interceptor";
export {
  pathPattern,
  type HttpMethod,
  type RouteFilter,
} from "./api/route-interceptor/filter";
export {
  modifyJsonBody,
  modifyTextBody,
  type ResponseHandler,
} from "./api/route-interceptor/response-handler";

export { resolveFromPackageRoot } from "./file";

export { maskBaseURL } from "./normalizers/mask-base-url";
export { maskedValue, maskedValueWithIndex } from "./normalizers/masked-value";

export type { PlaywrightTarget } from "./types/playwright";
