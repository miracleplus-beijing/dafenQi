# Category Service 迁移指南

## 概述

`category.service.js` 已从使用 REST API (`requestUtil`) 迁移到使用 **Supabase 官方客户端库** (`supabaseService`)。

## 主要变更

### 之前（REST API 方式）
```javascript
// 旧方式：直接调用 REST API
const result = await requestUtil.get('/rest/v1/podcasts', {
  select: 'id,title,description,cover_url,duration,play_count,like_count,favorite_count,created_at,channels(id,name)',
  status: 'eq.published',
  order: 'play_count.desc,created_at.desc',
  limit: 10
});

// 返回原始数据数组
console.log(result[0]); // 直接是数据
```

### 现在（Supabase 客户端库方式）
```javascript
// 新方式：使用 supabaseService
const result = await supabaseService.select('podcasts', {
  columns: 'id,title,description,cover_url,duration,play_count,like_count,favorite_count,created_at,channels(id,name)',
  filters: { status: 'published' },
  order: 'play_count.desc',
  limit: 10
});

// 返回统一的响应对象
if (result.success) {
  console.log(result.data[0]); // 实际数据在 .data 中
} else {
  console.error(result.error); // 错误信息在 .error 中
}
```

## 迁移的具体改动

### 1. 导入模块替换
```javascript
// 旧
const requestUtil = require('../utils/request.js');

// 新
const supabaseService = require('./supabase.service.js');
```

### 2. 查询方法参数映射

#### SELECT 参数映射
| 旧参数 (REST API) | 新参数 (Supabase 客户端) | 说明 |
|---|---|---|
| `select` | `columns` | 选择的列 |
| `status: 'eq.published'` | `filters: { status: 'published' }` | 过滤条件 |
| `order: 'created_at.desc'` | `order: 'created_at.desc'` | 排序顺序（支持相同格式） |
| `limit: 10` | `limit: 10` | 限制数量 |
| `offset: 20` | `offset: 20` | 分页偏移 |

### 3. 响应格式处理

**旧方式（直接返回数据）：**
```javascript
const result = await requestUtil.get('/rest/v1/podcasts', {...});
// result 是数组或错误抛出异常
if (result && result.length > 0) {
  console.log(result[0]);
}
```

**新方式（统一的响应对象）：**
```javascript
const result = await supabaseService.select('podcasts', {...});
// result 是 { success: true/false, data?: Array, error?: string }
if (result.success) {
  console.log(result.data[0]);
} else {
  console.error(result.error);
}
```

## 修改的方法

### 1. getRankings(type, limit)
**变更内容：**
- 使用 `supabaseService.select()` 替代 `requestUtil.get()`
- 参数格式从 REST API 风格改为客户端库风格
- 排序参数简化：`'play_count.desc,created_at.desc'` → `'play_count.desc'`
- 添加了 `.success` 检查

**示例：**
```javascript
// 之前
const result = await requestUtil.get('/rest/v1/podcasts', {
  select: 'id,title,description,...',
  status: 'eq.published',
  order: 'play_count.desc,created_at.desc',
  limit: 10
});
const processedData = await this.processRankingData(result, type);

// 现在
const result = await supabaseService.select('podcasts', {
  columns: 'id,title,description,...',
  filters: { status: 'published' },
  order: 'play_count.desc',
  limit: 10
});

if (!result.success) {
  throw new Error(result.error);
}

const processedData = await this.processRankingData(result.data, type);
```

### 2. getFeaturedContent(limit)
**变更内容：**
- 使用 `supabaseService.select()` 查询 `editorial_recommendations` 表
- 参数格式统一调整
- 添加了错误处理

**示例：**
```javascript
// 之前
const result = await requestUtil.get('/rest/v1/editorial_recommendations', {
  select: 'id,recommendation_text,podcasts(...)',
  order: 'created_at.desc',
  limit: limit
});

const processedData = result.map(item => ({...}));

// 现在
const result = await supabaseService.select('editorial_recommendations', {
  columns: 'id,recommendation_text,podcasts(...)',
  order: 'created_at.desc',
  limit: limit
});

if (!result.success) {
  throw new Error(result.error);
}

const processedData = result.data.map(item => ({...}));
```

### 3. getPodcastsByCategory(categoryId, options)
**变更内容：**
- 使用 `supabaseService.select()` 查询
- 过滤条件改为对象格式：`{ status: 'published' }`
- 分页和排序参数调整
- 添加了错误处理

**示例：**
```javascript
// 之前
const result = await requestUtil.get('/rest/v1/podcasts', {
  select: 'id,title,...',
  status: 'eq.published',
  order: 'play_count.desc,created_at.desc',
  offset: offset,
  limit: limit
});

return {
  success: true,
  data: result,
  pagination: {
    total: result.length
  }
};

// 现在
const result = await supabaseService.select('podcasts', {
  columns: 'id,title,...',
  filters: { status: 'published' },
  order: 'play_count.desc',
  offset: offset,
  limit: limit
});

if (!result.success) {
  throw new Error(result.error);
}

return {
  success: true,
  data: result.data,
  pagination: {
    total: result.data.length
  }
};
```

## 数据类型参考

参考 `supabase.ts` 中定义的数据类型：

### Podcasts 表
```typescript
// 关键字段
id: string
title: string
description: string | null
cover_url: string | null
duration: number | null
play_count: number | null
like_count: number | null
favorite_count: number | null
created_at: string | null
channel_id: string | null
status: string | null
```

### Editorial Recommendations 表
```typescript
// 关键字段
id: string
recommendation_text: string
podcast_id: string | null
created_at: string | null
display_order: number | null
status: string | null
```

## 完整的 supabaseService API

### select(tableName, options)
查询数据

**参数：**
- `tableName` (string): 表名
- `options` (object):
  - `columns` (string): 选择的列，用逗号分隔（默认 `'*'`）
  - `filters` (object): 过滤条件 `{ fieldName: value }`
  - `order` (string): 排序，格式 `'fieldName.asc|desc'`
  - `limit` (number): 返回数量限制
  - `offset` (number): 分页偏移
  - `single` (boolean): 仅返回单个记录

**返回值：**
```javascript
{
  success: boolean,
  data: Array<Record> | Record | null,
  error?: string
}
```

**示例：**
```javascript
// 简单查询
const result = await supabaseService.select('podcasts', {
  limit: 10
});

// 带过滤和排序
const result = await supabaseService.select('podcasts', {
  columns: 'id,title,cover_url',
  filters: { status: 'published' },
  order: 'created_at.desc',
  limit: 20,
  offset: 0
});

// 获取单条记录
const result = await supabaseService.select('podcasts', {
  filters: { id: 'some-id' },
  single: true
});
```

### insert(tableName, records)
插入数据

**示例：**
```javascript
const result = await supabaseService.insert('comments', {
  podcast_id: 'podcast-id',
  content: 'Great podcast!',
  user_id: 'user-id'
});
```

### update(tableName, updates, filters)
更新数据

**示例：**
```javascript
const result = await supabaseService.update(
  'podcasts',
  { play_count: 100 },
  { id: 'podcast-id' }
);
```

### delete(tableName, filters)
删除数据

**示例：**
```javascript
const result = await supabaseService.delete(
  'comments',
  { id: 'comment-id' }
);
```

## 错误处理

所有 supabaseService 方法都返回统一格式的响应对象，包含 `success` 字段：

```javascript
const result = await supabaseService.select('podcasts', {...});

if (!result.success) {
  // 处理错误
  console.error('查询失败:', result.error);
  return {
    success: false,
    error: result.error
  };
}

// 使用数据
console.log('数据:', result.data);
```

## 优势

1. **统一的 API** - 所有数据库操作使用同一个客户端库
2. **更好的错误处理** - 标准化的错误响应格式
3. **类型安全** - 与 TypeScript 类型定义 (`supabase.ts`) 相一致
4. **自动会话管理** - 无需手动处理认证令牌
5. **更好的性能** - 客户端库内置了优化和缓存机制
6. **易于维护** - 集中管理数据库操作逻辑

## 迁移检查清单

- [x] 替换 `requestUtil` 导入为 `supabaseService`
- [x] 更新 `getRankings()` 方法
- [x] 更新 `getFeaturedContent()` 方法
- [x] 更新 `getPodcastsByCategory()` 方法
- [x] 调整所有查询参数格式
- [x] 添加 `.success` 检查
- [x] 更新数据访问路径（`result.data` 而不是 `result`）
- [x] 通过语法检查和编译验证

## 常见问题

**Q: 排序参数为什么变了？**
A: 新格式使用单个排序字段而不是逗号分隔的多字段。如果需要多字段排序，请在调用后手动排序数据。

**Q: 如何处理旧的 REST API 条件格式？**
A: 
```javascript
// 旧：status: 'eq.published'
// 新：filters: { status: 'published' }

// 旧：created_at: 'gte.2024-01-01'
// 新：filters: { created_at: { operator: 'gte', val: '2024-01-01' } }
```

**Q: 为什么需要检查 `.success`？**
A: 新的客户端库不会抛出异常，而是通过 `.success` 字段表示成功或失败，这样更易于控制错误处理流程。

## 后续改进

未来可能需要迁移的其他文件：
- `comment.service.js` - 使用 supabaseService 处理评论操作
- `auth.service.js` - 使用 supabaseService 的认证方法
- `favorite.service.js` - 使用 supabaseService 处理收藏操作

所有新的服务文件应遵循相同的迁移模式。
