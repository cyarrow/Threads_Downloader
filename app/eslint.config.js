// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Build output and generated native projects (all gitignored).
    ignores: ['dist/*', 'dist-prototype/*', 'web-build/*', 'android/*', 'ios/*', 'e2e/.out/*'],
  },
  {
    // Browser E2E suites run in Node (CommonJS), not in the app bundle.
    files: ['e2e/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { __dirname: 'readonly', __filename: 'readonly' } },
  },
]);
