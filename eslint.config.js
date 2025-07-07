const { ESLint } = require("eslint");
const fs = require("fs");
const path = require("path");

// Read .gitignore file and parse its patterns
function getGitIgnorePatterns() {
  try {
    const gitignorePath = path.resolve(".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, "utf8");
      return content
        .split("\n")
        .filter(line => line.trim() && !line.startsWith("#"))
        .map(line => line.trim());
    }
  } catch (error) {
    console.error("Error reading .gitignore:", error);
  }
  return [];
}

// Get patterns from .gitignore
const gitIgnorePatterns = getGitIgnorePatterns();

// Base ignores from the original config with proper glob patterns
const baseIgnores = [
  "node_modules/**",
  "**/node_modules/**",
  "dist/**",
  "**/dist/**", 
  "build/**",
  "**/build/**",
  "coverage/**",
  "**/coverage/**",
  "website/**"
];

// Combine all ignore patterns
const allIgnores = [...baseIgnores, ...gitIgnorePatterns];

module.exports = [
  // Global ignores configuration - must be first
  {
    ignores: allIgnores
  },
  // TypeScript configuration
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
  }
];
