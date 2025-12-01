# Supabase Service 使用指南

## 概述

本项目已升级为使用 Supabase 官方客户端库（`supabaseService`）进行所有数据库操作，而不是直接调用 REST API。这提供了以下优势：

- ✅ **自动认证管理** - 自动处理 Token 刷新和会话管理
- ✅ **类型安全** - 官方库提供更好的 IDE 支持
- ✅ **自动错误处理** - 统一的错误处理机制
- ✅ **性能优化** - 自动的缓存和优化
- ✅ **维护性** - 统一的 API，便于维护

## 快速开始

### 导入 supabaseService

```javascript
// ✅ 推荐做法
const { supabaseService } = require('../../services/supabase.service.js')
```

### 基本操作

#### 1. 查询数据 (SELECT)

**旧方式 (REST API)：**
```javascript
const result = await requestUtil.get('/rest/v1/podcasts', {
  select: 'id,title,cover_url',
  status: 'eq.published',
  order: 'created_at.desc',
  limit: 20
})
```

**新方式 (supabaseService)：**
```javascript
const result = await supabaseService.select('podcasts', {
  columns: 'id,title,cover_url',
  filters: { status: 'published' },
  orderBy: { column: 'created_at', ascending: false },
  limit: 20
})

if (result.success) {
  console.log('数据:', result.data)
} else {
  console.error('错误:', result.error)
}
```

#### 2. 插入数据 (INSERT)

**旧方式 (REST API)：**
```javascript
const result = await requestUtil.post('/rest/v1/comments', {
  podcast_id: podcastId,
  user_id: userId,
  content: 'My comment'
})
```

**新方式 (supabaseService)：**
```javascript
const result = await supabaseService.insert('comments', {
  podcast_id: podcastId,
  user_id: userId,
  content: 'My comment'
})

if (result.success) {
  console.log('已插入:', result.data)
} else {
  console.error('插入失败:', result.error)
}
```

#### 3. 更新数据 (UPDATE)

**旧方式 (REST API)：**
```javascript
const result = await requestUtil.patch('/rest/v1/users', 
  { nickname: 'New Name' },
  { id: 'eq.' + userId }
)
```

**新方式 (supabaseService)：**
```javascript
const result = await supabaseService.update('users',
  { nickname: 'New Name' },
  { id: userId }
)

if (result.success) {
  console.log('已更新')
} else {
  console.error('更新失败:', result.error)
}
```

#### 4. 删除数据 (DELETE)

**旧方式 (REST API)：**
```javascript
const result = await requestUtil.delete('/rest/v1/comments',
  { id: 'eq.' + commentId }
)
```

**新方式 (supabaseService)：**
```javascript
const result = await supabaseService.delete('comments', { id: commentId })

if (result.success) {
  console.log('已删除')
} else {
  console.error('删除失败:', result.error)
}
```

## API 参考

### select(tableName, options)

查询表中的数据

**参数：**
- `tableName` (string) - 表名
- `options` (object) - 查询选项
  - `columns` (string) - 选择的列，默认为 '*'
  - `filters` (object) - 过滤条件
  - `orderBy` (object) - 排序条件
    - `column` (string) - 排序列
    - `ascending` (boolean) - 是否升序，默认 false
  - `limit` (number) - 返回行数限制
  - `offset` (number) - 分页偏移

**返回值：**
```javascript
{
  success: boolean,
  data: Array,      // 查询结果
  error: string     // 错误信息（失败时）
}
```

**示例：**
```javascript
const result = await supabaseService.select('podcasts', {
  columns: 'id,title,cover_url,channels(name)',
  filters: { status: 'published', featured: true },
  orderBy: { column: 'created_at', ascending: false },
  limit: 20,
  offset: 0
})
```

### insert(tableName, records)

向表中插入数据

**参数：**
- `tableName` (string) - 表名
- `records` (object|array) - 要插入的记录

**返回值：**
```javascript
{
  success: boolean,
  data: Array,      // 插入的记录
  error: string     // 错误信息（失败时）
}
```

**示例：**
```javascript
const result = await supabaseService.insert('comments', {
  podcast_id: 'podcast-123',
  user_id: 'user-456',
  content: 'Great episode!',
  created_at: new Date().toISOString()
})

// 插入多条记录
const result = await supabaseService.insert('comments', [
  { podcast_id: 'p1', user_id: 'u1', content: 'Comment 1' },
  { podcast_id: 'p2', user_id: 'u2', content: 'Comment 2' }
])
```

### update(tableName, updates, filters)

更新表中的数据

**参数：**
- `tableName` (string) - 表名
- `updates` (object) - 要更新的字段及值
- `filters` (object) - 更新条件

**返回值：**
```javascript
{
  success: boolean,
  data: Array,      // 更新后的记录
  error: string     // 错误信息（失败时）
}
```

**示例：**
```javascript
const result = await supabaseService.update('users',
  {
    nickname: 'New Name',
    avatar_url: 'https://example.com/avatar.jpg',
    updated_at: new Date().toISOString()
  },
  { id: userId }
)

// 多条件更新
const result = await supabaseService.update('podcasts',
  { favorite_count: 10 },
  { status: 'published', created_by: userId }
)
```

### delete(tableName, filters)

从表中删除数据

**参数：**
- `tableName` (string) - 表名
- `filters` (object) - 删除条件

**返回值：**
```javascript
{
  success: boolean,
  data: Array,
  error: string     // 错误信息（失败时）
}
```

**示例：**
```javascript
const result = await supabaseService.delete('comments', {
  id: commentId
})

// 删除多条记录
const result = await supabaseService.delete('comments', {
  podcast_id: podcastId,
  user_id: userId
})
```

### 高级操作

#### 直接访问 Supabase 表

对于复杂查询，可以直接访问 Supabase 的表对象：

```javascript
const table = supabaseService.table('podcasts')
const { data, error } = await table
  .select('*')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .limit(20)

if (error) {
  console.error('查询失败:', error)
} else {
  console.log('查询结果:', data)
}
```

#### 获取认证信息

```javascript
// 获取当前会话
const { success, session } = await supabaseService.getSession()

// 获取当前用户
const { success, user } = await supabaseService.getUser()
```

## 迁移检查清单

迁移时请检查以下项目：

- [ ] 所有服务文件已导入 `supabaseService`
- [ ] 所有 REST API 调用已替换为 `supabaseService` 方法
- [ ] 所有错误处理已更新为检查 `result.success`
- [ ] 所有过滤条件已从 Supabase 查询字符串格式转换
- [ ] 所有排序条件已从字符串格式转换为对象格式
- [ ] 已测试所有数据库操作

## 常见问题

### Q: 如何处理关联查询？

A: 在 `columns` 中指定关联表：

```javascript
const result = await supabaseService.select('comments', {
  columns: 'id,content,user:user_id(id,nickname,avatar_url),podcast:podcast_id(title)',
  filters: { podcast_id: podcastId }
})
```

### Q: 如何处理事务？

A: 目前 supabaseService 不支持事务，如需事务支持，直接使用 Supabase 客户端：

```javascript
const { supabaseClient } = require('../../services/supabase.service.js')

// 复杂的多步骤操作应该在服务层处理
```

### Q: 如何处理实时订阅？

A: 对于实时功能，使用 Supabase 的实时 API：

```javascript
const { supabaseClient } = require('../../services/supabase.service.js')

const subscription = supabaseClient
  .channel('schema-db-changes')
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'comments' 
    },
    payload => {
      console.log('新评论:', payload)
    }
  )
  .subscribe()
```

### Q: 旧的 request.js 还能用吗？

A: 不推荐使用 request.js 进行数据库操作，但它仍然用于：
- 上传文件
- 调用 Edge Function
- 其他非数据库操作

对于数据库操作，请使用 `supabaseService`。

## 性能建议

1. **使用分页** - 对大数据集使用 `limit` 和 `offset`
2. **选择必要的列** - 不要使用 `*`，明确指定需要的列
3. **使用索引** - 在频繁查询的列上创建索引
4. **批量操作** - 使用数组一次插入多条记录

## 排障指南

### 认证错误 (401)

**问题：** 收到 401 Unauthorized 错误

**解决方案：**
1. 确保用户已登录：`const user = await supabaseService.getUser()`
2. 检查 Session 是否有效：`const session = await supabaseService.getSession()`
3. 确保 RLS 策略正确配置

### 权限错误 (403)

**问题：** 收到 403 Forbidden 错误

**解决方案：**
1. 检查数据库的 Row Level Security (RLS) 策略
2. 确保用户有权限访问该表
3. 查看 Supabase 控制台的 RLS 日志

### 表不存在错误

**问题：** 收到"表不存在"错误

**解决方案：**
1. 确认表名拼写正确
2. 检查数据库迁移是否已应用
3. 确认 schema 为 `public`（默认）

## 更新日志

### v2.0.0 (2025-01-xx)

- 使用 Supabase 官方客户端库替换直接 REST API 调用
- 添加 `supabaseService` 便利方法
- 自动 Token 刷新和会话管理
- 改进的错误处理

## 参考链接

- [Supabase JavaScript 文档](https://supabase.com/docs/reference/javascript)
- [项目 Architecture 文档](../CLAUDE.md)
- [隐私和认证修复指南](./PRIVACY_AUTH_FIX.md)
