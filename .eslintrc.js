module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Allow winston logger calls without console warning
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // Allow underscore-prefixed parameters (unused intentional params)
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Sequelize models use class syntax
    'class-methods-use-this': 'off',
    // Consistent return optional in express handlers
    'consistent-return': 'off',
    // Allow plus in template literals for readability
    'prefer-template': 'error',
    // Allow max line length of 120 for readability
    'max-len': ['warn', { code: 120, ignoreComments: true, ignoreStrings: true }],
  },
};
