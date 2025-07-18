import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";


export default defineConfig([
  { files: ["**/*.{ts}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{ts}"], languageOptions: { globals: globals.node } },
  tseslint.configs.recommended,
  globalIgnores(['dist']),
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
