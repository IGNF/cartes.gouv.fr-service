import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

import securityPlugin from 'eslint-plugin-security';
import jwtSecurityPlugin from "eslint-plugin-jwt-security";
import securePlugin from 'eslint-plugin-secure-coding';
import secureBrowserPlugin from 'eslint-plugin-browser-security';

export default [
  {
    ignores: ['demos/**', 'dist/**', 'docs/**', 'node_modules/**', '*.tgz']
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  securityPlugin.configs.recommended,
  jwtSecurityPlugin.configs.recommended,
  securePlugin.configs.recommended,
  secureBrowserPlugin.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  }
];
