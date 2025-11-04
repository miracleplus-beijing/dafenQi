// eslint.config.js

import eslintRecommended from '@eslint/js';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

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
        parser: '@babel/eslint-parser', // 确保已安装该依赖
        // 定义微信小程序特有的全局变量
      globals: {
        // 小程序框架提供的全局 API
        wx: 'readonly',
        App: 'readonly',
        Page: 'readonly',
        Component: 'readonly',
        getApp: 'readonly',
        getCurrentPages: 'readonly',
        // 其他可能需要的全局变量，例如：
        // console: "readonly",
        // process: "readonly", // 如果你在小程序里使用了 process.env
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

        // 其他可能需要的全局变量，例如如果你有自定义的全局变量
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

      // 你可能希望禁用一些在小程序环境中不常用的 ESLint 规则
      // 例如，小程序文件通常没有像普通网页那样的 DOM 结构，可能不需要 'no-undef' 以外的其他浏览器相关规则。
      // 'no-undef': 'error', // 这个我们已经通过 globals 解决了
      // 'no-empty': 'warn', // 示例：不允许空块语句
      // 'indent': ['error', 2], // 示例：强制使用 2 个空格缩进
    },
  },
];
