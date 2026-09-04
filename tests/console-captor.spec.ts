/* eslint-disable no-console -- the console calls run inside the browser page */
import { type ConsoleMessage, expect, type Page, test } from "@playwright/test";

import { ConsoleCaptor } from "../src";

type ConsoleMessageFilter = (message: ConsoleMessage) => boolean;

interface ConsoleEntry {
  type: string;
  text: string;
}

const ALL_MESSAGES: Array<ConsoleEntry> = [
  { type: "log", text: "log message" },
  { type: "info", text: "info message" },
  { type: "warning", text: "warning message" },
  { type: "error", text: "error message" },
];

async function emitConsoleMessages(page: Page): Promise<void> {
  await page.evaluate(() => {
    console.log("log message");
    console.info("info message");
    console.warn("warning message");
    console.error("error message");
  });
}

function capturedEntries(captor: ConsoleCaptor): Array<ConsoleEntry> {
  return captor.messages.map((message) => ({
    type: message.type(),
    text: message.text(),
  }));
}

async function expectCaptured(
  captor: ConsoleCaptor,
  expected: Array<ConsoleEntry>,
): Promise<void> {
  await expect.poll(() => capturedEntries(captor)).toEqual(expected);
}

test("captures all console messages by default", async ({ page }) => {
  const captor = new ConsoleCaptor(page);
  captor.start();

  await emitConsoleMessages(page);

  await expectCaptured(captor, ALL_MESSAGES);
});

test("captures only messages matching the filter", async ({ page }) => {
  const captor = new ConsoleCaptor(page, (message) =>
    message.text().includes("info"),
  );
  captor.start();

  await emitConsoleMessages(page);

  await expectCaptured(captor, [{ type: "info", text: "info message" }]);
});

for (const { type, text } of ALL_MESSAGES) {
  test(`captures messages of level ${type}`, async ({ page }) => {
    const captor = ConsoleCaptor.level(page, type as "log");
    captor.start();

    await emitConsoleMessages(page);

    await expectCaptured(captor, [{ type, text }]);
  });
}

test("combines level and filter", async ({ page }) => {
  const captor = ConsoleCaptor.level(page, "log", (message) =>
    message.text().includes("info"),
  );
  captor.start();

  await emitConsoleMessages(page);
  await expectCaptured(captor, []);
});

const LEVEL_FACTORIES = {
  log: (page: Page, filter?: ConsoleMessageFilter) =>
    ConsoleCaptor.log(page, filter),
  info: (page: Page, filter?: ConsoleMessageFilter) =>
    ConsoleCaptor.info(page, filter),
  warning: (page: Page, filter?: ConsoleMessageFilter) =>
    ConsoleCaptor.warning(page, filter),
  error: (page: Page, filter?: ConsoleMessageFilter) =>
    ConsoleCaptor.error(page, filter),
};

for (const { type, text } of ALL_MESSAGES) {
  test(`provides a shorthand factory for level ${type}`, async ({ page }) => {
    const captor = LEVEL_FACTORIES[type as keyof typeof LEVEL_FACTORIES](page);
    captor.start();

    await emitConsoleMessages(page);

    await expectCaptured(captor, [{ type, text }]);
  });

  test(`applies the filter of the shorthand factory for level ${type}`, async ({
    page,
  }) => {
    const captor = LEVEL_FACTORIES[type as keyof typeof LEVEL_FACTORIES](
      page,
      (message) => message.text().includes("no match"),
    );
    captor.start();

    await emitConsoleMessages(page);
    await expectCaptured(captor, []);
  });
}

test("stops capturing messages after stop", async ({ page }) => {
  const captor = ConsoleCaptor.log(page);
  const reference = ConsoleCaptor.log(page);
  reference.start();

  captor.start();
  await page.evaluate(() => console.log("before stop"));
  await expectCaptured(captor, [{ type: "log", text: "before stop" }]);

  captor.stop();
  await page.evaluate(() => console.log("after stop"));
  await expectCaptured(reference, [
    { type: "log", text: "before stop" },
    { type: "log", text: "after stop" },
  ]);

  expect(capturedEntries(captor)).toEqual([
    { type: "log", text: "before stop" },
  ]);
});

test("captures messages during an async action", async ({ page }) => {
  const captor = ConsoleCaptor.log(page);
  const reference = ConsoleCaptor.log(page);
  reference.start();

  const result = await captor.during(async () => {
    await page.evaluate(() => console.log("during action"));
    await expectCaptured(captor, [{ type: "log", text: "during action" }]);
    return "result";
  });

  expect(result).toBe("result");

  await page.evaluate(() => console.log("after during"));
  await expectCaptured(reference, [
    { type: "log", text: "during action" },
    { type: "log", text: "after during" },
  ]);
  expect(capturedEntries(captor)).toEqual([
    { type: "log", text: "during action" },
  ]);
});

test("returns the result of a synchronous action", async ({ page }) => {
  const captor = ConsoleCaptor.log(page);
  const reference = ConsoleCaptor.log(page);
  reference.start();

  expect(captor.during(() => "result")).toBe("result");

  await page.evaluate(() => console.log("after during"));
  await expectCaptured(reference, [{ type: "log", text: "after during" }]);
  expect(capturedEntries(captor)).toEqual([]);
});

test("stops capturing when the action throws", async ({ page }) => {
  const captor = ConsoleCaptor.log(page);
  const reference = ConsoleCaptor.log(page);
  reference.start();

  expect(() =>
    captor.during(() => {
      throw new Error("action failed");
    }),
  ).toThrow("action failed");

  await page.evaluate(() => console.log("after during"));
  await expectCaptured(reference, [{ type: "log", text: "after during" }]);
  expect(capturedEntries(captor)).toEqual([]);
});

test("captures until a returned promise settles", async ({ page }) => {
  const captor = ConsoleCaptor.log(page);
  const reference = ConsoleCaptor.log(page);
  reference.start();

  const messagePromise = captor.during(() =>
    page.waitForEvent("console", (message) => message.text() === "trigger"),
  );

  await page.evaluate(() => {
    console.log("before trigger");
    setTimeout(() => console.log("trigger"), 100);
  });
  await messagePromise;

  await expectCaptured(captor, [
    { type: "log", text: "before trigger" },
    { type: "log", text: "trigger" },
  ]);

  await page.evaluate(() => console.log("after during"));
  await expectCaptured(reference, [
    { type: "log", text: "before trigger" },
    { type: "log", text: "trigger" },
    { type: "log", text: "after during" },
  ]);
  expect(capturedEntries(captor)).toEqual([
    { type: "log", text: "before trigger" },
    { type: "log", text: "trigger" },
  ]);
});
