import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: "node",
    // Keep file-backed store tests deterministic and avoid worker-thread stalls in
    // constrained CI/sandbox environments.
    pool: "forks",
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "src"),
    },
  },
});
