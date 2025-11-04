/**
 * 相似度计算工具模块
 * 提供多种相似度计算方法用于协同过滤算法
 */

class SimilarityUtils {
  constructor() {
    this.similarityCache = new Map();
    this.CACHE_SIZE = 1000;
    this.CACHE_DURATION = 15 * 60 * 1000; // 15分钟缓存
  }

  /**
   * 计算两个用户之间的余弦相似度
   * @param {Map} user1Ratings - 用户1的评分向量
   * @param {Map} user2Ratings - 用户2的评分向量
   * @returns {number} 相似度 (-1 到 1)
   */
  cosineSimilarity(user1Ratings, user2Ratings) {
    if (
      !user1Ratings ||
      !user2Ratings ||
      user1Ratings.size === 0 ||
      user2Ratings.size === 0
    ) {
      return 0;
    }

    // 找到共同评分的物品
    const commonItems = this.getCommonItems(user1Ratings, user2Ratings);
    if (commonItems.length === 0) {
      return 0;
    }

    // 计算点积和模长
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    commonItems.forEach(itemId => {
      const rating1 = user1Ratings.get(itemId);
      const rating2 = user2Ratings.get(itemId);

      dotProduct += rating1 * rating2;
      norm1 += rating1 * rating1;
      norm2 += rating2 * rating2;
    });

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * 计算皮尔逊相关系数
   * @param {Map} user1Ratings - 用户1的评分向量
   * @param {Map} user2Ratings - 用户2的评分向量
   * @returns {number} 相关系数 (-1 到 1)
   */
  pearsonCorrelation(user1Ratings, user2Ratings) {
    if (
      !user1Ratings ||
      !user2Ratings ||
      user1Ratings.size === 0 ||
      user2Ratings.size === 0
    ) {
      return 0;
    }

    const commonItems = this.getCommonItems(user1Ratings, user2Ratings);
    if (commonItems.length < 2) {
      return 0;
    }

    // 计算平均值
    let sum1 = 0,
      sum2 = 0;
    commonItems.forEach(itemId => {
      sum1 += user1Ratings.get(itemId);
      sum2 += user2Ratings.get(itemId);
    });

    const mean1 = sum1 / commonItems.length;
    const mean2 = sum2 / commonItems.length;

    // 计算分子和分母
    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    commonItems.forEach(itemId => {
      const rating1 = user1Ratings.get(itemId) - mean1;
      const rating2 = user2Ratings.get(itemId) - mean2;

      numerator += rating1 * rating2;
      denominator1 += rating1 * rating1;
      denominator2 += rating2 * rating2;
    });

    if (denominator1 === 0 || denominator2 === 0) {
      return 0;
    }

    return numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2));
  }

  /**
   * 调整余弦相似度 (考虑用户评分偏差)
   * @param {Map} user1Ratings - 用户1的评分向量
   * @param {Map} user2Ratings - 用户2的评分向量
   * @param {Map} itemRatings - 物品评分矩阵 (用于计算物品平均评分)
   * @returns {number} 相似度
   */
  adjustedCosineSimilarity(user1Ratings, user2Ratings, itemRatings) {
    if (
      !user1Ratings ||
      !user2Ratings ||
      !itemRatings ||
      user1Ratings.size === 0 ||
      user2Ratings.size === 0
    ) {
      return 0;
    }

    const commonItems = this.getCommonItems(user1Ratings, user2Ratings);
    if (commonItems.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    commonItems.forEach(itemId => {
      const rating1 = user1Ratings.get(itemId);
      const rating2 = user2Ratings.get(itemId);
      const itemAvg = this.getItemAverageRating(itemRatings, itemId);

      const adjustedRating1 = rating1 - itemAvg;
      const adjustedRating2 = rating2 - itemAvg;

      dotProduct += adjustedRating1 * adjustedRating2;
      norm1 += adjustedRating1 * adjustedRating1;
      norm2 += adjustedRating2 * adjustedRating2;
    });

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * 计算物品之间的相似度
   * @param {Map} item1Ratings - 物品1的评分向量 (用户-评分)
   * @param {Map} item2Ratings - 物品2的评分向量 (用户-评分)
   * @returns {number} 相似度
   */
  itemSimilarity(item1Ratings, item2Ratings) {
    if (
      !item1Ratings ||
      !item2Ratings ||
      item1Ratings.size === 0 ||
      item2Ratings.size === 0
    ) {
      return 0;
    }

    // 转换为物品评分向量格式
    const ratings1 = new Map();
    const ratings2 = new Map();

    // 找到共同用户
    const commonUsers = [];
    item1Ratings.forEach((rating, userId) => {
      if (item2Ratings.has(userId)) {
        commonUsers.push(userId);
        ratings1.set(userId, rating);
        ratings2.set(userId, item2Ratings.get(userId));
      }
    });

    if (commonUsers.length === 0) {
      return 0;
    }

    return this.cosineSimilarity(ratings1, ratings2);
  }

  /**
   * 计算用户与其他所有用户的相似度
   * @param {Map} ratingMatrix - 评分矩阵
   * @param {string} targetUserId - 目标用户ID
   * @param {string} method - 相似度方法 ('cosine', 'pearson', 'adjusted')
   * @returns {Array} 相似度列表 [{userId, similarity}]
   */
  calculateUserSimilarities(ratingMatrix, targetUserId, method = 'cosine') {
    const targetRatings = ratingMatrix.get(targetUserId);
    if (!targetRatings || targetRatings.size === 0) {
      return [];
    }

    const similarities = [];

    ratingMatrix.forEach((userRatings, userId) => {
      if (userId === targetUserId) return;

      let similarity = 0;
      switch (method) {
        case 'cosine':
          similarity = this.cosineSimilarity(targetRatings, userRatings);
          break;
        case 'pearson':
          similarity = this.pearsonCorrelation(targetRatings, userRatings);
          break;
        case 'adjusted':
          // 需要额外的物品平均评分数据
          similarity = this.cosineSimilarity(targetRatings, userRatings); // 简化处理
          break;
        default:
          similarity = this.cosineSimilarity(targetRatings, userRatings);
      }

      if (similarity > 0) {
        similarities.push({
          userId,
          similarity,
          commonItems: this.getCommonItems(targetRatings, userRatings).length,
        });
      }
    });

    // 按相似度排序
    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 计算物品与其他所有物品的相似度
   * @param {Map} ratingMatrix - 评分矩阵
   * @param {string} targetItemId - 目标物品ID
   * @returns {Array} 相似度列表 [{itemId, similarity}]
   */
  calculateItemSimilarities(ratingMatrix, targetItemId) {
    const itemRatings = this.transformToItemMatrix(ratingMatrix);
    const targetItemRating = itemRatings.get(targetItemId);

    if (!targetItemRating || targetItemRating.size === 0) {
      return [];
    }

    const similarities = [];

    itemRatings.forEach((itemRating, itemId) => {
      if (itemId === targetItemId) return;

      const similarity = this.itemSimilarity(targetItemRating, itemRating);

      if (similarity > 0) {
        similarities.push({
          itemId,
          similarity,
          commonUsers: this.getCommonItems(targetItemRating, itemRating).length,
        });
      }
    });

    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 转换评分矩阵为物品-用户矩阵
   * @param {Map} userItemMatrix - 用户-物品评分矩阵
   * @returns {Map} 物品-用户评分矩阵
   */
  transformToItemMatrix(userItemMatrix) {
    const itemUserMatrix = new Map();

    userItemMatrix.forEach((itemRatings, userId) => {
      itemRatings.forEach((rating, itemId) => {
        if (!itemUserMatrix.has(itemId)) {
          itemUserMatrix.set(itemId, new Map());
        }
        itemUserMatrix.get(itemId).set(userId, rating);
      });
    });

    return itemUserMatrix;
  }

  /**
   * 获取两个评分向量的共同项目
   * @param {Map} ratings1 - 评分向量1
   * @param {Map} ratings2 - 评分向量2
   * @returns {Array} 共同项目ID数组
   */
  getCommonItems(ratings1, ratings2) {
    const commonItems = [];

    ratings1.forEach((rating, itemId) => {
      if (ratings2.has(itemId)) {
        commonItems.push(itemId);
      }
    });

    return commonItems;
  }

  /**
   * 计算物品的平均评分
   * @param {Map} itemRatings - 物品评分矩阵
   * @param {string} itemId - 物品ID
   * @returns {number} 平均评分
   */
  getItemAverageRating(itemRatings, itemId) {
    const ratings = itemRatings.get(itemId);
    if (!ratings || ratings.size === 0) {
      return 0;
    }

    let sum = 0;
    ratings.forEach(rating => {
      sum += rating;
    });

    return sum / ratings.size;
  }

  /**
   * 计算用户的平均评分
   * @param {Map} userRatings - 用户评分向量
   * @returns {number} 平均评分
   */
  getUserAverageRating(userRatings) {
    if (!userRatings || userRatings.size === 0) {
      return 0;
    }

    let sum = 0;
    userRatings.forEach(rating => {
      sum += rating;
    });

    return sum / userRatings.size;
  }

  /**
   * 过滤相似度结果，去除低相似度和数据不足的情况
   * @param {Array} similarities - 相似度数组
   * @param {number} minSimilarity - 最小相似度阈值
   * @param {number} minCommonItems - 最少共同项目数
   * @returns {Array} 过滤后的相似度数组
   */
  filterSimilarities(similarities, minSimilarity = 0.1, minCommonItems = 2) {
    return similarities.filter(
      sim =>
        sim.similarity >= minSimilarity && sim.commonItems >= minCommonItems
    );
  }

  /**
   * 获取Top N相似的用户/物品
   * @param {Array} similarities - 相似度数组
   * @param {number} n - Top N数量
   * @returns {Array} Top N相似的用户/物品
   */
  getTopNSimilar(similarities, n = 10) {
    return similarities.slice(0, n);
  }

  /**
   * 带缓存的相似度计算
   * @param {string} cacheKey - 缓存键
   * @param {Function} computeFunction - 计算函数
   * @returns {Promise} 计算结果
   */
  async computeWithCache(cacheKey, computeFunction) {
    // 检查内存缓存
    if (this.similarityCache.has(cacheKey)) {
      const cached = this.similarityCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }
    }

    // 执行计算
    const result = await computeFunction();

    // 缓存结果 (LRU策略)
    if (this.similarityCache.size >= this.CACHE_SIZE) {
      const firstKey = this.similarityCache.keys().next().value;
      this.similarityCache.delete(firstKey);
    }

    this.similarityCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.similarityCache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      size: this.similarityCache.size,
      maxSize: this.CACHE_SIZE,
      usageRate:
        ((this.similarityCache.size / this.CACHE_SIZE) * 100).toFixed(2) + '%',
    };
  }
}

// 创建单例实例
const similarityUtils = new SimilarityUtils();

module.exports = similarityUtils;
