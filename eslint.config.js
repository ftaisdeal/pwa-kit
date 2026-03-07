import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        self: 'readonly',
        importScripts: 'readonly',
        WorkerGlobalScope: 'readonly',
        ServiceWorkerGlobalScope: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      // TypeScript Rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-const': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      
      // General Rules
      'no-console': 'warn',
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
      'no-return-await': 'error',
      
      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error'
    }
  },
  {
    files: ['**/*.test.{js,ts}', 'tests/**/*.{js,ts}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
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