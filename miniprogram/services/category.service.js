/**
 * 分类页面服务层
 * 处理排行榜数据、学术分类、精选推荐等业务逻辑
 * 使用 Supabase 客户端库而不是 REST API
 */

const supabaseService = require('./supabase.service.js');
const iOSGradientDesign = require('../config/ios-gradient-design.js');
console.log("supabaseClient: ", supabaseService)
class CategoryService {
  constructor() {
    // 获取iOS风格渐变配色方案
    const gradients = iOSGradientDesign.getAcademicCategoryGradients();

    // 学术分类配置 - 使用iOS风格渐变色
    this.academicCategories = [
      {
        id: 'cs_ai',
        name: 'CS.AI',
        displayName: '人工智能',
        color: [gradients[0].start, gradients[0].end], // 淡蓝色渐变
        icon: 'auto-height',
      },
      {
        id: 'cs_cl',
        name: 'CS.CL',
        displayName: '计算语言学',
        color: [gradients[1].start, gradients[1].end], // 青色渐变
        icon: 'translate',
      },
      {
        id: 'cs_cv',
        name: 'CS.CV',
        displayName: '计算机视觉',
        color: [gradients[2].start, gradients[2].end], // 单青色渐变
        icon: 'camera',
      },
      {
        id: 'cs_lg',
        name: 'CS.LG',
        displayName: '机器学习',
        color: [gradients[3].start, gradients[3].end], // 天空蓝渐变
        icon: 'chart-line',
      },
      {
        id: 'cs_ne',
        name: 'CS.NE',
        displayName: '神经与演化',
        color: [gradients[4].start, gradients[4].end], // 冰蓝渐变
        icon: 'dns',
      },
      {
        id: 'cs_ro',
        name: 'CS.RO',
        displayName: '机器人学',
        color: [gradients[5].start, gradients[5].end], // 柔和绿色
        icon: 'control-platform',
      },
      {
        id: 'stat_ml',
        name: 'STAT.ML',
        displayName: '统计机器学习',
        color: [gradients[6].start, gradients[6].end], // 珍珠白
        icon: 'chart-pie',
      },
    ];

    // 缓存配置
    this.cache = {
      rankings: new Map(),
      featured: new Map(),
      cacheTimeout: 5 * 60 * 1000, // 5分钟缓存
    };
  }

  /**
   * 获取排行榜数据（智能缓存）
   * @param {string} type - 排行榜类型: 'hot', 'new', 'review'
   * @param {number} limit - 返回数量限制
   * @returns {Promise<Object>} 排行榜数据
   */
  async getRankings(type = 'hot', limit = 10) {
    const cacheKey = `${type}_${limit}`;

    // 检查缓存
    const cached = this.getCachedData('rankings', cacheKey);
    if (cached) {
      console.log(`使用缓存的${type}排行榜数据`);
      return { success: true, data: cached, fromCache: true };
    }

    try {
      let orderBy = '';
      let description = '';

      switch (type) {
        case 'hot':
          orderBy = 'play_count.desc';
          description = '最热榜 - 按播放量排序';
          break;
        case 'new':
          orderBy = 'created_at.desc';
          description = '最新榜 - 按发布时间排序';
          break;
        case 'review':
          orderBy = 'favorite_count.desc';
          description = '综述榜 - 按收藏和点赞排序';
          break;
        default:
          throw new Error(`未知的排行榜类型: ${type}`);
      }

      console.log(`加载${description}`);

      // 使用 Supabase 客户端库查询
      const result = await supabaseService.select('podcasts', {
        columns: 'id,title,description,cover_url,duration,play_count,like_count,favorite_count,created_at,channels(id,name)',
        filters: { status: 'published' },
        order: orderBy,
        limit: limit
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // 数据处理和排序优化
      const processedData = await this.processRankingData(result.data || [], type);

      // 缓存数据
      this.setCachedData('rankings', cacheKey, processedData);

      return {
        success: true,
        data: processedData,
        fromCache: false,
        type: type,
        description: description,
      };
    } catch (error) {
      console.error(`获取${type}排行榜失败:`, error);
      return {
        success: false,
        error: error.message,
        type: type,
      };
    }
  }

  /**
   * 批量获取所有排行榜（并行加载）
   * @param {number} limit - 每个榜单的数量限制
   * @returns {Promise<Object>} 所有排行榜数据
   */
  async getAllRankings(limit = 10) {
    try {
      console.log('并行加载所有排行榜数据...');

      const [hotResult, newResult, reviewResult] = await Promise.all([
        this.getRankings('hot', limit),
        this.getRankings('new', limit),
        this.getRankings('review', limit),
      ]);

      return {
        success: true,
        data: {
          hot: hotResult.success ? hotResult.data : [],
          new: newResult.success ? newResult.data : [],
          review: reviewResult.success ? reviewResult.data : [],
        },
        errors: {
          hot: hotResult.success ? null : hotResult.error,
          new: newResult.success ? null : newResult.error,
          review: reviewResult.success ? null : reviewResult.error,
        },
      };
    } catch (error) {
      console.error('批量获取排行榜失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 获取精选推荐内容
   * @param {number} limit - 返回数量限制
   * @returns {Promise<Object>} 精选推荐数据
   */
  async getFeaturedContent(limit = 6) {
    const cacheKey = `featured_${limit}`;

    // 检查缓存
    const cached = this.getCachedData('featured', cacheKey);
    if (cached) {
      console.log('使用缓存的精选推荐数据');
      return { success: true, data: cached, fromCache: true };
    }

    try {
      console.log('加载精选推荐内容...');

      // 使用 Supabase 客户端库查询编辑推荐
      const result = await supabaseService.select('editorial_recommendations', {
        columns: 'id,recommendation_text,podcasts(id,title,description,cover_url,duration,channels(name))',
        order: 'created_at.desc',
        limit: limit
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      if (!Array.isArray(result.data)) {
        throw new Error('查询结果不是数组');
      }

      const processedData = result.data.map(item => ({
        id: item.id,
        recommendationText: item.recommendation_text,
        podcast: item.podcasts,
        type: 'editorial',
      }));

      // 缓存数据
      this.setCachedData('featured', cacheKey, processedData);

      return {
        success: true,
        data: processedData,
        fromCache: false,
      };
    } catch (error) {
      console.error('获取精选推荐失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 获取学术分类配置
   * @returns {Array} 分类配置数组
   */
  getAcademicCategories() {
    return this.academicCategories;
  }

  /**
   * 根据分类ID获取播客
   * @param {string} categoryId - 分类ID
   * @param {Object} options - 选项对象
   * @param {number} options.page - 页码（默认1）
   * @param {number} options.limit - 每页数量限制（默认20）
   * @param {string} options.sortBy - 排序字段（默认created_at）
   * @returns {Promise<Object>} 分类播客数据
   */
  async getPodcastsByCategory(categoryId, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at' } = options;

      const category = this.academicCategories.find(
        cat => cat.id === categoryId
      );
      if (!category) {
        throw new Error(`未找到分类: ${categoryId}`);
      }

      console.log(
        `加载${category.displayName}分类的播客（第${page}页，排序: ${sortBy}）...`
      );

      // 构建排序参数
      let orderBy = '';
      switch (sortBy) {
        case 'play_count':
          orderBy = 'play_count.desc';
          break;
        case 'favorite_count':
          orderBy = 'favorite_count.desc';
          break;
        case 'created_at':
        default:
          orderBy = 'created_at.desc';
          break;
      }

      // 计算偏移量
      const offset = (page - 1) * limit;

      // 使用 Supabase 客户端库查询
      // 根据分类 name (如 'CS.AI') 過滤 podcasts.categories 数组字段
      const result = await supabaseService.select('podcasts', {
        columns: 'id,title,description,cover_url,duration,play_count,favorite_count,created_at,channels(id,name)',
        filters: {
          status: 'published',
          categories: { operator: 'contains', val: [category.name] }
        },
        order: orderBy,
        offset: offset,
        limit: limit
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        data: result.data,
        category: category,
        pagination: {
          page,
          limit,
          total: result.data.length,
        },
      };
    } catch (error) {
      console.error(`获取分类播客失败:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 处理排行榜数据（排序优化、特殊调整）
   * @private
   */
  async processRankingData(data, type) {
    let processed = [...data];

    // 特殊调整逻辑（保持与原有逻辑兼容）
    if (type === 'hot' || type === 'new') {
      processed = this.adjustSpecialRankings(processed, type);
    }

    // 添加排名信息
    processed = processed.map((item, index) => ({
      ...item,
      rank: index + 1,
      rankChange: this.calculateRankChange(item, type), // 可以后续实现趋势分析
    }));

    return processed;
  }

  /**
   * 特殊排名调整（保持与原代码兼容）
   * @private
   */
  adjustSpecialRankings(data, type) {
    // 特定播客的特殊处理逻辑（从原代码中迁移）
    // todo： what is this
    // const specialIds = {
    //   qiji910: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
    //   attention: '172b5cf1-58c3-4a53-852e-6d222e890882',
    // };

    // 可以在这里实现特殊的排序逻辑
    return data;
  }

  /**
   * 计算排名变化趋势
   * @private
   */
  calculateRankChange(item, type) {
    // TODO: 实现排名趋势分析
    return { change: 0, trend: 'stable' };
  }

  /**
   * 缓存管理 - 获取缓存数据
   * @private
   */
  getCachedData(type, key) {
    const cache = this.cache[type];
    const item = cache.get(key);

    if (item && Date.now() - item.timestamp < this.cache.cacheTimeout) {
      return item.data;
    }

    cache.delete(key);
    return null;
  }

  /**
   * 缓存管理 - 设置缓存数据
   * @private
   */
  setCachedData(type, key, data) {
    const cache = this.cache[type];
    cache.set(key, {
      data: data,
      timestamp: Date.now(),
    });

    // 清理过期缓存
    this.cleanExpiredCache(type);
  }

  /**
   * 清理过期缓存
   * @private
   */
  cleanExpiredCache(type) {
    const cache = this.cache[type];
    const now = Date.now();

    for (const [key, item] of cache.entries()) {
      if (now - item.timestamp >= this.cache.cacheTimeout) {
        cache.delete(key);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  clearCache() {
    this.cache.rankings.clear();
    this.cache.featured.clear();
    console.log('分类服务缓存已清空');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      rankings: this.cache.rankings.size,
      featured: this.cache.featured.size,
      timeout: this.cache.cacheTimeout,
    };
  }
}

// 创建单例实例
const categoryService = new CategoryService();

module.exports = categoryService;
