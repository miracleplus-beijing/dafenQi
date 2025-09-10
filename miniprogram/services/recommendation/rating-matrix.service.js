/**
 * 用户-播客评分矩阵构建服务
 * 基于用户行为数据构建隐式评分矩阵
 */

const apiService = require('../api.service.js')

class RatingMatrixService {
  constructor() {
    this.api = apiService
    this.ratingCache = new Map()
    this.lastUpdateTime = null
    this.CACHE_DURATION = 30 * 60 * 1000 // 30分钟缓存
  }

  /**
   * 构建用户-播客评分矩阵
   * @param {string} userId - 目标用户ID
   * @returns {Promise<Object>} 评分矩阵和相关数据
   */
  async buildRatingMatrix(userId) {
    try {
      // 检查缓存
      const cacheKey = `rating_matrix_${userId}`
      if (this.ratingCache.has(cacheKey)) {
        const cached = this.ratingCache.get(cacheKey)
        if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
          return cached.data
        }
      }

      console.log('开始构建用户-播客评分矩阵...')

      // 1. 获取所有用户的行为数据
      const [users, podcasts, allFavorites, allLikes, allHistory] = await Promise.all([
        this.getAllUsers(),
        this.getAllPodcasts(),
        this.getAllFavorites(),
        this.getAllLikes(),
        this.getAllPlayHistory()
      ])

      console.log(`获取数据完成: ${users.length}用户, ${podcasts.length}播客`)

      // 2. 构建评分矩阵
      const ratingMatrix = this.buildMatrix(users, podcasts, {
        favorites: allFavorites,
        likes: allLikes,
        history: allHistory
      })

      // 3. 获取目标用户的评分向量
      const userRatings = this.getUserRatings(ratingMatrix, userId)

      const result = {
        matrix: ratingMatrix,
        userRatings,
        users,
        podcasts,
        statistics: this.calculateStatistics(ratingMatrix)
      }

      // 缓存结果
      this.ratingCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })

      console.log('评分矩阵构建完成')
      return result

    } catch (error) {
      console.error('构建评分矩阵失败:', error)
      throw error
    }
  }

  /**
   * 获取所有用户
   */
  async getAllUsers() {
    try {
      const result = await this.api.request.get('/rest/v1/users', {
        select: 'id,academic_field,nickname,username',
        is_active: 'eq.true',
        limit: 1000
      })
      return result || []
    } catch (error) {
      console.error('获取用户数据失败:', error)
      return []
    }
  }

  /**
   * 获取所有播客
   */
  async getAllPodcasts() {
    try {
      const result = await this.api.request.get('/rest/v1/podcasts', {
        select: 'id,title,channel_id,category,play_count,like_count,favorite_count',
        status: 'eq.published',
        limit: 1000
      })
      return result || []
    } catch (error) {
      console.error('获取播客数据失败:', error)
      return []
    }
  }

  /**
   * 获取所有收藏数据
   */
  async getAllFavorites() {
    try {
      const result = await this.api.request.get('/rest/v1/user_favorites', {
        select: 'user_id,podcast_id,created_at',
        limit: 5000
      })
      return result || []
    } catch (error) {
      console.error('获取收藏数据失败:', error)
      return []
    }
  }

  /**
   * 获取所有点赞数据
   */
  async getAllLikes() {
    try {
      const result = await this.api.request.get('/rest/v1/user_likes', {
        select: 'user_id,podcast_id,created_at',
        limit: 5000
      })
      return result || []
    } catch (error) {
      console.error('获取点赞数据失败:', error)
      return []
    }
  }

  /**
   * 获取所有播放历史
   */
  async getAllPlayHistory() {
    try {
      const result = await this.api.request.get('/rest/v1/user_play_history', {
        select: 'user_id,podcast_id,play_position,play_duration,completed,played_at',
        limit: 10000
      })
      return result || []
    } catch (error) {
      console.error('获取播放历史失败:', error)
      return []
    }
  }

  /**
   * 构建评分矩阵
   */
  buildMatrix(users, podcasts, behaviorData) {
    const matrix = new Map()
    const now = Date.now()

    // 初始化矩阵
    users.forEach(user => {
      matrix.set(user.id, new Map())
    })

    // 处理收藏数据 (权重: 3)
    behaviorData.favorites.forEach(fav => {
      const userRatings = matrix.get(fav.user_id)
      if (userRatings) {
        const timeDecay = this.calculateTimeDecay(fav.created_at, now)
        userRatings.set(fav.podcast_id, (userRatings.get(fav.podcast_id) || 0) + 3 * timeDecay)
      }
    })

    // 处理点赞数据 (权重: 2)
    behaviorData.likes.forEach(like => {
      const userRatings = matrix.get(like.user_id)
      if (userRatings) {
        const timeDecay = this.calculateTimeDecay(like.created_at, now)
        userRatings.set(like.podcast_id, (userRatings.get(like.podcast_id) || 0) + 2 * timeDecay)
      }
    })

    // 处理播放历史
    behaviorData.history.forEach(history => {
      const userRatings = matrix.get(history.user_id)
      if (userRatings && history.podcast_id) {
        let score = 0
        
        // 播放完成度评分
        if (history.completed) {
          score += 2
        } else if (history.play_duration > 0) {
          // 根据播放时长计算部分分数
          score += Math.min(1, history.play_duration / 300) // 5分钟为满分1分
        }

        // 重复播放加分
        const existingScore = userRatings.get(history.podcast_id) || 0
        if (existingScore > 0) {
          score += 0.5 // 重复播放额外加分
        }

        const timeDecay = this.calculateTimeDecay(history.played_at, now)
        userRatings.set(history.podcast_id, existingScore + score * timeDecay)
      }
    })

    return matrix
  }

  /**
   * 计算时间衰减因子
   */
  calculateTimeDecay(timestamp, now) {
    const timeDiff = now - new Date(timestamp).getTime()
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
    
    // 使用指数衰减，半衰期为30天
    return Math.exp(-daysDiff / 30)
  }

  /**
   * 获取指定用户的评分向量
   */
  getUserRatings(matrix, userId) {
    return matrix.get(userId) || new Map()
  }

  /**
   * 计算评分矩阵统计信息
   */
  calculateStatistics(matrix) {
    let totalRatings = 0
    let nonZeroRatings = 0
    let maxRating = 0
    let minRating = Infinity

    matrix.forEach(userRatings => {
      userRatings.forEach(rating => {
        totalRatings++
        if (rating > 0) {
          nonZeroRatings++
          maxRating = Math.max(maxRating, rating)
          minRating = Math.min(minRating, rating)
        }
      })
    })

    return {
      totalUsers: matrix.size,
      totalRatings,
      nonZeroRatings,
      sparsity: totalRatings > 0 ? (1 - nonZeroRatings / totalRatings) : 1,
      maxRating,
      minRating: minRating === Infinity ? 0 : minRating
    }
  }

  /**
   * 获取用户行为统计
   */
  async getUserBehaviorStats(userId) {
    try {
      const [favorites, likes, history] = await Promise.all([
        this.api.user.getFavorites(userId),
        this.api.request.get('/rest/v1/user_likes', { user_id: `eq.${userId}` }),
        this.api.user.getHistory(userId, 100)
      ])

      const completedCount = history.data?.filter(h => h.completed).length || 0
      const totalPlayTime = history.data?.reduce((sum, h) => sum + (h.play_duration || 0), 0) || 0

      return {
        favoritesCount: favorites.data?.length || 0,
        likesCount: likes?.length || 0,
        historyCount: history.data?.length || 0,
        completedCount,
        totalPlayTime,
        avgPlayTime: history.data?.length > 0 ? totalPlayTime / history.data.length : 0
      }
    } catch (error) {
      console.error('获取用户行为统计失败:', error)
      return {
        favoritesCount: 0,
        likesCount: 0,
        historyCount: 0,
        completedCount: 0,
        totalPlayTime: 0,
        avgPlayTime: 0
      }
    }
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.ratingCache.clear()
    this.lastUpdateTime = null
  }
}

// 创建单例实例
const ratingMatrixService = new RatingMatrixService()

module.exports = ratingMatrixService