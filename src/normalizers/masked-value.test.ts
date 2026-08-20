import { test, expect } from "vitest";

import { maskedValue, maskedValueWithIndex } from "./masked-value";

test("serializes name as masked value", () => {
  expect(maskedValue("NAME")).toBe("[NAME]");
});

test("upper cases mask name", () => {
  expect(maskedValue("name")).toBe("[NAME]");
});

test("normalizes delimiters to underscore in mask name", () => {
  [" ", "-", ".", ":", ",", ";"].forEach((delimiter) => {
    expect(maskedValue(delimiter)).toBe("[_]");
  });
});

test("serializes name with index as masked value", () => {
  const testMask = maskedValueWithIndex("NAME");
  expect(testMask(0)).toBe("[NAME_0]");
});
