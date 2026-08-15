import tsParser from '@typescript-eslint/parser';

/**
 * Enforces the load-bearing architectural rule from specs/gifomator-vision.md:
 * core/ must never import Electron. It is the only layer testable in a headless
 * container, and the layer a future MCP wrapper calls without a GUI.
 *
 * test/purity.test.mjs enforces the same rule against the BUILT bundle, which
 * catches transitive imports lint cannot see. Both exist deliberately.
 */
export default [
  {
    files: ['core/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'electron',
              message:
                'core/ must not import Electron. See specs/gifomator-vision.md — core/ is the ' +
                'only headless-testable layer and the one a future MCP wrapper calls directly.',
            },
          ],
          patterns: [
            {
              group: ['electron/*', 'electron-*'],
              message: 'core/ must not import Electron or Electron-adjacent packages.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: {},
  },
];
