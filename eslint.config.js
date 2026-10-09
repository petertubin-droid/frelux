import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(

  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'public'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-debugger': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
  // Test doubles and the edge-function mock harness intentionally use `any`
  // to mirror untyped third-party payloads; production code stays
  // explicit-any free (full-site audit 2026-10-09). Placed last so flat
  // config precedence lets it win over the shared rules above.
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      'supabase/functions/_shared/testing/**/*.ts',
    ],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
