export default {
  extends: ['stylelint-config-standard-scss'],
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
  ],
  overrides: [
    {
      files: ['miniprogram/**/*.scss'],
      rules: {
        'no-descending-specificity': null,
      },
    },
  ],
};
