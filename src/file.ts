import path from "node:path";
import { packageDirectorySync } from "package-directory";

/**
 * Resolves the given path segments against the root directory of the closest
 * package, i.e. the closest directory containing a `package.json`, searching
 * upwards from the current working directory.
 *
 * Useful for referencing files independently of the directory a test run is
 * started from, e.g. a subdirectory of the package.
 *
 * @param paths - Path segments to resolve against the package root
 * @returns The absolute path to the resolved location
 * @throws If no package root can be found
 */
export function resolveFromPackageRoot(...paths: Array<string>): string {
  const packageDir = packageDirectorySync();
  if (packageDir === undefined) {
    throw new Error("Unable to resolve package directory");
  }

  return path.resolve(packageDir, ...paths);
}
