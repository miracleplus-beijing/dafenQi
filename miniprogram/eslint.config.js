// eslint.config.js

import eslintRecommended from '@eslint/js';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
// 关键修改：导入 @babel/eslint-parser
import babelParser from '@babel/eslint-parser';

// 如果你使用 TypeScript，需要引入这些
// import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
// import typescriptEslintParser from '@typescript-eslint/parser';

export default [
  // 1. 忽略文件配置 (替代 .eslintignore)
  {
    ignores: [
      'node_modules/',
      'build/',
      'dist/',
      'miniprogram_npm/', // 微信小程序特有的 npm 包目录
      'cloudfunctions/', // 如果有云函数目录
      '*.min.js',
      '.prettierrc.js',
    ],
  },

  // 2. 基本 ESLint 推荐规则
  eslintRecommended.configs.recommended,

  // 3. Prettier 相关配置
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      ...prettierConfig.rules,
    },
  },

  // 4. 微信小程序核心配置
  {
    // 对所有 .js, .jsx, .ts, .tsx 文件应用此配置
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],

    languageOptions: {
      ecmaVersion: 2021, // 或更高版本，取决于你的项目
      sourceType: 'module',
      // 关键修改：使用导入的 babelParser 对象，而不是字符串
      parser: babelParser,
      // 定义微信小程序特有的全局变量
      globals: {
        // 小程序框架提供的全局 API
        wx: 'readonly',
        App: 'readonly',
        Page: 'readonly',
        Component: 'readonly',
        getApp: 'readonly',
        getCurrentPages: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',

        // 定时器相关的全局变量
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',

        // 浏览器环境/Node.js 相关的全局变量
        console: 'readonly', // 解决 'console' is not defined
        process: 'readonly', // 解决 'process' is not defined (用于 process.env)
        Image: 'readonly', // 解决 'Image' is not defined (如果使用了 new Image())
        performance: 'readonly', // 解决 'performance' is not defined
        atob: 'readonly', // 解决 'atob' is not defined
      },
      parserOptions: {
        requireConfigFile: false, // 核心修复项
      },
    },
    rules: {
      // 禁用 console.log, 在小程序生产环境通常不希望出现
      'no-console':
        process.env.NODE_ENV === 'production'
          ? ['warn', { allow: ['warn', 'error'] }]
          : 'off',
      // 要求使用 === 而不是 ==
      eqeqeq: 'error',
      // 检查未使用的变量，并忽略下划线开头的变量
      'no-unused-vars': [
        'warn',
        {
          vars: 'all', // 检查所有变量，包括全局变量和局部变量
          args: 'after-used', // 只检查函数参数中在函数体内部被使用的变量
          argsIgnorePattern: '.*',
        },
      ],
      // 禁止使用不必要的转义字符 (解决 'Unnecessary escape character: \/')
      'no-useless-escape': 'warn',
      // 强制 switch 语句中的 case 子句带有大括号 (解决 'Unexpected lexical declaration in case block')
      'no-case-declarations': 'error',
      // 禁止出现无法执行到的代码 (解决 'Unreachable code')
      'no-unreachable': 'warn',
      // 禁止修改只读的全局变量 (解决 'Read-only global 'Page' should not be modified')
      'no-global-assign': 'error',
    },
  },
];
