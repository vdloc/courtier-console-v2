module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    // Colours live in design/tokens.css. The scene reads them through
    // palette.ts; a hex literal anywhere in src/ is the regression this
    // project exists to prevent.
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
        message: 'Colours live in design/tokens.css. Read them via palette.ts.',
      },
    ],
  },
  ignorePatterns: ['dist', 'node_modules'],
};
