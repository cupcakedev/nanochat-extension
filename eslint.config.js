import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@sidepanel/*', '@content/*', '@background/*'],
              message: 'The shared layer must not depend on sidepanel/content/background.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/sidepanel/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@content/*', '@background/*'],
              message: 'The sidepanel layer must not directly depend on content/background.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/content/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@sidepanel/*', '@background/*'],
              message: 'The content layer must not directly depend on sidepanel/background.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/background/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@sidepanel/*', '@content/*'],
              message: 'The background layer must not directly depend on sidepanel/content.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
