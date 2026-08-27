/**
 * Whether the current process runs in a CI environment, based on the `CI`
 * environment variable.
 *
 * Evaluated once when the module is loaded.
 */
export const isCI = process.env.CI === "true";
