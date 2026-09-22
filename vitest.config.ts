import { resolve } from "path/win32";
import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [{ find: /^src\//, replacement: `${resolve(__dirname, "src")}/` }],
  },
  test: {
    environment: "node",
    env: { TZ: "UTC" },
    include: ["src/**/*.spec.ts"],
    mockReset: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{test,spec}.{ts,js}"],
      exclude: [
        ...configDefaults.exclude,
        "src/**/*.spec.ts",
        "src/test-utils/**",
        "src/main.ts",
        "src/**/*.module.ts",
        "src/**/dto/**",
        "src/database/schema.ts",
        "dist/**",
      ],
    },
  },
});
