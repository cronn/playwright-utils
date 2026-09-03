import { semanticSnapshot } from "@cronn/element-snapshot";
import { type Page, test } from "@playwright/test";
import http, { type Server, type ServerResponse } from "node:http";

import {
  matchPath,
  modifyJsonBody,
  modifyTextBody,
  type RouteInterceptor,
  RouteInterceptorFixture,
} from "../src";
import { expect } from "../src/test/fixtures";

interface ApiUserResponse {
  username: string;
  enabled: boolean;
  id: number;
}

function sendResponse<T>(
  response: ServerResponse,
  body: T,
  status = 200,
): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function createTestServer(): Promise<Server> {
  const server = http.createServer((request, response) => {
    if (request.url === undefined) {
      return;
    }

    const url = request.url;
    if (url === "/users/1") {
      if (request.method === "GET") {
        return sendResponse<ApiUserResponse>(response, {
          username: "test_user",
          enabled: true,
          id: 1,
        });
      }
    }

    return sendResponse(
      response,
      {
        error: "Not Found",
      },
      404,
    );
  });

  return new Promise<Server>((resolve) =>
    server.listen(0, () => resolve(server)),
  );
}

let server: Server;
let serverURL: string;

test.beforeAll(async () => {
  server = await createTestServer();
  const address = server.address();
  serverURL =
    typeof address === "string" ? address : `http://localhost:${address?.port}`;
});

test.afterAll(() => {
  server?.close();
});

class CustomRouteInterceptorFixture extends RouteInterceptorFixture {
  public onGetUser(userId = 1): RouteInterceptor {
    return this.intercept(matchPath(`/users/${userId}`));
  }
}

const customTest = test.extend<{ intercept: CustomRouteInterceptorFixture }>({
  intercept: ({ page }, use) => use(new CustomRouteInterceptorFixture(page)),
});

const testPage = `
<div role="progressbar" hidden id="loading-indicator">Loading...</div>
<button id="test-button">Fetch user</button>
<section aria-labelledby="api-response-title">
  <h2 id="api-response-title">Api Response</h2>
  <label>Count: <input id="api-response-count" readonly value="0" /></label>
  <p>Status: <span id="api-response-status">-</span></p>
  <pre id="api-response">
  </pre>
</section>
<div id="error-alert" role="alert" aria-labelledby="alert-title" hidden>
  <h2>Alert</h2>
  <p id="alert-content"></p>
</div>

<script defer>
    document.getElementById("test-button").addEventListener("click", async () => {
      const loadingIndicator = document.getElementById("loading-indicator");
      loadingIndicator.hidden = false;
      try {
        const response = await fetch("http://localhost:8080/users/1");
        const body = await response.json();
        document.getElementById("api-response").innerText = JSON.stringify(body, undefined, 2);
        document.getElementById("api-response-status").innerText = "" + response.status;
      } catch (error) {
        document.getElementById("alert-content").innerText = "" + error;
        document.getElementById("error-alert").hidden = false;
      } finally {
        const responseCountElement = document.getElementById("api-response-count");
        responseCountElement.value =  String(Number(responseCountElement.value) + 1);
        loadingIndicator.hidden = true;
      }
    })
</script>`;

async function openTestPage(page: Page): Promise<void> {
  await page.setContent(testPage.replace("http://localhost:8080", serverURL));
}

customTest("Route interceptors", async ({ page, intercept }) => {
  const apiResponseSection = page.getByRole("region", { name: "Api Response" });
  const loadingIndicator = page.getByRole("progressbar");
  const fetchUserButton = page.getByRole("button", { name: "Fetch user" });
  const count = page.getByRole("textbox", { name: "Count" });

  let requestCount = 0;

  async function clickFetchUser() {
    await fetchUserButton.click();
  }

  async function validateResponse() {
    await expect.soft(semanticSnapshot(apiResponseSection)).toMatchJsonFile();
  }

  async function validateRequestFinished() {
    await expect(count).toHaveValue(`${++requestCount}`);
  }

  await test.step("Open page", async () => {
    await page.goto(serverURL);
    await openTestPage(page);
    await expect(count).toHaveValue("0");
  });

  await test.step("With aborted request", async () => {
    await intercept
      .onGetUser()
      .abort()
      .during(async () => {
        await clickFetchUser();
        await validateRequestFinished();
        await validateResponse();
      });
  });

  await test.step("With mocked route", async () => {
    await intercept
      .onGetUser()
      .respondWith({
        status: 500,
        json: { error: "Internal Server Error" },
      })
      .during(async () => {
        await clickFetchUser();
        await validateRequestFinished();
        await validateResponse();
      });
  });

  await test.step("With overwritten response", async () => {
    await intercept
      .onGetUser()
      .modifyResponse(
        modifyJsonBody<ApiUserResponse>((body) => ({
          ...body,
          enabled: false,
        })),
      )
      .during(async () => {
        await clickFetchUser();
        await validateRequestFinished();
        await validateResponse();
      });
  });

  await test.step("With barrier", async () => {
    await intercept
      .onGetUser()
      .suspend()
      .during(async () => {
        await clickFetchUser();
        await page.waitForTimeout(200);
        await expect(loadingIndicator).toBeVisible();
      });

    await expect(loadingIndicator).toHaveCount(0);
    await validateRequestFinished();
    await validateResponse();
  });

  await test.step("With incomplete json response", async () => {
    await intercept
      .onGetUser()
      .modifyResponse(modifyTextBody((body) => body.substring(0, 5)))
      .during(async () => {
        await clickFetchUser();
        await validateRequestFinished();
      });

    await expect
      .soft(semanticSnapshot(page.getByRole("alert")))
      .toMatchJsonFile();
  });
});

customTest("Wait for request and response", async ({ page, intercept }) => {
  const fetchUserButton = page.getByRole("button", { name: "Fetch user" });
  const count = page.getByRole("textbox", { name: "Count" });

  let requestCount = 0;

  async function clickFetchUser() {
    await fetchUserButton.click();
  }

  /**
   * Wait until the pending fetch settled, otherwise its response may leak into
   * the `waitForResponse` call of a subsequent step.
   */
  async function waitForRequestFinished() {
    await expect(count).toHaveValue(`${++requestCount}`);
  }

  await test.step("Open page", async () => {
    await page.goto(serverURL);
    await openTestPage(page);
  });

  await test.step("Wait for request", async () => {
    const requestPromise = intercept.onGetUser().waitForRequest();
    await clickFetchUser();
    const request = await requestPromise;

    expect(request.method()).toBe("GET");
    expect(new URL(request.url()).pathname).toBe("/users/1");

    await waitForRequestFinished();
  });

  await test.step("Wait for response", async () => {
    const responsePromise = intercept.onGetUser().waitForResponse();
    await clickFetchUser();
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    const body = (await response.json()) as ApiUserResponse;
    expect(body).toStrictEqual({
      username: "test_user",
      enabled: true,
      id: 1,
    });

    await waitForRequestFinished();
  });

  await test.step("Wait for intercepted response", async () => {
    const interceptor = intercept.onGetUser();
    await interceptor
      .respondWith({
        status: 500,
        json: { error: "Internal Server Error" },
      })
      .during(async () => {
        const responsePromise = interceptor.waitForResponse();
        await clickFetchUser();
        const response = await responsePromise;
        expect(response.status()).toBe(500);

        await waitForRequestFinished();
      });
  });

  await test.step("Wait for request rejects after timeout", async () => {
    const request = intercept.onGetUser(2).waitForRequest({ timeout: 1000 });

    await clickFetchUser();

    await expect(request).rejects.toThrow(/Timeout 1000ms exceeded/);

    await waitForRequestFinished();
  });

  await test.step("Wait for response rejects after timeout", async () => {
    const response = intercept
      .intercept({ method: "POST", url: (url) => url.pathname === "/users/1" })
      .waitForResponse({ timeout: 1000 });

    await clickFetchUser();

    await expect(response).rejects.toThrow(/Timeout 1000ms exceeded/);
  });
});
