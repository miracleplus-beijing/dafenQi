# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**奇绩前沿信号** is a WeChat miniprogram for audio podcast platform with Supabase backend integration. Built with native WeChat miniprogram framework (libVersion: 3.10.2), using glass-easel component framework, TDesign UI library (v1.10.1), and comprehensive service-oriented architecture.

## Architecture

### Core Structure
- **Entry**: `miniprogram/app.js` - Global state management and lifecycle
- **Pages**: `miniprogram/pages/` - 16 pages with 3 tab navigation (browse, category, profile)
- **Services**: `miniprogram/services/` - 12 specialized business logic services
- **Components**: `miniprogram/components/` - 4 custom reusable components
- **Utils**: `miniprogram/utils/` - 3 utility modules (request, icon-config, text-utils)
- **Assets**: `miniprogram/images/` - Icons and static resources
- **UI Framework**: TDesign miniprogram v1.10.1 with 20+ components

### Global State (app.js:2-19)
```javascript
{
  userInfo: null,           // User authentication
  isLoggedIn: false,        // Login status
  currentProgress: 0,       // Audio playback progress
  isPlaying: false,         // Playback state
  currentPodcast: null,     // Active podcast
  favoriteList: [],         // User favorites
  historyList: [],          // Playback history
  settings: {               // User preferences
    autoPlay: false,
    downloadQuality: 'high',
    theme: 'light'
  },
  supabaseUrl: 'https://gxvfcafgnhzjiauukssj.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

## Development Commands

### npm Scripts (miniprogram/)
```bash
npm run lint              # Check code with ESLint
npm run lint:fix          # Auto-fix ESLint issues
npm run format            # Format code with Prettier
npm run check-format      # Check if code is formatted
```

### WeChat Developer Tools
- **Preview**: Use WeChat Developer Tools "Preview" button
- **Upload**: Use "Upload" for production deployment
- **Test**: Use "Test" tab for device testing
- **Build**: Use "Build npm" for TDesign components

### Key Configuration Files
- `miniprogram/app.js` - Global state & lifecycle
- `miniprogram/app.json` - Routing & tab configuration
- `project.config.json` - WeChat project settings (AppID: wxdfbf85ea64f424da)
- `miniprogram/package.json` - Dependencies and scripts

## Page Structure

### TabBar Navigation (app.json:38-57)
1. **Browse** (`pages/browse/browse`) - Main podcast browsing and playback
2. **Category** (`pages/category/category`) - Podcast categories and academic fields
3. **Profile** (`pages/profile/profile`) - User account, settings, and profile management

### Additional Pages
- **Search** (`pages/search/search`) - Podcast search functionality
- **Login** (`pages/login/login`) - User authentication and WeChat OAuth
- **History** (`pages/history/history`) - Playback history tracking
- **Favorites** (`pages/favorites/favorites`) - User saved podcasts
- **Settings** (`pages/settings/settings`) - App preferences and configurations
- **Feedback** (`pages/feedback/feedback`) - User feedback collection
- **Ranking** (`pages/ranking/ranking`) - Podcast popularity rankings
- **Personal Info** (`pages/personal-info/personal-info`) - Personal data management
- **Account Cancel** (`pages/account-cancel/account-cancel`) - Account deletion workflow

### Privacy & Legal Pages
- **Privacy Policy** (`pages/privacy-policy/privacy-policy`) - Comprehensive privacy protection statement
- **Service Agreement** (`pages/service-agreement/service-agreement`) - Terms of service
- **Data Collection** (`pages/data-collection/data-collection`) - Data collection transparency notice

### Legacy Pages
- **Index** (`pages/index/index`) - Legacy entry page (superseded by browse)

## Key Services

The app uses 12 specialized services following a service-oriented architecture:

### Authentication & User Management
- **`auth.service.js`** - WeChat OAuth2, session management, user creation/lookup
- **`profile.service.js`** - Complete user profile management with storage integration (deprecated in current build)

### Content & Data Services
- **`api.service.js`** - Centralized API facade for all Supabase operations
- **`category.service.js`** - Academic field and category management (使用 supabaseService 客户端库)
- **`comment.service.js`** - User comments and social interactions
- **`insight.service.js`** - AI-generated content insights and cognitive extraction

### Media & Storage Services
- **`audio.service.js`** - Core audio playback and control
- **`audio-preloader.service.js`** - Smart audio preloading and caching
- **`audio-chunk-manager.service.js`** - Audio chunk management for streaming
- **`smart-preload-controller.service.js`** - Intelligent content preloading strategy
- **`storage.service.js`** - File upload/download, Supabase Storage abstraction
- **`image.service.js`** - Image processing and optimization

### Performance & Utility Services
- **`lru-cache.service.js`** - Least Recently Used caching implementation

### Service Architecture Pattern
```javascript
// Standard service response format
{ success: true, data: responseData }   // Success
{ success: false, error: errorMessage } // Error

// Service import pattern
const { authService } = require('../../services/auth.service.js')
const { apiService } = require('../../services/api.service.js')
```

## Supabase Integration

### Configuration (app.js:18-19)
- **URL**: `https://gxvfcafgnhzjiauukssj.supabase.co`
- **Anon Key**: Configured in globalData
- **Auth**: Uses WeChat login flow

### Database Schema

#### Core Tables
- **`users`** (35 records) - User profiles with WeChat integration
  - `id` (UUID) - User unique identifier
  - `wechat_openid` (VARCHAR, unique) - WeChat OpenID for authentication
  - `username`, `nickname` - User display names
  - `avatar_url` - User avatar URL
  - `orcid` - Academic identifier (optional)
  - `role` - User role (user/admin)
  - `academic_field` (JSONB) - Academic field preferences array
  - `is_active` - Account activation status
  - `created_at`, `updated_at` - Timestamps

- **`channels`** (6 records) - Podcast channels/shows
  - `id` (UUID) - Channel unique identifier  
  - `name` - Channel name (e.g., "达芬Qi官方", "计算机视觉前沿")
  - `description` - Channel description
  - `cover_url` - Channel cover image
  - `creator_id` (UUID) - References users.id
  - `category` - Academic category (e.g., "CS.AI", "CS.CV", "CS.CL")
  - `is_official` - Official channel flag
  - `subscriber_count` - Number of subscribers
  - `created_at`, `updated_at` - Timestamps

- **`podcasts`** (34 records) - Individual podcast episodes
  - `id` (UUID) - Episode unique identifier
  - `title` - Episode title (e.g., "奇绩前沿信号 8.1")
  - `description` - Episode description
  - `cover_url` - Episode cover image
  - `audio_url` - Audio file URL in podcast-audios bucket
  - `duration` - Audio duration in seconds
  - `channel_id` (UUID) - References channels.id
  - Paper metadata: `paper_url`, `paper_title`, `authors` (JSONB), `institution`, `publish_date`, `arxiv_id`, `doi`
  - Statistics: `play_count`, `like_count`, `favorite_count`, `comment_count`, `share_count`
  - `status` - Publication status (draft/published/removed)
  - `created_at`, `updated_at` - Timestamps

#### User Interaction Tables  
- **`user_favorites`** - User podcast favorites
  - Links users.id → podcasts.id with created_at timestamp

- **`user_likes`** - User podcast likes
  - Links users.id → podcasts.id with created_at timestamp

- **`user_play_history`** - Playback history tracking
  - `user_id`, `podcast_id` - References to users and podcasts
  - `play_position` - Last playback position in seconds
  - `play_duration` - Duration played in this session
  - `completed` - Whether episode was completed
  - `played_at` - Playback timestamp

#### Content & Interaction Tables
- **`comments`** - User comments on podcasts
  - `user_id`, `podcast_id` - References to users and podcasts
  - `parent_id` - For nested replies (references comments.id)
  - `content` - Comment text content
  - `like_count` - Number of likes on comment
  - `audio_timestamp` - Associated timestamp in audio (seconds)
  - `is_deleted` - Soft deletion flag
  - `created_at`, `updated_at` - Timestamps

- **`comment_likes`** - Likes on comments
  - Links users.id → comments.id with created_at timestamp

- **`insights`** (6 records) - AI-generated podcast insights
  - `podcast_id` - Associated podcast
  - `creator_id` - Creator (NULL for system-generated)
  - `summary`, `detailed_content` - Insight content
  - `keywords`, `related_papers`, `related_authors` - Related metadata (JSONB)
  - `audio_timestamp`, `duration` - Time-based segments
  - `insight_type` - summary/analysis/question/quote/highlight
  - `source_type` - system/user/ai_generated
  - `like_count`, `view_count` - Engagement metrics

#### System Tables
- **`static_assets`** (20 records) - Static resource management
  - `id` (UUID) - Asset unique identifier
  - `name` - Internal reference name (e.g., "nav-browse", "nav-category")
  - `original_name` - Original filename (e.g., "漫游.svg", "分类.svg")
  - `file_type` - File type (svg, png, etc.)
  - `file_url` - Public URL to asset
  - `file_size` - File size in bytes
  - `usage_type` - Usage category (nav_icon, etc.)
  - `metadata` (JSONB) - Additional metadata (size, category, etc.)
  - `created_at`, `updated_at` - Timestamps

- **`research_fields`** (21 records) - Academic field taxonomy with hierarchical structure
- **`institutions`** (10 records) - Academic institutions with codes and multilingual names

### Storage Buckets
- **`user_profile`** (Private) - User avatars, profile files, and personal documents
  - Private bucket requiring signed URLs for access
  - File path structure: `{userId}/{fileType}/{filename}`
  - Default signed URL expiration: 24 hours
  
- **`static-images`** (Public) - App icons, UI assets, and default images  
  - Public bucket with direct URL access
  - Static assets for app interface and branding
  
- **`podcast-audios`** (Public) - Podcast audio files
  - Public bucket for podcast episode audio content
  - Example URLs: `https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/podcast-audios/2025.8/8.1.mp3`

### Extensions & Infrastructure
- **Installed Extensions**:
  - `uuid-ossp` (1.1) - UUID generation functions
  - `pgcrypto` (1.3) - Cryptographic functions
  - `pg_graphql` (1.5.11) - GraphQL API support
  - `pg_stat_statements` (1.11) - SQL performance monitoring
  - `supabase_vault` (0.3.1) - Secrets management
  - Over 70+ additional extensions available

- **Migration History**: 26 migrations from 20250830 to 20250907
  - Initial schema creation (users, channels, podcasts)
  - User interaction tables (favorites, likes, history, comments)
  - RLS (Row Level Security) policy setup
  - WeChat authentication integration
  - Static assets management
  - Recent additions: insights system, academic fields, institutions

### Request Pattern

**重要：请使用 @supabase.service.js 而不是 REST API**

所有数据库操作应该使用 Supabase 官方客户端库：

```javascript
// ✅ 推荐做法 - 使用 supabase.service.js
const { supabaseService } = require('../../services/supabase.service.js')

// 查询数据
const result = await supabaseService.select('podcasts', {
    columns: 'id,title,cover_url',
    filters: { status: 'published' },
    orderBy: { column: 'created_at', ascending: false },
    limit: 20
})

// 插入数据
const insertResult = await supabaseService.insert('comments', {
    podcast_id: podcastId,
    user_id: userId,
    content: 'User comment',
    created_at: new Date().toISOString()
})

// 更新数据
const updateResult = await supabaseService.update('users', 
    { nickname: 'New Name' },
    { id: userId }
)

// 删除数据
const deleteResult = await supabaseService.delete('comments',
    { id: commentId }
)
```

**不推荐：直接使用 REST API**

```javascript
// ❌ 不推荐 - 避免直接调用 REST API
wx.request({
    url: 'https://gxvfcafgnhzjiauukssj.supabase.co/rest/v1/podcasts',
    method: 'GET',
    header: { 'apikey': '...' },
    ...
})
```

### Supabase Service API 文档

supabaseService 提供以下主要方法：

| 方法 | 说明 | 用途 |
|------|------|------|
| `select()` | 查询表数据 | SELECT 操作 |
| `insert()` | 插入数据 | INSERT 操作 |
| `update()` | 更新数据 | UPDATE 操作 |
| `delete()` | 删除数据 | DELETE 操作 |
| `table()` | 获取表引用 | 直接访问 Supabase 表 |
| `storage()` | 获取存储引用 | 文件存储操作 |
| `auth()` | 获取认证对象 | 认证相关操作 |
| `getSession()` | 获取当前会话 | 用户会话管理 |
| `getUser()` | 获取当前用户 | 用户信息获取 |

### 使用示例

#### 示例 1：获取播客列表

```javascript
const result = await supabaseService.select('podcasts', {
    columns: 'id,title,cover_url,duration,channels(name)',
    filters: { status: 'published' },
    orderBy: { column: 'created_at', ascending: false },
    limit: 20,
    offset: 0
})

if (result.success) {
    console.log('播客列表:', result.data)
} else {
    console.error('查询失败:', result.error)
}
```

#### 示例 2：发表评论

```javascript
const result = await supabaseService.insert('comments', {
    podcast_id: 'podcast-123',
    user_id: 'user-456',
    content: 'Great episode!',
    audio_timestamp: 120,
    created_at: new Date().toISOString()
})

if (result.success) {
    console.log('评论已发表:', result.data[0])
} else {
    console.error('发表评论失败:', result.error)
}
```

#### 示例 3：更新用户信息

```javascript
const result = await supabaseService.update('users',
    {
        nickname: 'New Name',
        avatar_url: 'https://...',
        updated_at: new Date().toISOString()
    },
    { id: userId }
)

if (result.success) {
    console.log('用户信息已更新')
} else {
    console.error('更新失败:', result.error)
}
```

### 认证和授权

所有 Supabase 操作都会：
1. **自动使用 WeChat 小程序存储** - Session 会自动保存到 wx.getStorageSync
2. **自动刷新 Token** - 当 Token 即将过期时自动刷新
3. **遵守 Row Level Security** - 数据库的 RLS 策略会自动生效
4. **智能认证选择** - 根据操作类型自动选择合适的认证方式

### 迁移旧代码

如果还有使用 REST API 的旧代码，应该逐步迁移：

**旧方式（request.js）：**
```javascript
const result = await requestUtil.get('/rest/v1/podcasts', {
    select: 'id,title',
    order: 'created_at.desc',
    limit: 20
})
```

**新方式（supabase.service.js）：**
```javascript
const result = await supabaseService.select('podcasts', {
    columns: 'id,title',
    orderBy: { column: 'created_at', ascending: false },
    limit: 20
})
```

## Architecture Patterns

### Service Layer Architecture
The app uses a service-oriented architecture with clear separation:

1. **UI Layer** (`pages/`) - WeChat miniprogram pages handling user interaction
2. **Service Layer** (`services/`) - Business logic and external integrations  
3. **Utility Layer** (`utils/`) - Helper functions and reusable code
4. **Global State** (`app.js`) - Centralized state management with local storage persistence

### Global State Management
Central state in `app.js` globalData with automatic persistence and lifecycle management:

**Core State Structure** (app.js:2-21):
```javascript
{
  // Authentication
  userInfo: null,           // User profile data
  isLoggedIn: false,        // Login status
  isGuestMode: false,       // Guest mode flag

  // Audio Playback
  currentProgress: 0,       // Current playback position
  maxProgress: 100,         // Total duration
  isPlaying: false,         // Playback state
  currentPodcast: null,     // Active podcast data

  // User Data Collections
  favoriteList: [],         // User favorites (synced to localStorage)
  historyList: [],          // Playback history (synced to localStorage)

  // App Preferences
  settings: {
    autoPlay: false,        // Auto-play disabled by default
    downloadQuality: 'high',
    theme: 'light'
  },

  // Backend Configuration
  supabaseUrl: 'https://gxvfcafgnhzjiauukssj.supabase.co',
  supabaseAnonKey: 'eyJhbGci...'  // JWT token for Supabase API
}
```

**Lifecycle Management**:
- **onLaunch** (app.js:23): Initialize privacy check, auth service, and load local data
- **onShow** (app.js:39): App becomes visible, check for updates
- **onHide** (app.js:43): Save all data to local storage

**State Access Pattern**:
```javascript
const app = getApp()
const userData = app.globalData.userInfo
app.globalData.isPlaying = true
app.saveLocalData()  // Manual save if needed
```

**Built-in State Methods**:
- `addToFavorites(podcastId)` - Add podcast to favorites with UI feedback
- `addToHistory(podcastData)` - Track playback history
- `loadLocalData()` - Restore from wx.storage on app launch
- `saveLocalData()` - Persist to wx.storage on app hide

### Error Handling Pattern
Services return consistent result objects:
```javascript
// Success
{ success: true, data: responseData }
// Error  
{ success: false, error: errorMessage }
```

### File Upload Architecture
Two-tier storage system:
- **Public Buckets**: Static assets, podcast content - direct public URLs
- **Private Buckets**: User content - signed URLs with expiration (24h default)

User files follow path structure: `{userId}/{fileType}/{filename}` in `user_profile` bucket

### TDesign UI Framework Integration
**Version**: v1.10.1 (miniprogram/package.json)
**Installation**: Built via npm and WeChat "Build npm" process
**Location**: `miniprogram/miniprogram_npm/tdesign-miniprogram/`

**Key Components Available**:
- **Navigation**: navbar, tab-bar, tab-bar-item, tabs, tab-panel
- **Layout**: grid, grid-item, row, col, divider, sticky
- **Form**: button, input, checkbox, radio, switch, picker, search
- **Display**: icon, image, avatar, badge, tag, progress, loading
- **Feedback**: toast, dialog, message, overlay, popup
- **Advanced**: calendar, color-picker, image-viewer, qrcode

**Usage Pattern**:
```wxml
<!-- In page .wxml files -->
<t-button variant="fill" size="large">Primary Button</t-button>
<t-icon name="heart" size="24px"></t-icon>
<t-loading theme="circular" size="24px"></t-loading>
```

**Custom Components** (4 total in `miniprogram/components/`):
- `category-card` - Academic category display
- `featured-card` - Featured content cards
- `ranking-list` - Podcast ranking display
- `cloudTipModal` - Cloud service tips modal

**Icon Guidelines**:
**IMPORTANT**: Must prioritize TDesign icons first. When TDesign icons cannot meet requirements, notify user to explain icon choice and let them replace manually.

## Development Workflow

### 1. Setup
- Open project in WeChat Developer Tools
- Configure AppID: `wxdfbf85ea64f424da`
- Check cloud environment settings

### 2. Testing & Debugging
- Use "Preview" for quick testing
- Use "Test" tab for device testing
- Check console logs in Developer Tools
- Monitor network requests in Network tab
- Test on both iOS and Android simulators

### 3. Working with Services
When modifying services, follow these patterns:
- Import services at page level: `const { authService }= require('../../services/auth.service.js')`
- Always handle both success and error cases
- Check authentication state before making user-specific API calls
- Use `getApp().globalData` for accessing global state
- For profile operations, use `profileService` for comprehensive user management with storage integration

### 4. Deployment
- Use "Upload" in Developer Tools
- Version in `project.config.json`
- Submit for WeChat review

## Common Development Tasks

### Adding New Page
1. Add entry to `app.json` pages array
2. Create page directory under `miniprogram/pages/` with `.js`, `.wxml`, `.wxss`, `.json`
3. Add tabBar entry if needed in `app.json` tabBar section
4. Update navigation in relevant pages using `wx.navigateTo()`

### Working with Authentication
1. Check login status: `await authService.checkLoginStatus()`
2. Access current user: `authService.getCurrentUser()`
3. Handle login flow: `await authService.loginWithWechat()`
4. Update user info: `await authService.updateUserInfo(userInfo)`

### Working with User Profiles
1. Get complete profile: `await profileService.getCurrentUserCompleteProfile(userId)`
2. Update profile: `await profileService.updateUserProfile(userId, updateData)`
3. Check completeness: `profileService.checkProfileCompleteness(user)`
4. Upload avatar: Include `avatarFile` in updateData for automatic private storage handling

### Working with Recommendation System
1. Initialize service: `await recommendationService.initialize()`
2. Get personalized recommendations: `await recommendationService.getPersonalizedRecommendations(userId, options)`
3. Get popular content: `await recommendationService.getPopularRecommendations(limit)`
4. Record user interactions: `await recommendationService.recordRecommendationClick(userId, podcastId, recommendationId, position)`
5. Monitor performance: `await recommendationService.getPerformanceReport()`
6. Health check: `await recommendationService.performHealthCheck()`

### Working with Insights
1. Get podcast insights: `await insightService.getInsightsByPodcastId(podcastId)`
2. Get main insight: `await insightService.getMainInsightByPodcastId(podcastId)`
3. Get insight details: `await insightService.getInsightById(insightId)`
4. Record user engagement: `await insightService.incrementLikeCount(insightId)`
5. Track interactions: `await insightService.createUserInteraction(userId, insightId, type)`
6. Get popular insights: `await insightService.getPopularInsights(limit)`

### Adding API Endpoints
1. Add new methods to appropriate section in `apiService` (podcast/user/category/search/stats)
2. Follow the existing pattern with success/error objects
3. Use requestUtil for HTTP operations
4. Handle Supabase PostgREST query parameters

### File Upload Implementation
1. For user files: Use `storageService.uploadUserFileToPublicBucket(userId, fileType, filePath)`
2. For public files: Use `storageService.uploadFile(bucketName, filePath, fileName)`
3. Generate signed URLs for private files: `storageService.generateUserFileSignedUrl()`

### Managing Global State
1. Access: `const app = getApp(); const data = app.globalData.someData`
2. Update: `app.globalData.someData = newValue`  
3. Persist changes: Call methods like `app.addToFavorites()`, `app.addToHistory()`
4. State automatically saved on app hide via `saveLocalData()`

## File Patterns

### Naming Conventions
- **Pages**: `kebab-case` directories (e.g., `browse/`, `profile/`)
- **Files**: `.js`, `.wxml`, `.wxss`, `.json` per page
- **Services**: `service-name.service.js`
- **Icons**: PNG format for tabBar, SVG for general use

### Directory Structure
```
miniprogram/
├── app.js              # Global app logic
├── app.json            # App configuration
├── app.wxss            # Global styles
├── pages/
│   ├── browse/         # Main browsing page
│   ├── category/       # Category page
│   └── profile/        # User profile
├── services/           # Business logic
├── images/             # Static assets
└── utils/              # Helper utilities
```

## Environment Notes

### WeChat Platform Constraints
- **No npm/node_modules**: Use native WeChat APIs and vanilla JavaScript
- **Component Framework**: Uses glass-easel for enhanced component capabilities
- **WeUI Integration**: WeUI extended library available for standard UI components
- **Network Whitelist**: External domains must be configured in WeChat backend
- **Storage Limits**: 10MB per app local storage
- **File Size Limits**: 2MB per file transfer  
- **HTTPS Required**: All external API endpoints must use HTTPS
- **Privacy Compliance**: `__usePrivacyCheck__` enabled for data collection compliance

### Authentication Flow
1. Mock WeChat login generates `mock_openid_${code}` (auth.service.js:28)
2. Lookup existing user or create new user in Supabase `users` table
3. User profiles are managed directly in the `users` table (no separate user_profile table)
4. Session persists 7 days in local storage (auth.service.js:626)
5. Global state updated: `app.globalData.userInfo`, `app.globalData.isLoggedIn`

### API Request Security
All Supabase requests use:
- **API Key**: Public anon key in Authorization header
- **Row Level Security**: Database policies control access
- **HTTPS**: All requests over secure transport

### Icon Usage Guidelines
**IMPORTANT**: 必须以 t-design 的icon为先，当t-design的图标 无法满足需求时，需要向用户提醒，解释使用什么样的 icon，让用户自行替换