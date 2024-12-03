const { ESLint } = require("eslint");

module.exports = [
  {
    files: ["*.ts", "*.tsx"],
    languageOptions: {
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: "module",
        project: "./tsconfig.json"
      }
    },
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin")
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-floating-promises": "error",
      "no-console": "warn",
      "no-debugger": "error"
    }
  },
  {
    ignores: ["node_modules/", "dist/", "build/", "coverage/"],
  }
];
