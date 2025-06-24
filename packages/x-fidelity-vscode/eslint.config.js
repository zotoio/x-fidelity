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
			'@typescript-eslint': require('@typescript-eslint/eslint-plugin')
		},
		rules: {
			'curly': 'warn',
			'eqeqeq': 'warn',
			'no-throw-literal': 'warn',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
		}
	},
	{
		ignores: ['node_modules/', 'dist/', 'out/', '**/*.js', '**/*.d.ts']
	}
]; 