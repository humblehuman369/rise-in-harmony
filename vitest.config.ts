import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
      "@rih/shared-utils": path.resolve(
        templateRoot,
        "packages",
        "shared-utils",
        "src",
        "index.ts",
      ),
      "@rih/shared-types": path.resolve(
        templateRoot,
        "packages",
        "shared-types",
        "src",
        "index.ts",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
  },
});
