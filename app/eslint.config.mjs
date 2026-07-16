import js from "@eslint/js";
import importAlias from "@dword-design/eslint-plugin-import-alias";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import solid from "eslint-plugin-solid";
import unusedImports from "eslint-plugin-unused-imports";
import uiImports from "./eslint-rules/ui-imports.mjs";

const solidTypeScriptRules = solid.configs["flat/typescript"].rules;
const nodeScriptGlobals = {
  console: "readonly",
  process: "readonly",
};

const withLegacyRuleContext = (context) => {
  if (typeof context.getFilename === "function") {
    return context;
  }

  return new Proxy(context, {
    get(target, property, receiver) {
      if (property === "getFilename") {
        return () => target.filename ?? target.physicalFilename ?? "<text>";
      }

      if (property === "getPhysicalFilename") {
        return () => target.physicalFilename ?? target.filename ?? "<text>";
      }

      return Reflect.get(target, property, receiver);
    },
  });
};

const withLegacyRuleContextPlugin = (plugin) => ({
  ...plugin,
  rules: Object.fromEntries(
    Object.entries(plugin.rules ?? {}).map(([ruleName, rule]) => [
      ruleName,
      {
        ...rule,
        create: (context) => rule.create(withLegacyRuleContext(context)),
      },
    ]),
  ),
});

const complexityRules = {
  "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
  complexity: ["warn", 15],
  "max-depth": ["warn", 4],
};

export default [
  {
    ignores: [
      "dist/**",
      ".output/**",
      ".vinxi/**",
      "styled-system/**",
      "app.config.timestamp_*.js",
      "node_modules/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeScriptGlobals,
    },
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@dword-design/import-alias": withLegacyRuleContextPlugin(importAlias),
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
      local: uiImports,
      solid,
      "unused-imports": unusedImports,
    },
    settings: {
      "import/internal-regex": "^~/",
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...solidTypeScriptRules,
      "no-redeclare": "off",
      "no-undef": "off",
      "no-empty": "off",
      "no-useless-escape": "off",
      "prefer-const": "warn",
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "import/no-extraneous-dependencies": "warn",
      "local/no-ui-subpath-imports": "warn",
      "@dword-design/import-alias/prefer-alias": [
        "warn",
        {
          alias: {
            "~": "./src/",
          },
        },
      ],
      "solid/no-innerhtml": "off",
      "solid/prefer-for": "warn",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: complexityRules,
  },
];
