import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: { command: "node node_modules/next/dist/bin/next dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
});
