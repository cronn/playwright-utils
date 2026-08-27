import {
  maskPattern,
  stringNormalizer,
} from "@cronn/playwright-file-snapshots";
import { type PlaywrightTestArgs, test } from "@playwright/test";
import http, { type IncomingMessage, type Server } from "node:http";

import { maskedValue, maskedValueWithIndex } from "../src";
import { createFetchAdapter, type FetchAPI } from "../src/api/fetch-adapter";
import { expect } from "../src/test/fixtures";

function createTestServer(): Server {
  return http.createServer(
    (request, response) =>
      void readRequestBody(request).then((body) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            method: request.method,
            url: request.url,
            headers: request.headers,
            body,
          }),
        );
      }),
  );
}

async function readRequestBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Array<Uint8Array> = [];
    request.on("data", (chunk) => chunks.push(chunk as Uint8Array));
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }

      const bodyBuffer = Buffer.concat(chunks);
      const bodyAsString = bodyBuffer.toString("utf8");
      try {
        resolve(JSON.parse(bodyAsString));
      } catch {
        resolve(bodyAsString.split("\r\n"));
      }
    });
    request.on("error", reject);
  });
}

let server: Server, serverURL: string;

test.beforeAll(async () => {
  server = createTestServer();
  await new Promise<void>((resolve) => server.listen(0, resolve)); // port 0 = random free port
  const address = server.address();
  serverURL =
    typeof address === "string" ? address : `http://localhost:${address?.port}`;
});

test.afterAll(() => server.close());

const MASKED_PROPERTIES = new Set<string>(["host", "user-agent"]);

function fetchWithAdapter(execute: (fetch: FetchAPI) => Promise<Response>) {
  return async function testBody({
    request,
  }: PlaywrightTestArgs): Promise<void> {
    const playwrightFetch = createFetchAdapter(request);
    const response = await execute(playwrightFetch);
    await expect(response.json()).toMatchJsonFile({
      normalizers: [
        (value, { key }) => {
          if (key !== undefined && MASKED_PROPERTIES.has(key)) {
            return maskedValue(key);
          }

          return value;
        },
        stringNormalizer(
          maskPattern(
            /WebKitFormBoundary\w+/g,
            maskedValueWithIndex("FORM_BOUNDARY"),
          ),
        ),
      ],
    });
  };
}

test(
  "input of type string",
  fetchWithAdapter((fetch) => fetch(serverURL)),
);

test(
  "input of type URL",
  fetchWithAdapter((fetch) => fetch(new URL(serverURL))),
);

test(
  "input of type Request",
  fetchWithAdapter((fetch) => fetch(new Request(serverURL))),
);

test(
  "resolves options from Request",
  fetchWithAdapter((fetch) =>
    fetch(
      new Request(serverURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: "test" }),
      }),
    ),
  ),
);

test(
  "resolves options from RequestInit",
  fetchWithAdapter((fetch) =>
    fetch(serverURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "test" }),
    }),
  ),
);

test(
  "resolves headers from array",
  fetchWithAdapter((fetch) =>
    fetch(serverURL, {
      method: "POST",
      headers: [["Accept", "application/json"]],
    }),
  ),
);

test(
  "resolves headers from Headers object",
  fetchWithAdapter((fetch) =>
    fetch(serverURL, {
      method: "POST",
      headers: new Headers({ Accept: "application/json" }),
    }),
  ),
);

test(
  "resolves body from FormData",
  fetchWithAdapter((fetch) => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([JSON.stringify({ data: "test" })], { type: "text/html" }),
    );
    return fetch(serverURL, {
      method: "POST",
      body: formData,
    });
  }),
);
