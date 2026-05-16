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
      'ts/no-misused-promises': 'off',
    },
  },
)
