import { afterEach, expect, test, vi } from "vitest";

async function importIsCI(): Promise<boolean> {
  vi.resetModules();
  const { isCI } = await import("./environment");
  return isCI;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

test("flags CI environment", async () => {
  vi.stubEnv("CI", "true");
  await expect(importIsCI()).resolves.toBe(true);
});

test("skips flagging CI environment for unset variable", async () => {
  vi.stubEnv("CI", undefined);
  await expect(importIsCI()).resolves.toBe(false);
});

test("skips flagging CI environment for other value", async () => {
  vi.stubEnv("CI", "1");
  await expect(importIsCI()).resolves.toBe(false);
});
