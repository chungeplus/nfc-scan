import rootConfig from '../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
    },
  },
];
