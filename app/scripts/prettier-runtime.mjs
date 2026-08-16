import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

export function loadPrettier() {
  try {
    return require("prettier");
  } catch (error) {
    const fallbackPackage = resolve(
      appRoot,
      "node_modules/.pnpm/prettier@3.2.5/node_modules/prettier/package.json",
    );
    if (!existsSync(fallbackPackage)) throw error;
    return require(dirname(fallbackPackage));
  }
}

export const prettierRoot = resolve(appRoot, "..");
export const prettierConfig = resolve(prettierRoot, ".prettierrc.json");
export const prettierIgnore = resolve(prettierRoot, ".prettierignore");
