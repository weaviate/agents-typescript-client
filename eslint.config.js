import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";


export default defineConfig([
  { files: ["**/*.{ts}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{ts}"], languageOptions: { globals: globals.node } },
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'default',
            format: ['camelCase', 'PascalCase'],
          },
          {
            selector: ['objectLiteralProperty', 'typeProperty'],
            format: null,
          },
        ],
    },
  },
]);
