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
        'alpha-value-notation': null,
        'color-function-alias-notation': null,
        'color-function-notation': null,
        'color-hex-length': null,
        'declaration-block-no-duplicate-properties': [true, {
          ignore: ['consecutive-duplicates-with-different-values'],
        }],
        'declaration-block-no-redundant-longhand-properties': null,
        'no-descending-specificity': null,
        'keyframes-name-pattern': '^[a-z][a-zA-Z0-9-]*$',
        'rule-empty-line-before': null,
        'scss/dollar-variable-empty-line-before': null,
        'scss/load-partial-extension': null,
        'selector-class-pattern': '^[a-z][a-zA-Z0-9-]*(?:__[a-zA-Z0-9-]+)*(?:--[a-zA-Z0-9-]+)*$',
        'selector-type-no-unknown': [true, {
          ignoreTypes: ['page', 'swiper', 'swiper-item', 'navigator', 'scroll-view'],
        }],
        'unit-no-unknown': [true, {
          ignoreUnits: ['rpx'],
        }],
        'value-keyword-case': null,
      },
    },
    {
      files: ['miniprogram/components/pixel-toast/pixel-toast.scss'],
      rules: {
        'declaration-block-no-duplicate-properties': null,
      },
    },
  ],
};
