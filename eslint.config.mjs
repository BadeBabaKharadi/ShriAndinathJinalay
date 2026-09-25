import js from "@eslint/js";

export default [
  {
    ignores: ["node_modules/**", "playwright-report/**", "test-results/**"],
  },
  js.configs.recommended,
  {
    files: ["functions/**/*.js", "scripts/**/*.mjs", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
      },
    },
  },
  {
    files: ["scripts/**/*.mjs", "tests/**/*.js"],
    languageOptions: {
      sourceType: "module",
    },
  },
];
