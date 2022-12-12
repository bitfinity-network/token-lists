module.exports = {
  root: true,
  env: {
    commonjs: true,
    es6: true,
    node: true
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  reportUnusedDisableDirectives: true,
  parserOptions: {
    /* enabling "project" field is a performance hit
        https://github.com/typescript-eslint/typescript-eslint/blob/master/docs/getting-started/linting/TYPED_LINTING.md#performance
      */
    sourceType: 'module'
  },
  rules: {
    'typescript-eslint/no-non-null-assertion': 'off'
  }
};
