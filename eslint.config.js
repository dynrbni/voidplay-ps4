import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'admin-dist/**', 'pages-dist/**', '.owner-data/**', 'artifacts/**', 'node_modules/**', 'framework/ps4-react/.deps/**', 'framework/ps4-react/build/**', 'framework/ps4-react/dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['e2e/**/*.mjs', 'framework/ps4-react/**/*.mjs'], languageOptions: { globals: globals.node } },
  { files: ['framework/ps4-react/apps/**/*.jsx'], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } }, globals: globals.node }, plugins: { 'react-hooks': hooks }, rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' } },
  {
    files: ['src/**/*.{ts,tsx}', 'shared/**/*.ts', 'admin/**/*.{ts,tsx}', 'scripts/**/*.ts', 'server/**/*.ts', 'vite.config.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error'
    }
  }
);
