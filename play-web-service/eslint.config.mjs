import antfu from '@antfu/eslint-config';

export default antfu(
  {
    type: 'app',
    stylistic: {
      semi: true,
    },
    typescript: {
      tsconfigPath: 'tsconfig.json',
    },
    ignores: [
      'dist',
      'node_modules',
      'public',
    ],
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'off',
      'node/prefer-global/process': 'off',
      'ts/no-misused-promises': 'off',
      'ts/no-require-imports': 'off',
      'ts/no-unsafe-assignment': 'off',
      'ts/no-unsafe-call': 'off',
      'ts/no-unsafe-member-access': 'off',
      'ts/no-unsafe-return': 'off',
      'ts/strict-boolean-expressions': 'off',
      'ts/switch-exhaustiveness-check': 'off',
      'unicorn/escape-case': 'off',
    },
  },
);
