import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import { captureCspViolations, type CspFixtures, cspFixtures } from "../src";
import { expect } from "../src/test/fixtures";

const serverURL = "https://csp-captor.test";

function htmlResponse(html: string, csp: string) {
  return {
    contentType: "text/html",
    headers: { "content-security-policy": csp },
    body: html,
  };
}

async function mockCspPages(page: Page): Promise<void> {
  await page.route(`${serverURL}/**`, (route) => {
    switch (new URL(route.request().url()).pathname) {
      case "/clean":
        return route.fulfill(
          htmlResponse(
            "<!doctype html><html><body><p>Clean</p></body></html>",
            "default-src 'self'",
          ),
        );
      case "/inline-script":
        return route.fulfill(
          htmlResponse(
            "<!doctype html><html><body><script>window.loaded = true;</script></body></html>",
            "default-src 'self'",
          ),
        );
      case "/mixed":
        return route.fulfill(
          htmlResponse(
            '<!doctype html><html><body><script>window.loaded = true;</script><img src="https://blocked.example.invalid/pixel.png"></body></html>',
            "default-src 'self'",
          ),
        );
      default:
        return route.fulfill({ status: 404 });
    }
  });
}

test.beforeEach(async ({ page }) => {
  await mockCspPages(page);
});

test("captures a CSP violation with structured fields", async ({ page }) => {
  const captor = captureCspViolations(page);

  await captor.during(() => page.goto(`${serverURL}/inline-script`));

  await expect(captor.violations).toMatchJsonFile();
});

test("captures no violations on a clean page", async ({ page }) => {
  const captor = captureCspViolations(page);

  await captor.during(() => page.goto(`${serverURL}/clean`));

  expect(captor.violations).toEqual([]);
});

test("captures multiple violations on a mixed page", async ({ page }) => {
  const captor = captureCspViolations(page);

  await captor.during(() => page.goto(`${serverURL}/mixed`));

  await expect(captor.violations).toMatchJsonFile();
});

test("stops capturing violations after stop", async ({ page }) => {
  const captor = captureCspViolations(page);
  await captor.startCapture();

  await page.goto(`${serverURL}/inline-script`);
  expect(captor.violations).toHaveLength(1);

  captor.stopCapture();
  await page.goto(`${serverURL}/inline-script`);
  expect(captor.violations).toHaveLength(1);
});

test("can be restarted, keeping previously captured violations", async ({
  page,
}) => {
  const captor = captureCspViolations(page);
  await captor.startCapture();

  await page.goto(`${serverURL}/inline-script`);
  expect(captor.violations).toHaveLength(1);

  captor.stopCapture();
  await captor.startCapture();
  await page.goto(`${serverURL}/inline-script`);

  expect(captor.violations).toHaveLength(2);
});

test("clears the captured violations", async ({ page }) => {
  const captor = captureCspViolations(page);
  await captor.startCapture();

  await page.goto(`${serverURL}/inline-script`);
  expect(captor.violations).toHaveLength(1);

  captor.clearViolations();
  expect(captor.violations).toEqual([]);

  await page.goto(`${serverURL}/inline-script`);
  expect(captor.violations).toHaveLength(1);
});

test("runs several captors on the same page independently", async ({
  page,
}) => {
  const firstCaptor = captureCspViolations(page);
  const secondCaptor = captureCspViolations(page);
  await firstCaptor.startCapture();
  await secondCaptor.startCapture();

  await page.goto(`${serverURL}/mixed`);

  expect(firstCaptor.violations).toHaveLength(2);
  expect(secondCaptor.violations).toHaveLength(2);
});

const cspTest = test.extend<CspFixtures>(cspFixtures);

cspTest(
  "the fixture passes silently when no violations occur",
  async ({ page, cspCaptor }) => {
    await page.goto(`${serverURL}/clean`);

    expect(cspCaptor.violations).toEqual([]);
  },
);

cspTest.fail("the fixture fails when violations occur", async ({ page }) => {
  await page.goto(`${serverURL}/inline-script`);
});

cspTest.describe(() => {
  cspTest.use({ ignoreCspViolations: true });

  cspTest(
    "a test can disable the automatic assertion and inspect violations manually",
    async ({ page, cspCaptor }) => {
      await page.goto(`${serverURL}/inline-script`);

      await expect(cspCaptor.violations).toMatchJsonFile();
    },
  );
});
