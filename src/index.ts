export { isCI } from "./environment";

export { createFetchAdapter } from "./api/fetch-adapter";

export {
  captureConsole,
  hasLogLevel,
  ConsoleCaptor,
  type ConsoleMessageLevel,
  type ConsoleMessageFilter,
} from "./capturing/console-captor";

export {
  captureCspViolations,
  CspCaptor,
  cspFixtures,
  type CspViolation,
  type CspFixtures,
} from "./capturing/csp-captor";

export {
  interceptRoute,
  RouteInterceptor,
  RouteInterceptorFixture,
} from "./api/route-interceptor/interceptor";
export {
  matchPath,
  type HttpMethod,
  type RouteFilter,
} from "./api/route-interceptor/filter";
export {
  modifyJsonBody,
  modifyTextBody,
  type ResponseHandler,
} from "./api/route-interceptor/response-handler";

export { cspReport, getCspHeader } from "./security/csp-report";

export { resolveFromPackageRoot } from "./file";

export { formFiller, type FormFields } from "./page-object-model/form-filler";

export {
  extendLocator,
  type ExtendedLocator,
} from "./page-object-model/extend-locator";
export {
  roleLocators,
  type RoleLocators,
} from "./page-object-model/role-locators";

export { maskBaseURL } from "./normalizers/mask-base-url";
export { maskedValue, maskedValueWithIndex } from "./normalizers/masked-value";

export type { PlaywrightTarget } from "./types/playwright";
