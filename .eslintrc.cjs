module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:prettier/recommended', 'prettier'],
  rules: {
    'prettier/prettier': 'warn',
  },
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    'babel.config.js',
    'metro.config.js',
    'tailwind.config.js',
  ],
};
