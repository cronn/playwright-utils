import { test } from "@playwright/test";

import { cspReport, getCspHeader } from "../src/security/csp-report";
import { expect } from "../src/test/fixtures";

const SERVER_URL = "https://csp-report.test";

async function testCspReport(cspHeader: string): Promise<void> {
  await expect.soft(cspReport(cspHeader)).toMatchTextFile({
    fileExtension: "md",
  });
}

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
    "upgrade-insecure-requests; trusted-types angular; require-trusted-types-for 'script'; default-src 'self'; script-src 'nonce-abc'; style-src 'nonce-def'; img-src https://images.example.com; object-src https://cdn.example.com; base-uri 'none'; form-action https://api.example.com; frame-ancestors 'none'",
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

test("recommends nothing for strict directive variants", async () => {
  await testCspReport(
    "upgrade-insecure-requests; trusted-types angular; require-trusted-types-for 'script'; default-src 'self'; script-src 'nonce-abc'; script-src-elem 'nonce-abc'; script-src-attr 'none'; style-src 'nonce-def'; style-src-elem 'nonce-def'; style-src-attr 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
});

test("recommends fixing weak directive variants", async () => {
  await testCspReport(
    "upgrade-insecure-requests; trusted-types angular; require-trusted-types-for 'script'; default-src 'self'; script-src 'nonce-abc'; script-src-elem 'unsafe-inline' https://cdn.example.com; script-src-attr 'unsafe-inline'; style-src 'nonce-def'; style-src-elem 'nonce-def' 'unsafe-inline'; style-src-attr 'unsafe-hashes'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
});

test("does not require base directives if both variants are defined", async () => {
  await testCspReport(
    "upgrade-insecure-requests; trusted-types angular; require-trusted-types-for 'script'; default-src 'self'; script-src-elem 'nonce-abc'; script-src-attr 'none'; style-src-elem 'nonce-def'; style-src-attr 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
});

test("requires base directives if only one variant is defined", async () => {
  await testCspReport(
    "upgrade-insecure-requests; trusted-types angular; require-trusted-types-for 'script'; default-src 'self'; script-src-elem 'nonce-abc'; style-src 'nonce-def'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
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
