// @ts-check
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'registry/scripts/**'],
  },
  {
    files: ['packages/**/*.ts', 'api/**/*.ts'],
    plugins: { '@typescript-eslint': tseslint },
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Enforce that only config.ts may access process.env
    files: ['packages/**/*.ts', 'api/**/*.ts'],
    ignores: ['**/config.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: "Access process.env only in config.ts — import { config } from './config.js' instead.",
        },
      ],
    },
  },
]
