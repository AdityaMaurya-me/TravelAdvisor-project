import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "supabase/**",
    "public/**",
  ]),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-unreachable": "error",
    },
  },
]);
