import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default [
  { ignores: ['dist/', 'coverage/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.serviceworker
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    rules: {
      // TypeScript Rules
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'error',
      
      // General Rules
      'no-console': 'error',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-inline-comments': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-expressions': 'error',
      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-return': 'error',
      'no-useless-concat': 'error',
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'object-shorthand': 'error',
      'prefer-destructuring': ['error', {
        'array': false,
        'object': true
      }],
      
      // Async/Await
      'prefer-promise-reject-errors': 'error',
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'no-return-await': 'error'
    }
  },
  {
    // TypeScript already reports undefined names (and knows the DOM types)
    files: ['**/*.ts'],
    rules: {
      'no-undef': 'off'
    }
  },
  {
    files: ['*.config.{js,cjs}', '.prettierrc.cjs', 'plugins/**/*.js'],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    files: ['**/*.test.{js,ts}', 'tests/**/*.{js,ts}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-await-in-loop': 'off'
    }
  },
  {
    files: ['src/logger.ts'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['sw*.js', '**/service-worker.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        importScripts: 'readonly',
        skipWaiting: 'readonly',
        registration: 'readonly'
      }
    },
    rules: {
      'no-console': 'off'
    }
  }
]