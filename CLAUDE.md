# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

达芬Qi说 is a WeChat miniprogram for an audio podcast platform. The project includes audio playback, categorization, user favorites, and history tracking. Currently built with native WeChat miniprogram framework with plans to integrate Supabase backend.

## Project Structure

### WeChat Miniprogram Architecture
- **Framework**: Native WeChat miniprogram (libVersion: 2.20.1)
- **Component System**: glass-easel componentFramework
- **Entry Point**: `miniprogram/` (configured in project.config.json)
- **State Management**: App.globalData for global state
- **Storage**: wx.getStorageSync/wx.setStorageSync for local persistence

### Key Architecture Files
- `miniprogram/app.js` - Application entry with global data and lifecycle methods
- `miniprogram/app.json` - App configuration with tabBar and page routes
- `project.config.json` - WeChat developer tools configuration
- `cloudfunctions/` - Cloud functions directory (currently has quickstartFunctions)

### Current Global State Structure
```javascript
// miniprogram/app.js - App.globalData
{
  userInfo: null,           // User authentication info
  isLoggedIn: false,        // Login status
  currentProgress: 0,       // Audio playback progress (0-100)
  maxProgress: 100,         // Max progress value
  isPlaying: false,         // Current playback state
  currentPodcast: null,     // Currently selected podcast
  favoriteList: [],         // User's favorite podcasts
  historyList: [],          // Playback history
  settings: {               // User preferences
    autoPlay: true,
    downloadQuality: 'high',
    theme: 'light'
  }
}
```

### Page Structure (TabBar)
```
pages/
├── browse/        # 漫游 - Main browsing page (default tab)
├── category/      # 分类 - Category/classification page  
├── profile/       # 我的 - User profile page
├── login/         # Login page (not in tabBar)
├── history/       # User history page
├── favorites/     # User favorites page
├── settings/      # Settings page
└── feedback/      # Feedback page
```

## 未来技术选型

### 后端服务 - Supabase

#### 1. Supabase 集成架构
```
miniprogram/
├── utils/
│   ├── supabase.js        # Supabase 客户端配置
│   ├── auth.js            # 认证服务
│   ├── database.js        # 数据库操作
│   └── storage.js         # 文件存储服务
├── services/
│   ├── podcast.js         # 播客相关服务
│   ├── user.js            # 用户相关服务
│   └── favorites.js       # 收藏服务
└── config/
    └── supabase.config.js # 配置文件
```

#### 2. Supabase 配置示例
```javascript
// utils/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: {
      getItem: (key) => wx.getStorageSync(key),
      setItem: (key, value) => wx.setStorageSync(key, value),
      removeItem: (key) => wx.removeStorageSync(key)
    }
  }
})
```

#### 3. 数据库表结构设计
```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wechat_openid VARCHAR UNIQUE NOT NULL,
  nickname VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 播客表
CREATE TABLE podcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  description TEXT,
  audio_url VARCHAR NOT NULL,
  cover_image_url VARCHAR,
  duration INTEGER,
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户收藏表
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  podcast_id UUID REFERENCES podcasts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, podcast_id)
);

-- 播放历史表
CREATE TABLE user_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  podcast_id UUID REFERENCES podcasts(id) ON DELETE CASCADE,
  play_position INTEGER DEFAULT 0,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 用户认证 - OAuth2 + 微信登录

#### 1. 微信登录流程
```javascript
// utils/auth.js
class AuthService {
  async loginWithWechat() {
    try {
      // 1. 获取微信授权码
      const { code } = await wx.login()
      
      // 2. 发送到后端验证
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${code}@wechat.temp`,
        password: code
      })
      
      if (error) throw error
      
      // 3. 更新全局状态
      getApp().login(data.user)
      
      return { success: true, user: data.user }
    } catch (error) {
      console.error('微信登录失败:', error)
      return { success: false, error }
    }
  }
  
  async logout() {
    try {
      await supabase.auth.signOut()
      getApp().logout()
      return { success: true }
    } catch (error) {
      console.error('登出失败:', error)
      return { success: false, error }
    }
  }
}

export default new AuthService()
```

#### 2. 权限管理策略
```sql
-- Row Level Security (RLS) 策略
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "Users can only access their own favorites"
  ON user_favorites FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can only access their own history"
  ON user_history FOR ALL  
  TO authenticated
  USING (auth.uid()::text = user_id::text);
```

### SVG 云存储方案

#### 1. Supabase Storage 配置
```javascript
// utils/storage.js
class StorageService {
  constructor() {
    this.bucket = 'svg-icons'
  }
  
  async uploadSVG(filePath, fileName) {
    try {
      // 读取本地 SVG 文件
      const fileContent = await this.readLocalFile(filePath)
      
      // 上传到 Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .upload(`icons/${fileName}`, fileContent, {
          contentType: 'image/svg+xml',
          upsert: true
        })
      
      if (error) throw error
      
      // 获取公共 URL
      const { data: urlData } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(`icons/${fileName}`)
      
      return {
        success: true,
        url: urlData.publicUrl,
        path: data.path
      }
    } catch (error) {
      console.error('SVG 上传失败:', error)
      return { success: false, error }
    }
  }
  
  async readLocalFile(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'utf8',
        success: (res) => resolve(res.data),
        fail: reject
      })
    })
  }
  
  // 批量上传本地 SVG 图标
  async batchUploadLocalSVGs() {
    const svgFiles = [
      '分类.svg',
      'browse.svg', 
      'user.svg',
      'search.svg',
      '播放-大.svg',
      '收藏-已选择.svg',
      // ... 更多 SVG 文件
    ]
    
    const results = []
    for (const fileName of svgFiles) {
      const localPath = `images/icons/${fileName}`
      const result = await this.uploadSVG(localPath, fileName)
      results.push({ fileName, ...result })
    }
    
    return results
  }
}

export default new StorageService()
```

#### 2. SVG 优化和管理
```javascript
// utils/svgOptimizer.js
class SVGOptimizer {
  // SVG 压缩优化
  optimizeSVG(svgContent) {
    return svgContent
      .replace(/\s+/g, ' ')              // 压缩空格
      .replace(/>\s+</g, '><')           // 移除标签间空格
      .replace(/\s*([\{\}:;,])\s*/g, '$1') // 压缩CSS
      .trim()
  }
  
  // 添加主题色支持
  addThemeSupport(svgContent, primaryColor = '#0884FF') {
    return svgContent.replace(
      /fill="[^"]*"/g, 
      `fill="var(--primary-color, ${primaryColor})"`
    )
  }
}
```

## 开发规范和最佳实践

### 1. 代码规范

#### 目录结构
```
miniprogram/
├── app.js                 # 小程序入口
├── app.json              # 全局配置
├── app.wxss              # 全局样式
├── config/               # 配置文件
│   ├── api.config.js     # API 配置
│   └── constants.js      # 常量定义
├── utils/                # 工具函数
│   ├── request.js        # 网络请求封装
│   ├── storage.js        # 存储工具
│   ├── audio.js          # 音频播放工具
│   └── format.js         # 格式化工具
├── services/             # 业务服务层
│   ├── auth.service.js   # 认证服务
│   ├── podcast.service.js # 播客服务
│   └── user.service.js   # 用户服务
├── components/           # 自定义组件
│   ├── audio-player/     # 音频播放器组件
│   ├── podcast-card/     # 播客卡片组件
│   └── loading/          # 加载组件
├── pages/                # 页面文件
└── images/               # 静态资源
```

#### 命名规范
- **文件命名**: 使用 kebab-case，如 `audio-player.js`
- **变量命名**: 使用 camelCase，如 `currentPodcast`
- **常量命名**: 使用 UPPER_SNAKE_CASE，如 `API_BASE_URL`
- **组件命名**: 使用 PascalCase，如 `AudioPlayer`

### 2. 状态管理进化

#### 从全局状态到模块化状态
```javascript
// store/index.js - 状态管理中心
class Store {
  constructor() {
    this.state = {
      user: {
        info: null,
        isLoggedIn: false
      },
      audio: {
        currentPodcast: null,
        isPlaying: false,
        progress: 0,
        volume: 1
      },
      data: {
        favorites: [],
        history: [],
        categories: []
      },
      ui: {
        theme: 'light',
        settings: {}
      }
    }
    
    this.listeners = {}
  }
  
  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = []
    }
    this.listeners[key].push(callback)
  }
  
  setState(key, value) {
    this.state[key] = { ...this.state[key], ...value }
    this.notify(key)
  }
  
  notify(key) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(callback => callback(this.state[key]))
    }
  }
}

export default new Store()
```

### 3. 网络请求封装

```javascript
// utils/request.js
class Request {
  constructor() {
    this.baseURL = 'YOUR_SUPABASE_URL'
    this.timeout = 10000
  }
  
  async request(options) {
    const {
      url,
      method = 'GET',
      data,
      header = {}
    } = options
    
    // 添加认证头
    const token = await this.getAuthToken()
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.baseURL}${url}`,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...header
        },
        timeout: this.timeout,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.errMsg}`))
          }
        },
        fail: reject
      })
    })
  }
  
  async getAuthToken() {
    const session = await supabase.auth.getSession()
    return session.data.session?.access_token
  }
  
  get(url, params) {
    return this.request({ url, method: 'GET', data: params })
  }
  
  post(url, data) {
    return this.request({ url, method: 'POST', data })
  }
  
  put(url, data) {
    return this.request({ url, method: 'PUT', data })
  }
  
  delete(url) {
    return this.request({ url, method: 'DELETE' })
  }
}

export default new Request()
```

### 4. 音频播放管理

```javascript
// utils/audioManager.js
class AudioManager {
  constructor() {
    this.audioContext = wx.createInnerAudioContext()
    this.currentPodcast = null
    this.isPlaying = false
    
    this.setupEventListeners()
  }
  
  setupEventListeners() {
    this.audioContext.onPlay(() => {
      this.isPlaying = true
      this.notifyStateChange()
    })
    
    this.audioContext.onPause(() => {
      this.isPlaying = false
      this.notifyStateChange()
    })
    
    this.audioContext.onTimeUpdate(() => {
      const progress = {
        currentTime: this.audioContext.currentTime,
        duration: this.audioContext.duration,
        progress: this.audioContext.currentTime / this.audioContext.duration
      }
      this.notifyProgressChange(progress)
    })
    
    this.audioContext.onEnded(() => {
      this.playNext()
    })
  }
  
  play(podcast) {
    if (this.currentPodcast?.id !== podcast.id) {
      this.audioContext.src = podcast.audioUrl
      this.currentPodcast = podcast
      
      // 添加到播放历史
      getApp().addToHistory(podcast)
    }
    
    this.audioContext.play()
  }
  
  pause() {
    this.audioContext.pause()
  }
  
  seek(position) {
    this.audioContext.seek(position)
  }
  
  notifyStateChange() {
    getApp().globalData.isPlaying = this.isPlaying
    getApp().globalData.currentPodcast = this.currentPodcast
  }
  
  notifyProgressChange(progress) {
    getApp().globalData.currentProgress = progress.progress
    // 通知页面更新进度
    wx.publishUpdate('audioProgress', progress)
  }
}

export default new AudioManager()
```

## 性能优化指南

### 1. 图片和资源优化

```javascript
// utils/imageOptimizer.js
class ImageOptimizer {
  // 图片压缩配置
  getOptimizedImageUrl(originalUrl, options = {}) {
    const {
      width = 750,
      height = 'auto',
      quality = 80,
      format = 'webp'
    } = options
    
    // 如果是 Supabase Storage URL，添加变换参数
    if (originalUrl.includes('supabase')) {
      return `${originalUrl}?width=${width}&height=${height}&quality=${quality}&format=${format}`
    }
    
    return originalUrl
  }
  
  // 懒加载图片
  lazyLoadImage(selector) {
    const observer = wx.createIntersectionObserver()
    observer.observe(selector, (entries) => {
      entries.forEach(entry => {
        if (entry.intersectionRatio > 0) {
          // 加载图片
          const dataset = entry.target.dataset
          if (dataset.src) {
            entry.target.src = dataset.src
            observer.unobserve(entry.target)
          }
        }
      })
    })
  }
}
```

### 2. 缓存策略

```javascript
// utils/cache.js
class CacheManager {
  constructor() {
    this.cachePrefix = 'dafenqi_'
    this.maxCacheSize = 50 // MB
  }
  
  async set(key, data, expireTime = 3600000) { // 默认1小时
    const cacheData = {
      data,
      timestamp: Date.now(),
      expireTime
    }
    
    try {
      wx.setStorageSync(`${this.cachePrefix}${key}`, cacheData)
      await this.cleanExpiredCache()
    } catch (error) {
      console.error('缓存设置失败:', error)
    }
  }
  
  get(key) {
    try {
      const cacheData = wx.getStorageSync(`${this.cachePrefix}${key}`)
      if (!cacheData) return null
      
      const { data, timestamp, expireTime } = cacheData
      
      // 检查是否过期
      if (Date.now() - timestamp > expireTime) {
        this.remove(key)
        return null
      }
      
      return data
    } catch (error) {
      console.error('缓存读取失败:', error)
      return null
    }
  }
  
  remove(key) {
    wx.removeStorageSync(`${this.cachePrefix}${key}`)
  }
  
  async cleanExpiredCache() {
    try {
      const info = wx.getStorageInfoSync()
      const keys = info.keys.filter(key => key.startsWith(this.cachePrefix))
      
      for (const key of keys) {
        const cacheData = wx.getStorageSync(key)
        if (cacheData && Date.now() - cacheData.timestamp > cacheData.expireTime) {
          wx.removeStorageSync(key)
        }
      }
    } catch (error) {
      console.error('缓存清理失败:', error)
    }
  }
}

export default new CacheManager()
```

## 部署和运维

### 1. 环境配置

```javascript
// config/environment.js
const environments = {
  development: {
    supabaseUrl: 'https://your-dev-project.supabase.co',
    supabaseKey: 'your-dev-anon-key',
    apiTimeout: 15000,
    debugMode: true
  },
  production: {
    supabaseUrl: 'https://your-prod-project.supabase.co', 
    supabaseKey: 'your-prod-anon-key',
    apiTimeout: 10000,
    debugMode: false
  }
}

const env = process.env.NODE_ENV || 'development'
export default environments[env]
```

### 2. 错误监控和日志

```javascript
// utils/logger.js
class Logger {
  constructor() {
    this.logs = []
    this.maxLogs = 100
  }
  
  log(level, message, extra = {}) {
    const logEntry = {
      level,
      message,
      extra,
      timestamp: new Date().toISOString(),
      page: getCurrentPages().pop()?.route || 'unknown'
    }
    
    this.logs.push(logEntry)
    
    // 保持日志数量限制
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
    
    // 开发环境输出到控制台
    if (config.debugMode) {
      console[level](message, extra)
    }
    
    // 错误级别上报到监控系统
    if (level === 'error') {
      this.reportError(logEntry)
    }
  }
  
  info(message, extra) {
    this.log('info', message, extra)
  }
  
  warn(message, extra) {
    this.log('warn', message, extra)
  }
  
  error(message, extra) {
    this.log('error', message, extra)
  }
  
  async reportError(logEntry) {
    try {
      // 上报到 Supabase 或其他错误监控服务
      await supabase.from('error_logs').insert({
        level: logEntry.level,
        message: logEntry.message,
        extra: logEntry.extra,
        page: logEntry.page,
        user_id: getApp().globalData.userInfo?.id,
        timestamp: logEntry.timestamp
      })
    } catch (error) {
      console.error('错误上报失败:', error)
    }
  }
}

export default new Logger()
```

## 测试策略

### 1. 单元测试
```javascript
// tests/utils/format.test.js
import { formatDuration, formatFileSize } from '../../utils/format'

describe('Format Utils', () => {
  test('formatDuration should format seconds correctly', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3661)).toBe('1:01:01')
  })
  
  test('formatFileSize should format bytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1048576)).toBe('1 MB')
  })
})
```

### 2. 集成测试
```javascript
// tests/services/auth.test.js
import AuthService from '../../services/auth.service'

describe('Auth Service', () => {
  test('should login with wechat successfully', async () => {
    // Mock wx.login
    wx.login = jest.fn().mockResolvedValue({ code: 'test_code' })
    
    const result = await AuthService.loginWithWechat()
    expect(result.success).toBe(true)
    expect(result.user).toBeDefined()
  })
})
```

## 安全最佳实践

### 1. 数据安全
- 敏感数据加密存储
- API 请求使用 HTTPS
- 用户输入验证和过滤
- SQL 注入防护（Supabase RLS）

### 2. 权限控制
```javascript
// utils/permission.js
class PermissionManager {
  async checkUserPermission(action, resource) {
    const user = getApp().globalData.userInfo
    if (!user) return false
    
    // 检查用户权限
    const { data } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('action', action)
      .eq('resource', resource)
      .single()
    
    return !!data
  }
  
  async requestPermission(scope) {
    return new Promise((resolve) => {
      wx.authorize({
        scope,
        success: () => resolve(true),
        fail: () => resolve(false)
      })
    })
  }
}
```

## 常用命令和工具

### 开发命令
```bash
# 启动开发者工具
npm run dev

# 构建生产版本  
npm run build

# 代码检查
npm run lint

# 运行测试
npm run test

# 上传 SVG 到云存储
npm run upload-svg
```

### Git 提交规范
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
test: 测试相关
chore: 构建过程或辅助工具的变动
```

## 未来规划

### 短期目标 (1-2个月)
- [ ] 完成 Supabase 后端集成
- [ ] 实现 OAuth2 用户认证
- [ ] SVG 云存储迁移
- [ ] 音频播放功能优化

### 中期目标 (3-6个月)  
- [ ] 推荐算法实现
- [ ] 社交功能开发
- [ ] 离线下载功能
- [ ] 性能监控和优化

### 长期目标 (6个月以上)
- [ ] AI 智能推荐
- [ ] 多端同步
- [ ] 内容创作工具
- [ ] 商业化功能

---

**注意**: 本文档应该随着项目进展持续更新，确保始终反映最新的架构和最佳实践。