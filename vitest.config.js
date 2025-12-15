import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    include: ["tests/**/*.{test,spec}.{js,ts}"],

    // Allows using global variables like `describe`, `it`, and `expect` without importing them
    globals: true,
  },
});
