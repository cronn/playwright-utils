import path from "node:path";
import { expect, test, vi } from "vitest";

import { resolveFromPackageRoot } from "./file";

const { packageDirectorySync } = vi.hoisted(() => ({
  packageDirectorySync: vi.fn<() => string | undefined>(),
}));

vi.mock("package-directory", () => ({ packageDirectorySync }));

test("resolves path from package root", () => {
  packageDirectorySync.mockReturnValue(path.resolve("/", "packages", "app"));

  expect(resolveFromPackageRoot("data", "users.json")).toBe(
    path.resolve("/", "packages", "app", "data", "users.json"),
  );
});

test("resolves package root without path segments", () => {
  packageDirectorySync.mockReturnValue(path.resolve("/", "packages", "app"));

  expect(resolveFromPackageRoot()).toBe(path.resolve("/", "packages", "app"));
});

test("keeps absolute path segments", () => {
  packageDirectorySync.mockReturnValue(path.resolve("/", "packages", "app"));

  const absolutePath = path.resolve("/", "tmp", "users.json");
  expect(resolveFromPackageRoot(absolutePath)).toBe(absolutePath);
});

test("throws for unresolvable package root", () => {
  packageDirectorySync.mockReturnValue(undefined);

  expect(() => resolveFromPackageRoot("data")).toThrow(
    "Unable to resolve package directory",
  );
});
