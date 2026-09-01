import { type APIResponse } from "@playwright/test";

import { type FulfillOptions } from "./index";

/**
 * Interface used to modify responses with {@link RouteInterceptor#modifyResponse}.
 *
 * @see modifyJsonBody
 * @see modifyTextBody
 */
export type ResponseHandler = (
  response: APIResponse,
) => Promise<FulfillOptions> | FulfillOptions;

/**
 * Helper to create a {@link ResponseHandler} that modifies the response body, if it is a JSON object.
 *
 * @param modifier - The callback which modifies the response body before returning it to the client
 * @returns ResponseHandler
 *
 * @example
 * ```ts
 * await interceptRoute(page, pathPattern("/users/1"))
 *   .modifyResponse(modifyJsonBody(user => ({...user, username: "modified_username"})))
 *   .during(async() => {
 *     // ... perform action to trigger request to /users/1 ...
 *   });
 * ```
 */
export function modifyJsonBody<T>(modifier: (body: T) => T): ResponseHandler {
  return async (response) => ({
    body: JSON.stringify(modifier((await response.json()) as T)),
    response,
  });
}

/**
 * Helper to create a {@link ResponseHandler} that modifies the response body as a plaintext string.
 *
 * @param modifier - The callback which modifies the response body before returning it to the client
 * @returns ResponseHandler
 *
 * @example
 * ```ts
 * await interceptRoute(page, pathPattern("/email/1/subject"))
 *   .modifyResponse(modifyTextBody(body => body.toLowerCase()))
 *   .during(async() => {
 *     // ... perform action to trigger request to /email/1/subject ...
 *   });
 * ```
 */
export function modifyTextBody(
  modifier: (body: string) => string,
): ResponseHandler {
  return async (response) => ({
    response,
    body: modifier(await response.text()),
  });
}
