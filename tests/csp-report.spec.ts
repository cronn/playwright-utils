import { test } from "@playwright/test";

import { cspReport, getCspHeader } from "../src/security/csp-report";
import { expect } from "../src/test/fixtures";

const SERVER_URL = "https://csp-report.test";

test("recommends nothing for a strict policy", async () => {
  await testCspReport(
    "upgrade-insecure-requests; trusted-types angular; require-trusted-types-for 'script'; default-src 'self'; script-src 'nonce-abc'; style-src 'nonce-def'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
});

test("recommends all directives for an empty header", async () => {
  await testCspReport("");
});

test("recommends adding a nonce source", async () => {
  await testCspReport(
    "upgrade-insecure-requests; trusted-types angular; require-trusted-types-for 'script'; default-src 'self'; script-src 'strict-dynamic'; style-src 'nonce-def'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
});

test("recommends adding missing sources", async () => {
  await testCspReport(
    "upgrade-insecure-requests; trusted-types angular; require-trusted-types-for 'script'; default-src 'self'; script-src 'nonce-abc'; style-src 'nonce-def'; object-src 'external'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
});

test("recommends removing extra sources", async () => {
  await testCspReport(
    "upgrade-insecure-requests; trusted-types angular; require-trusted-types-for 'script'; default-src 'self'; script-src 'nonce-abc' 'strict-dynamic' https://cdn.example.com; style-src 'nonce-def' 'unsafe-inline'; img-src 'self' data: https://images.example.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
});

test("evaluates missing directives using their fallback", async () => {
  await testCspReport(
    "upgrade-insecure-requests; trusted-types angular; require-trusted-types-for 'script'; default-src 'self'; script-src 'nonce-abc'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
});

test("extracts the CSP header from a response", async ({ page }) => {
  await page.route(`${SERVER_URL}/**`, (route) =>
    route.fulfill({
      contentType: "text/html",
      headers: { "content-security-policy": "default-src 'self'" },
      body: "<!doctype html>",
    }),
  );

  const response = await page.goto(SERVER_URL);

  expect(await getCspHeader(response)).toBe("default-src 'self'");
});

test("falls back to an empty string if the CSP header is missing", async ({
  page,
}) => {
  await page.route(`${SERVER_URL}/**`, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html>" }),
  );

  const response = await page.goto(SERVER_URL);

  expect(await getCspHeader(response)).toBe("");
});

test("falls back to an empty string if the response is missing", async () => {
  expect(await getCspHeader(null)).toBe("");
});

async function testCspReport(cspHeader: string): Promise<void> {
  await expect.soft(cspReport(cspHeader)).toMatchTextFile({
    fileExtension: "md",
  });
}
