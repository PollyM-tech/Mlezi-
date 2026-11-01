import { defineConfig } from "@playwright/test";
const widths = [320, 360, 390, 600, 768, 820, 1024, 1280, 1440, 1920];
export default defineConfig({
  testDir: "./tests/responsive",
  testMatch: "*.spec.js",
  timeout: 90000,
  workers: 2,
  reporter: [
    ["list"],
    ["html", { outputFolder: "responsive-report", open: "never" }],
  ],
  outputDir: "test-results/responsive",
  use: {
    baseURL: "http://127.0.0.1:4191",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx vite --config vite.responsive.config.mjs",
    url: "http://127.0.0.1:4191/tests/responsive/index.html",
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    ...widths.map((width) => ({
      name: `chromium-${width}`,
      use: {
        browserName: "chromium",
        viewport: {
          width,
          height:
            width === 320 ? 568 : width < 600 ? 844 : width <= 820 ? 1024 : 900,
        },
        hasTouch: width < 900,
      },
    })),
    {
      name: "chromium-landscape",
      use: {
        browserName: "chromium",
        viewport: { width: 844, height: 390 },
        hasTouch: true,
      },
    },
    {
      name: "firefox-phone",
      use: { browserName: "firefox", viewport: { width: 360, height: 800 } },
    },
    {
      name: "firefox-desktop",
      use: { browserName: "firefox", viewport: { width: 1366, height: 768 } },
    },
    ...[390, 820, 1440].map((width) => ({
      name: `webkit-${width}`,
      use: {
        browserName: "webkit",
        viewport: {
          width,
          height:
            width === 320 ? 568 : width < 600 ? 844 : width <= 820 ? 1024 : 900,
        },
        hasTouch: width < 900,
      },
    })),
  ],
});
