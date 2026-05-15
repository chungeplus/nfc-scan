import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const miniProgramGlobals = {
  App: 'readonly',
  Behavior: 'readonly',
  Component: 'readonly',
  Page: 'readonly',
  getApp: 'readonly',
  getCurrentPages: 'readonly',
  requireMiniProgram: 'readonly',
  requirePlugin: 'readonly',
  wx: 'readonly',
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'miniprogram_npm/**',
      'play-web-service/public/**',
      'docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['miniprogram/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...miniProgramGlobals,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['cloudfunctions/**/*.ts', 'play-web-service/src/**/*.ts', 'tools/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
);
