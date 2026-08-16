import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      /*
       * `server-only` exists purely to make Next fail the build if a server
       * module is pulled into a client bundle. Outside Next there is no such
       * distinction, and its default export throws, so it is stubbed here.
       * This does not weaken the guarantee — the real check still runs during
       * `next build`.
       */
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
