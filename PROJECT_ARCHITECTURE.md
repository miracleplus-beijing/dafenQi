# 达芬Qi说 WeChat 小程序 - 项目架构全面分析

## 一、项目概览

**项目名称**: 达芬Qi说  
**项目类型**: WeChat 原生小程序 + Supabase 云端集成  
**框架技术**:
- Glass-easel (组件框架)
- TDesign v1.10.1 (UI 组件库)
- WeUI (扩展库)

**后端基础设施**:
- Supabase (PostgreSQL + PostgREST API)
- Edge Functions (云函数)
- Storage (文件存储)

---

## 二、高层目录结构

```
miniprogram/
├── app.js                    # 应用入口 & 全局状态
├── app.json                  # 应用配置
├── app.wxss                  # 全局样式
├── pages/                    # 16 个页面
│   ├── browse/               # 主播放页面
│   ├── category/             # 分类
│   ├── profile/              # 用户个人中心
│   ├── search/login/history/ # 其他页面...
├── services/                 # 12 个业务服务
│   ├── auth.service.js       # 认证
│   ├── api.service.js        # API 聚合
│   ├── storage.service.js    # 文件存储
│   ├── audio*.js             # 音频管理 (4 个)
│   ├── insight.service.js    # AI 洞察
│   ├── comment.service.js    # 评论系统
│   └── ...
├── components/               # 4 个自定义组件
│   ├── category-card/
│   ├── featured-card/
│   ├── ranking-list/
│   └── cloudTipModal/
├── utils/                    # 工具函数
│   ├── request.js            # HTTP 请求
│   ├── iconManager.js        # 图标管理
│   └── similarity.utils.js   # 文本相似度
├── config/                   # 配置文件
│   ├── supabase.config.js
│   ├── icon-config.js
│   └── image-urls.js
├── styles/                   # 全局样式
├── images/                   # 静态资源
└── package.json              # NPM 依赖
