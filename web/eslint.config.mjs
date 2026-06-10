import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'public/**',
      '_mirror/**',
      'worker-configuration.d.ts',
    ],
  },

  js.configs.recommended,

  // Strict rules everywhere (no type info).
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  // Type-aware strict rules for real TypeScript modules.
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.strictTypeCheckedOnly, tseslint.configs.stylisticTypeCheckedOnly],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Interpolating a number into a template string is idiomatic and safe.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },

  // Astro components (sets the .astro parser; overrides the parser above).
  ...astro.configs['flat/recommended'],

  // Astro client <script> blocks run in the browser; declare the globals they use
  // (Astro define:vars injections + the SortableJS CDN global).
  {
    files: ['**/*.astro'],
    languageOptions: {
      globals: {
        ...globals.browser,
        Sortable: 'readonly',
        pageKey: 'readonly',
        slot: 'readonly',
        config: 'readonly',
        blocks: 'readonly',
      },
    },
  },

  // Node-side config + build/migration scripts.
  {
    files: ['*.config.mjs', 'scripts/**', 'db/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
);
