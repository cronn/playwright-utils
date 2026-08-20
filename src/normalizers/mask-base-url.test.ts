import { test, expect } from "vitest";

import { maskBaseURL } from "./mask-base-url";

test("masks base URL", () => {
  const testMask = maskBaseURL("http://base.test");
  expect(testMask("http://base.test/path")).toBe("[BASE_URL]/path");
});

test("skips masking for undefined base URL", () => {
  const testMask = maskBaseURL(undefined);
  expect(testMask("http://base.test/path")).toBe("http://base.test/path");
});

test("skips masking for non-string value", () => {
  const testMask = maskBaseURL("http://base.test");
  expect(testMask(4711)).toBe(4711);
});
