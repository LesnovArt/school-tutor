import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['out/**', '.webpack/**', 'node_modules/**'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' } },
    rules: {
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
    },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['electron', 'node:*', 'better-sqlite3'], message: 'The renderer is presentation code; use the preload bridge.' },
        { group: ['**/main/**', '**/preload/**'], message: 'The renderer may import only from contracts and itself.' },
      ] }],
    },
  },
  {
    files: ['src/contracts/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['electron', 'node:*', 'better-sqlite3', '**/main/**', '**/preload/**', '**/renderer/**'], message: 'Contracts may import only zod and other contracts.' },
      ] }],
    },
  },
  {
    files: ['src/main/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/renderer/**', '**/preload/**'], message: 'Main must not depend on renderer or preload code.' },
      ] }],
    },
  },
];
