/**
 * 协同过滤推荐算法服务
 * 实现基于用户和基于物品的协同过滤算法
 */

const ratingMatrixService = require('./rating-matrix.service.js');
const similarityUtils = require('../../utils/similarity.utils.js');
const requestUtil = require('../../utils/request.js');

class CollaborativeFilteringService {
  constructor() {
    this.ratingService = ratingMatrixService;
    this.similarity = similarityUtils;
    this.requestUtil = requestUtil;

    // 推荐算法配置
    this.config = {
      maxSimilarUsers: 20, // 最大相似用户数
      maxSimilarItems: 20, // 最大相似物品数
      minSimilarity: 0.1, // 最小相似度阈值
      minCommonItems: 2, // 最少共同项目数
      recommendationCount: 10, // 推荐结果数量
      diversityWeight: 0.2, // 多样性权重
      noveltyWeight: 0.1, // 新颖性权重
      popularityWeight: 0.3, // 热门度权重
    };

    this.recommendationCache = new Map();
    this.CACHE_DURATION = 20 * 60 * 1000; // 20分钟缓存
  }

  /**
   * 获取个性化推荐
   * @param {string} userId - 用户ID
   * @param {Object} options - 推荐选项
   * @returns {Promise<Object>} 推荐结果
   */
  async getPersonalizedRecommendations(userId, options = {}) {
    const {
      algorithm = 'hybrid', // 'user-based', 'item-based', 'hybrid'
      count = this.config.recommendationCount,
      excludeKnown = true, // 排除已知物品
      includeReasons = true, // 包含推荐理由
      categoryFilter = null, // 分类过滤
      diversity = true, // 启用多样性
    } = options;

    try {
      const cacheKey = `recommendations_${userId}_${algorithm}_${count}_${categoryFilter || 'all'}`;

      // 检查缓存
      if (this.recommendationCache.has(cacheKey)) {
        const cached = this.recommendationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
          return cached.data;
        }
      }

      console.log(`开始生成推荐 [算法: ${algorithm}, 用户: ${userId}]`);

      // 获取评分矩阵
      const { matrix, userRatings, podcasts } =
        await this.ratingService.buildRatingMatrix(userId);

      let recommendations = [];

      switch (algorithm) {
        case 'user-based':
          recommendations = await this.userBasedRecommendation(
            matrix,
            userRatings,
            userId,
            count
          );
          break;
        case 'item-based':
          recommendations = await this.itemBasedRecommendation(
            matrix,
            userRatings,
            userId,
            count
          );
          break;
        case 'hybrid':
        default:
          recommendations = await this.hybridRecommendation(
            matrix,
            userRatings,
            userId,
            count
          );
          break;
      }

      // 后处理
      if (excludeKnown) {
        recommendations = this.excludeKnownItems(recommendations, userRatings);
      }

      if (categoryFilter) {
        recommendations = this.filterByCategory(
          recommendations,
          podcasts,
          categoryFilter
        );
      }

      if (diversity) {
        recommendations = this.applyDiversity(recommendations);
      }

      // 获取完整的播客信息
      const enrichedRecommendations = await this.enrichRecommendations(
        recommendations.slice(0, count),
        podcasts,
        includeReasons
      );

      const result = {
        success: true,
        data: enrichedRecommendations,
        metadata: {
          algorithm,
          count: enrichedRecommendations.length,
          timestamp: new Date().toISOString(),
          userId,
        },
      };

      // 缓存结果
      this.recommendationCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error('生成推荐失败:', error);
      return {
        success: false,
        error: error.message,
        data: this.getFallbackRecommendations(), // 返回默认推荐
      };
    }
  }

  /**
   * 基于用户的协同过滤推荐
   */
  async userBasedRecommendation(matrix, userRatings, userId, count) {
    console.log('使用基于用户的协同过滤算法...');

    // 1. 计算用户相似度
    const similarities = this.similarity.calculateUserSimilarities(
      matrix,
      userId,
      'cosine'
    );
    const topSimilarUsers = this.similarity
      .filterSimilarities(
        similarities,
        this.config.minSimilarity,
        this.config.minCommonItems
      )
      .slice(0, this.config.maxSimilarUsers);

    console.log(`找到 ${topSimilarUsers.length} 个相似用户`);

    if (topSimilarUsers.length === 0) {
      return this.getPopularItems(count);
    }

    // 2. 生成推荐
    const recommendations = new Map();

    topSimilarUsers.forEach(({ userId: similarUserId, similarity }) => {
      const similarUserRatings = matrix.get(similarUserId);

      similarUserRatings.forEach((rating, itemId) => {
        // 跳过目标用户已经评分过的物品
        if (userRatings.has(itemId)) return;

        // 计算预测评分
        const predictedRating = similarity * rating;

        if (recommendations.has(itemId)) {
          recommendations.get(itemId).score += predictedRating;
          recommendations.get(itemId).similaritySum += similarity;
          recommendations
            .get(itemId)
            .reasons.push(`相似用户喜欢 (相似度: ${similarity.toFixed(3)})`);
        } else {
          recommendations.set(itemId, {
            itemId,
            score: predictedRating,
            similaritySum: similarity,
            reasons: [`相似用户喜欢 (相似度: ${similarity.toFixed(3)})`],
            algorithm: 'user-based',
          });
        }
      });
    });

    // 3. 归一化评分
    const finalRecommendations = [];
    recommendations.forEach(rec => {
      rec.predictedRating = rec.score / rec.similaritySum;
      finalRecommendations.push(rec);
    });

    return finalRecommendations.sort(
      (a, b) => b.predictedRating - a.predictedRating
    );
  }

  /**
   * 基于物品的协同过滤推荐
   */
  async itemBasedRecommendation(matrix, userRatings, userId, count) {
    console.log('使用基于物品的协同过滤算法...');

    if (userRatings.size === 0) {
      return this.getPopularItems(count);
    }

    const recommendations = new Map();

    // 1. 对用户已评分的每个物品，找到相似的物品
    for (const [itemId, userRating] of userRatings) {
      const itemSimilarities = this.similarity.calculateItemSimilarities(
        matrix,
        itemId
      );
      const topSimilarItems = this.similarity
        .filterSimilarities(
          itemSimilarities,
          this.config.minSimilarity,
          this.config.minCommonItems
        )
        .slice(0, this.config.maxSimilarItems);

      // 2. 基于相似度预测评分
      topSimilarItems.forEach(({ itemId: similarItemId, similarity }) => {
        // 跳过用户已经评分过的物品
        if (userRatings.has(similarItemId)) return;

        const predictedRating = similarity * userRating;

        if (recommendations.has(similarItemId)) {
          recommendations.get(similarItemId).score += predictedRating;
          recommendations.get(similarItemId).similaritySum += similarity;
          recommendations
            .get(similarItemId)
            .reasons.push(`因为你喜欢《${this.getItemTitle(itemId)}》`);
        } else {
          recommendations.set(similarItemId, {
            itemId: similarItemId,
            score: predictedRating,
            similaritySum: similarity,
            reasons: [`因为你喜欢《${this.getItemTitle(itemId)}》`],
            algorithm: 'item-based',
          });
        }
      });
    }

    // 3. 归一化评分
    const finalRecommendations = [];
    recommendations.forEach(rec => {
      rec.predictedRating = rec.score / rec.similaritySum;
      finalRecommendations.push(rec);
    });

    return finalRecommendations.sort(
      (a, b) => b.predictedRating - a.predictedRating
    );
  }

  /**
   * 混合推荐 (结合多种算法)
   */
  async hybridRecommendation(matrix, userRatings, userId, count) {
    console.log('使用混合推荐算法...');

    // 并行执行基于用户和基于物品的推荐
    const [userBasedRecs, itemBasedRecs] = await Promise.all([
      this.userBasedRecommendation(matrix, userRatings, userId, count * 2),
      this.itemBasedRecommendation(matrix, userRatings, userId, count * 2),
    ]);

    // 合并推荐结果
    const combinedRecommendations = new Map();

    // 添加基于用户的推荐
    userBasedRecs.forEach(rec => {
      combinedRecommendations.set(rec.itemId, {
        ...rec,
        hybridScore: rec.predictedRating * 0.6, // 基于用户的权重
        sources: ['user-based'],
      });
    });

    // 添加基于物品的推荐
    itemBasedRecs.forEach(rec => {
      if (combinedRecommendations.has(rec.itemId)) {
        // 如果已存在，合并分数和来源
        const existing = combinedRecommendations.get(rec.itemId);
        existing.hybridScore += rec.predictedRating * 0.6;
        existing.sources.push('item-based');
      } else {
        combinedRecommendations.set(rec.itemId, {
          ...rec,
          hybridScore: rec.predictedRating * 0.6,
          sources: ['item-based'],
        });
      }
    });

    // 转换为数组并排序
    const finalRecommendations = Array.from(combinedRecommendations.values());
    finalRecommendations.forEach(rec => {
      rec.predictedRating = rec.hybridScore;
      rec.algorithm = 'hybrid';
      rec.reasons = [`基于${rec.sources.join(' + ')}推荐`];
    });

    return finalRecommendations.sort(
      (a, b) => b.predictedRating - a.predictedRating
    );
  }

  /**
   * 排除已知物品
   */
  excludeKnownItems(recommendations, userRatings) {
    return recommendations.filter(rec => !userRatings.has(rec.itemId));
  }

  /**
   * 按分类过滤
   */
  filterByCategory(recommendations, podcasts, categoryFilter) {
    const categoryMap = new Map(podcasts.map(p => [p.id, p.category]));

    return recommendations.filter(rec => {
      const podcastCategory = categoryMap.get(rec.itemId);
      return podcastCategory && podcastCategory.includes(categoryFilter);
    });
  }

  /**
   * 应用多样性优化
   */
  applyDiversity(recommendations) {
    if (recommendations.length <= 1) return recommendations;

    const diverseRecommendations = [recommendations[0]];
    const usedCategories = new Set();

    // 添加第一个推荐物品的类别
    if (recommendations[0].category) {
      usedCategories.add(recommendations[0].category);
    }

    // 选择多样化的物品
    for (
      let i = 1;
      i < recommendations.length &&
      diverseRecommendations.length < recommendations.length;
      i++
    ) {
      const rec = recommendations[i];

      // 如果类别未使用过，或者随机选择以引入一些随机性
      if (!usedCategories.has(rec.category) || Math.random() < 0.3) {
        diverseRecommendations.push(rec);
        if (rec.category) {
          usedCategories.add(rec.category);
        }
      }
    }

    // 如果多样性选择后数量不足，补充剩余物品
    if (diverseRecommendations.length < recommendations.length) {
      const remaining = recommendations.filter(
        rec => !diverseRecommendations.includes(rec)
      );
      diverseRecommendations.push(
        ...remaining.slice(
          0,
          recommendations.length - diverseRecommendations.length
        )
      );
    }

    return diverseRecommendations;
  }

  /**
   * 丰富推荐结果
   */
  async enrichRecommendations(
    recommendations,
    podcasts,
    includeReasons = true
  ) {
    const podcastMap = new Map(podcasts.map(p => [p.id, p]));

    const enrichedRecs = [];

    for (const rec of recommendations) {
      const podcast = podcastMap.get(rec.itemId);
      if (!podcast) continue;

      const enrichedRec = {
        ...podcast,
        predictedRating: rec.predictedRating,
        algorithm: rec.algorithm,
        score: rec.predictedRating,
      };

      if (includeReasons) {
        enrichedRec.recommendationReason = rec.reasons[0] || '基于你的兴趣推荐';
      }

      enrichedRecs.push(enrichedRec);
    }

    return enrichedRecs;
  }

  /**
   * 获取热门物品 (用于冷启动或备用)
   */
  async getPopularItems(count = 10) {
    try {
      // 直接从数据库查询热门播客，避免循环依赖
      const podcasts = await this.requestUtil.get('/rest/v1/podcasts', {
        select:
          'id,title,description,cover_url,audio_url,duration,play_count,like_count,favorite_count',
        order: 'play_count.desc,created_at.desc',
        limit: count,
      });

      if (!podcasts || podcasts.length === 0) {
        console.warn('没有找到热门播客数据');
        return [];
      }

      // 转换为推荐算法格式
      return podcasts.map(item => ({
        ...item,
        itemId: item.id, // 添加itemId字段以保持一致性
        predictedRating: (item.play_count || 0) * 0.01, // 简化的热门度评分
        algorithm: 'popular',
        reasons: ['热门推荐'],
        score: (item.play_count || 0) * 0.01,
      }));
    } catch (error) {
      console.error('获取热门物品失败:', error);
      return [];
    }
  }

  /**
   * 获取备用推荐 (当算法失败时使用)
   */
  getFallbackRecommendations() {
    return {
      success: true,
      data: [],
      metadata: {
        algorithm: 'fallback',
        message: '暂无个性化推荐，试试浏览热门内容吧',
      },
    };
  }

  /**
   * 获取物品标题 (简化实现)
   */
  getItemTitle(itemId) {
    return '相关播客';
  }

  /**
   * 清理推荐缓存
   */
  clearCache() {
    this.recommendationCache.clear();
    this.ratingService.clearCache();
    this.similarity.clearCache();
  }

  /**
   * 获取推荐系统统计信息
   */
  async getRecommendationStats(userId) {
    try {
      const { statistics } = await this.ratingService.buildRatingMatrix(userId);
      const behaviorStats =
        await this.ratingService.getUserBehaviorStats(userId);

      return {
        matrixStats: statistics,
        userBehaviorStats: behaviorStats,
        cacheStats: {
          recommendationCache: this.recommendationCache.size,
          similarityCache: this.similarity.getCacheStats(),
        },
      };
    } catch (error) {
      console.error('获取推荐统计失败:', error);
      return null;
    }
  }
}

// 创建单例实例
const collaborativeFilteringService = new CollaborativeFilteringService();

module.exports = collaborativeFilteringService;
