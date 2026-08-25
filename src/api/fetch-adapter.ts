import type { APIRequestContext } from "@playwright/test";

export type FetchAPI = typeof fetch;

type PlaywrightFetchOptions = NonNullable<
  Parameters<APIRequestContext["fetch"]>[1]
>;

/**
 * Creates a `fetch`-compatible function backed by a Playwright
 * {@link APIRequestContext}.
 *
 * Useful for passing Playwright's request context to API clients that expect
 * the standard Fetch API.
 *
 * @param requestContext - Playwright request context to send requests with
 * @returns A function with the signature of the global `fetch`
 */
export function fetchAdapter(requestContext: APIRequestContext): FetchAPI {
  return async (input, init): Promise<Response> => {
    const response = await requestContext.fetch(
      mapToUrl(input),
      await mapToOptions(input instanceof Request ? input : null, init),
    );

    const responseBody = await response.body();
    return new Response(Buffer.from(responseBody), {
      status: response.status(),
      headers: response.headers(),
    });
  };
}

function mapToUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof Request) {
    return input.url;
  }

  return input.toString();
}

async function mapToOptions(
  request: Request | null,
  init?: RequestInit,
): Promise<PlaywrightFetchOptions> {
  const requestBody =
    request?.body !== null ? await request?.bytes() : undefined;
  return {
    method: request?.method ?? init?.method,
    headers: mapToRequestHeaders(request?.headers ?? init?.headers),
    ...mapToRequestBody(
      requestBody !== undefined ? Buffer.from(requestBody) : init?.body,
    ),
  };
}

function mapToRequestHeaders(
  headers: HeadersInit | undefined,
): PlaywrightFetchOptions["headers"] {
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  return headers;
}

function mapToRequestBody(
  body: BodyInit | null | undefined,
): Pick<PlaywrightFetchOptions, "data" | "multipart"> {
  if (body instanceof FormData) {
    return {
      multipart: body,
    };
  }

  return {
    data: body,
  };
}
