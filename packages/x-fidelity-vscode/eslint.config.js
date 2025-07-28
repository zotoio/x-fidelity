module.exports = [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      prettier: require('eslint-config-prettier')
    },
    rules: {
      curly: 'warn',
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
      
      // Note: Custom serialization safety rules are enforced via:
      // 1. Pre-commit hooks (scripts/check-serialization.sh)
      // 2. Type-safe SafeWebview wrapper
      // 3. SerializationService for complex objects
      // 4. Runtime debugging tools in development
    }
  },
  {
    ignores: ['node_modules/', 'dist/', 'out/', '**/*.js', '**/*.d.ts']
  }
];
