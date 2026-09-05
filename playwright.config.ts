import { defineConfig, devices } from "@playwright/test";

import { isCI } from "./src/environment";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: isCI,
  retries: 0,
  // Opt out of parallel tests on CI.
  workers: isCI ? 1 : undefined,
  reporter: "html",
  use: {
    // Disable traces in CI.
    trace: isCI ? "off" : "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
