# Category Service 快速参考

## 快速对比

### 旧方式 (REST API)
```javascript
const result = await requestUtil.get('/rest/v1/podcasts', {
  select: 'id,title,description',
  status: 'eq.published',
  order: 'play_count.desc,created_at.desc',
  limit: 10
});

console.log(result[0]); // 直接数组
```

### 新方式 (Supabase 客户端库)
```javascript
const result = await supabaseService.select('podcasts', {
  columns: 'id,title,description',
  filters: { status: 'published' },
  order: 'play_count.desc',
  limit: 10
});

if (result.success) {
  console.log(result.data[0]); // 需要 .data
} else {
  console.error(result.error);
}
```

## 核心改动

### 1. 导入模块
```javascript
// ❌ 旧方式
const requestUtil = require('../utils/request.js');

// ✅ 新方式
const supabaseService = require('./supabase.service.js');
```

### 2. 参数映射速查表

| 参数 | REST API | 客户端库 |
|------|------|------|
| 选择列 | `select: '...'` | `columns: '...'` |
| 等于过滤 | `status: 'eq.value'` | `filters: { status: 'value' }` |
| 排序 | `order: 'field.desc'` | `order: 'field.desc'` |
| 限制 | `limit: 10` | `limit: 10` |
| 偏移 | `offset: 20` | `offset: 20` |

### 3. 响应处理

#### 成功情况
```javascript
// 旧
const result = [{ id: '...', title: '...' }];

// 新
const result = {
  success: true,
  data: [{ id: '...', title: '...' }]
};
```

#### 失败情况
```javascript
// 旧
try {
  const result = await requestUtil.get(...);
} catch (error) {
  console.error(error);
}

// 新
const result = await supabaseService.select(...);
if (!result.success) {
  console.error(result.error);
}
```

## Category Service API

### getRankings(type, limit = 10)
获取排行榜数据（已更新为使用 supabaseService）

```javascript
// 获取最热排行榜
const result = await categoryService.getRankings('hot', 10);

// 获取最新排行榜
const result = await categoryService.getRankings('new', 10);

// 获取综述排行榜
const result = await categoryService.getRankings('review', 10);

if (result.success) {
  console.log('排行榜数据:', result.data);
}
```

### getFeaturedContent(limit = 6)
获取精选推荐（已更新为使用 supabaseService）

```javascript
const result = await categoryService.getFeaturedContent(6);

if (result.success) {
  console.log('精选推荐:', result.data);
}
```

### getPodcastsByCategory(categoryId, options)
获取指定分类的播客列表（已更新为使用 supabaseService）

```javascript
const result = await categoryService.getPodcastsByCategory('cs_ai', {
  page: 1,
  limit: 20,
  sortBy: 'created_at' // 'created_at' | 'play_count' | 'favorite_count'
});

if (result.success) {
  console.log('播客列表:', result.data);
  console.log('分页信息:', result.pagination);
}
```

### getAcademicCategories()
获取学术分类列表（保持不变）

```javascript
const categories = categoryService.getAcademicCategories();
// 返回学术分类配置数组
```

## 迁移清单

如果你正在迁移其他文件使用 category.service.js，检查以下几点：

- [ ] category.service.js 已迁移至 supabaseService（已完成）
- [ ] 导入模块已更新（如需）
- [ ] 调用方法名保持不变（兼容）
- [ ] 响应格式已转换（success/data/error）
- [ ] 错误处理已更新（.success 检查）

## 常见用法

### 在页面中使用
```javascript
// category.js
const categoryService = require('../../services/category.service.js');

Page({
  async onLoad() {
    // 获取排行榜
    const rankings = await categoryService.getAllRankings(10);
    if (rankings.success) {
      this.setData({
        hotRankings: rankings.data.hot,
        newRankings: rankings.data.new,
        reviewRankings: rankings.data.review
      });
    }
  }
});
```

### 获取分类列表
```javascript
const categories = categoryService.getAcademicCategories();
this.setData({ categories });
```

### 处理分类详情页
```javascript
async onLoad(options) {
  const categoryId = options.categoryId;
  const result = await categoryService.getPodcastsByCategory(categoryId, {
    page: 1,
    limit: 20,
    sortBy: 'created_at'
  });
  
  if (result.success) {
    this.setData({
      categoryName: result.category.displayName,
      podcasts: result.data,
      pagination: result.pagination
    });
  }
}
```

## 数据结构

### Podcast 对象
```javascript
{
  id: string,                    // UUID
  title: string,                 // 标题
  description: string | null,    // 描述
  cover_url: string | null,      // 封面 URL
  duration: number | null,       // 时长（秒）
  play_count: number | null,     // 播放次数
  like_count: number | null,     // 点赞数
  favorite_count: number | null, // 收藏数
  created_at: string | null,     // 创建时间
  channels: {
    id: string,
    name: string
  }
}
```

### Editorial Recommendation 对象
```javascript
{
  id: string,                       // UUID
  recommendation_text: string,      // 推荐文案
  podcast: Podcast,                 // 关联播客
  type: 'editorial'                 // 推荐类型
}
```

### 排行榜项对象
```javascript
{
  // 所有 Podcast 字段，加上：
  rank: number,                 // 排名
  rankChange: {                 // 排名变化
    change: number,
    trend: 'stable' | 'up' | 'down'
  }
}
```

## 性能优化

### 缓存策略（5分钟）
```javascript
// 自动缓存，无需手动操作
const result = await categoryService.getRankings('hot', 10);
// → 查询数据库

const result2 = await categoryService.getRankings('hot', 10);
// → 返回缓存（如果在5分钟内）
```

### 清除缓存
```javascript
categoryService.clearCache();
```

### 查看缓存统计
```javascript
const stats = categoryService.getCacheStats();
console.log(stats);
// { rankings: 2, featured: 1, timeout: 300000 }
```

## 故障排除

### 查询返回空数组
```javascript
const result = await categoryService.getPodcastsByCategory('cs_ai');

if (!result.success) {
  console.error('查询失败:', result.error);
} else if (result.data.length === 0) {
  console.warn('该分类暂无播客');
} else {
  // 正常处理数据
}
```

### 获取错误信息
```javascript
const result = await categoryService.getRankings('hot');

if (!result.success) {
  // 错误信息在 result.error 中
  wx.showToast({
    title: result.error,
    icon: 'none'
  });
}
```

### 检查响应格式
```javascript
console.log(result);
// 总是包含 success 字段
// {
//   success: true,
//   data: [...],
//   fromCache?: true,
//   type?: 'hot' | 'new' | 'review',
//   description?: string
// }
```

## 相关文档

- **详细迁移指南**: [CATEGORY_SERVICE_MIGRATION.md](./CATEGORY_SERVICE_MIGRATION.md)
- **Supabase 客户端 API**: [SUPABASE_SERVICE_MIGRATION.md](./SUPABASE_SERVICE_MIGRATION.md)
- **迁移总结**: [SUPABASE_CLIENT_MIGRATION_SUMMARY.md](./SUPABASE_CLIENT_MIGRATION_SUMMARY.md)
- **全局文档**: [../CLAUDE.md](../CLAUDE.md)

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 2.0 | 2025-12-01 | 迁移至 Supabase 客户端库 |
| 1.0 | 2025-08-01 | 初始版本（使用 REST API） |
