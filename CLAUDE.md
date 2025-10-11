# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**达芬Qi说** is a WeChat miniprogram for audio podcast platform with Supabase backend integration. Built with native WeChat miniprogram framework (libVersion: 2.20.1), using glass-easel component framework and WeUI extended library for enhanced UI components.

## Architecture

### Core Structure
- **Entry**: `miniprogram/app.js` - Global state management
- **Pages**: `miniprogram/pages/` - Tab-based navigation (browse, category, profile)
- **Services**: `miniprogram/services/` - Business logic (auth, audio, storage)
- **Assets**: `miniprogram/images/` - Icons and static resources
- **Cloud**: `cloudfunctions/` - WeChat cloud functions

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

### WeChat Developer Tools
- **Preview**: Use WeChat Developer Tools "Preview" button
- **Upload**: Use "Upload" for production deployment
- **Test**: Use "Test" tab for testing on device

### Key Files to Watch
- `miniprogram/app.js` - Global state & lifecycle
- `miniprogram/app.json` - Routing & tab configuration  
- `project.config.json` - WeChat project settings

## Page Structure

### TabBar Navigation (app.json:19-44)
1. **Browse** (`pages/browse/browse`) - Main podcast browsing
2. **Category** (`pages/category/category`) - Podcast categories
3. **Profile** (`pages/profile/profile`) - User account/settings

### Additional Pages
- Search (`pages/search/search`) - Podcast search functionality
- Login (`pages/login/login`) - User authentication
- History (`pages/history/history`) - Playback history
- Favorites (`pages/favorites/favorites`) - Saved podcasts
- Settings (`pages/settings/settings`) - App preferences
- Feedback (`pages/feedback/feedback`) - User feedback
- Ranking (`pages/ranking/ranking`) - Podcast rankings
- Privacy Policy (`pages/privacy-policy/privacy-policy`) - Comprehensive privacy protection statement detailing data collection (user info, device info, operation logs), user rights, data storage practices, and contact information (product@miracleplus.com)
- Service Agreement (`pages/service-agreement/service-agreement`) - Terms of service
- Data Collection (`pages/data-collection/data-collection`) - Data collection notice
- Personal Info (`pages/personal-info/personal-info`) - Personal information management

## Key Services

### Authentication (services/auth.service.js)
Core authentication service handling WeChat OAuth2 integration with Supabase backend:
- **WeChat Login Flow**: `loginWithWechat()` - Mock OpenID generation and user creation/lookup
- **User Management**: `findOrCreateUser()`, `updateUserInfo()` - User profiles with WeChat integration
- **Session Management**: `saveUserSession()`, `getLocalUserSession()` - 7-day session persistence
- **Avatar Upload**: Private bucket storage with signed URL generation for user avatars
- **Supabase Integration**: Direct REST API calls for user operations with `supabaseRequest()`

### Storage Service (services/storage.service.js)
File storage abstraction layer for Supabase Storage:
- **Public User Files**: `uploadUserFileToPublicBucket()` - Secure user content storage
- **Signed URLs**: `generateUserFileSignedUrl()` - Temporary access to private files
- **File Management**: Upload, delete, and list operations for various file types
- **Image Processing**: Compression and optimization for WeChat constraints

### API Service (services/api.service.js)  
Centralized API layer organizing all backend operations:
- **Podcast Operations**: `podcast.getList()`, `podcast.getDetail()`, `podcast.getRecommended()`
- **User Operations**: `user.getFavorites()`, `user.addFavorite()`, `user.getHistory()`
- **Category Management**: `category.getList()`, `category.getPodcasts()`
- **Search**: `search.podcasts()`, `search.getHotKeywords()`
- **Statistics**: `stats.recordPlay()`, `stats.getPodcastStats()`

### Profile Service (services/profile.service.js)
Comprehensive user profile management service integrating storage and data synchronization:
- **Complete Profile Management**: `getUserCompleteProfile()`, `updateUserProfile()` - Full user profile with storage integration
- **Avatar Handling**: `handleAvatarUpdate()`, `cleanupOldAvatars()` - Private storage with automatic cleanup
- **Storage Integration**: `getUserStorageStats()`, `batchGenerateSignedUrls()` - File management and statistics
- **Global State Sync**: `syncToGlobalState()` - Automatic state synchronization across app
- **Profile Completeness**: `checkProfileCompleteness()` - Profile validation and completion tracking

### Audio Management (services/audio-preloader.service.js)
- Audio preloading and caching
- Playback state management
- Progress tracking

### Recommendation System (services/recommendation/index.js)
Comprehensive AI-powered recommendation engine with multiple services:
- **Personalized Recommendations**: `getPersonalizedRecommendations()` - User-based collaborative filtering
- **Popular Recommendations**: `getPopularRecommendations()` - Trending content discovery
- **Performance Monitoring**: Built-in health checks, performance stats, and degradation handling
- **User Behavior Tracking**: Click and conversion recording for algorithm improvement
- **Fallback System**: Graceful degradation when recommendation service is unavailable
- **Health Monitoring**: Real-time service health checks with automatic recovery

### Insight Service (services/insight.service.js)
AI-generated content insights and cognitive extraction:
- **Podcast Insights**: `getInsightsByPodcastId()`, `getMainInsightByPodcastId()` - AI-generated summaries and analysis
- **Content Types**: Summary, analysis, questions, quotes, highlights with metadata
- **User Interactions**: Like/view tracking, user engagement recording
- **Fallback Data**: Default insights when database content unavailable
- **Related Content**: Keywords, papers, authors linking for academic context

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
Services use direct HTTP requests via `wx.request()` with apikey/Bearer authentication:
```javascript
// Example from auth.service.js:475
wx.request({
  url: `${this.supabaseUrl}/rest/v1/users?wechat_openid=eq.${openId}`,
  method: 'GET',
  header: {
    'apikey': this.supabaseAnonKey,
    'Authorization': `Bearer ${this.supabaseAnonKey}`,
    'Content-Type': 'application/json'
  }
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
Central state in `app.js` globalData with automatic persistence:
- **Authentication State**: `userInfo`, `isLoggedIn`, `isGuestMode`
- **Playback State**: `currentPodcast`, `isPlaying`, `currentProgress`, `maxProgress`  
- **User Data**: `favoriteList`, `historyList` (synced to localStorage)
- **App Settings**: `settings.autoPlay`, `settings.downloadQuality`, `settings.theme`

State is accessed via `getApp().globalData` and automatically persisted via:
- `loadLocalData()` on app launch (app.js:72)
- `saveLocalData()` on app hide (app.js:86)

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
- Import services at page level: `const authService = require('../../services/auth.service.js')`
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
1. Get complete profile: `await profileService.getUserCompleteProfile(userId)`
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
**IMPORTANT**: Always use the correct Supabase static-images URL for icons:
- **Base URL**: `https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/`
- **Example Usage**: 
  - Search icon: `https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/search.svg`
  - Play icon: `https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/play-small.svg`
  - Close icon: `https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/close.svg`
- **DO NOT** use incorrect paths like `/icons/` or `public/icons/` - always use the full Supabase URL
- All icons are SVG format and stored in the `static-images` bucket