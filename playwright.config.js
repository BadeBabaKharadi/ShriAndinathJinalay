import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/ui",

  timeout: 30_000,

  outputDir: "./test-results",

  preserveOutput: "always",

  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "./playwright-report",
        open: "never",
      },
    ],
  ],

  use: {
    baseURL: "http://127.0.0.1:4173",

    /*
     * LOCAL:
     *   Keep trace for every test.
     *
     * CI:
     *   Keep trace only when a test fails.
     */
    trace: isCI ? "retain-on-failure" : "on",

    /*
     * LOCAL:
     *   Screenshot every test.
     *
     * CI:
     *   Screenshot only failed tests.
     */
    screenshot: isCI ? "only-on-failure" : "on",

    /*
     * LOCAL:
     *   Record every test.
     *
     * CI:
     *   Keep video only for failed tests.
     */
    video: isCI ? "retain-on-failure" : "on",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  webServer: {
    command: "npm run dev -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !isCI,
  },
});
