import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    lessOpinionated: true,
    ignores: [
      'dist/**',
      'public/**',
      'node_modules/**',
    ],
  },
  {
    files: ['src/**/*.ts', 'tools/**/*.mjs'],
    rules: {
      'no-console': 'off',
      'node/prefer-global/process': 'off',
      'style/member-delimiter-style': ['error', {
        multiline: {
          delimiter: 'semi',
          requireLast: true,
        },
        singleline: {
          delimiter: 'semi',
          requireLast: false,
        },
      }],
      'style/semi': ['error', 'always'],
      'ts/no-misused-promises': 'off',
    },
  },
)
