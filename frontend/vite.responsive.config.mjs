import { defineConfig, mergeConfig } from "vite";
import path from "node:path";
import base from "./vite.config.js";
const fixture = (name) => path.resolve("tests/responsive", name);
// Only this test server substitutes APIs. Production never imports fixtures.
export default mergeConfig(
  base,
  defineConfig({
    resolve: {
      alias: [
        {
          find: /^(?:.*\/)lib\/api(?:\.js)?$/,
          replacement: fixture("mock-api.js"),
        },
        { find: "convex/react", replacement: fixture("mock-convex.js") },
        {
          find: "@convex-dev/auth/react",
          replacement: fixture("mock-auth.js"),
        },
      ],
    },
    server: { host: "127.0.0.1", port: 4191, strictPort: true },
  }),
);
