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
    ignores: ['**/node_modules/**', 'miniprogram_npm/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      'app.ts',
      'components/**/*.ts',
      'custom-tab-bar/**/*.ts',
      'pages/**/*.ts',
      'utils/**/*.ts',
    ],
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
    files: ['tools/**/*.mjs'],
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
