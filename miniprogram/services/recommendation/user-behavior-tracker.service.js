/**
 * 用户行为跟踪服务
 * 用于收集和分析用户行为数据，优化推荐算法
 */

const apiService = require('../api.service.js')

class UserBehaviorTracker {
  constructor() {
    // 行为队列，用于批量处理
    this.behaviorQueue = []
    this.queueMaxSize = 100
    this.flushInterval = 5000 // 5秒刷新一次
    
    // 行为缓存，避免重复记录
    this.behaviorCache = new Map()
    this.cacheMaxSize = 1000
    this.cacheExpiration = 60 * 60 * 1000 // 1小时过期
    
    // 用户会话数据
    this.userSessions = new Map()
    this.sessionTimeout = 30 * 60 * 1000 // 30分钟会话超时
    
    // 启动定时刷新
    this.startPeriodicFlush()
  }

  /**
   * 记录页面访问行为
   */
  recordPageView(userId, page, metadata = {}) {
    const behavior = {
      id: this.generateId(),
      userId,
      type: 'page_view',
      page,
      metadata,
      timestamp: Date.now(),
      sessionId: this.getOrCreateSessionId(userId)
    }
    
    this.addToQueue(behavior)
  }

  /**
   * 记录播客播放行为
   */
  recordPodcastPlay(userId, podcastId, channelId, metadata = {}) {
    const behavior = {
      id: this.generateId(),
      userId,
      type: 'podcast_play',
      podcastId,
      channelId,
      metadata: {
        duration: metadata.duration,
        position: metadata.position,
        completed: metadata.completed,
        playCount: metadata.playCount,
        ...metadata
      },
      timestamp: Date.now(),
      sessionId: this.getOrCreateSessionId(userId)
    }
    
    this.addToQueue(behavior)
  }

  /**
   * 记录播客交互行为
   */
  recordPodcastInteraction(userId, podcastId, action, metadata = {}) {
    const behavior = {
      id: this.generateId(),
      userId,
      type: 'podcast_interaction',
      podcastId,
      action, // 'like', 'unlike', 'favorite', 'unfavorite', 'share', 'comment'
      metadata,
      timestamp: Date.now(),
      sessionId: this.getOrCreateSessionId(userId)
    }
    
    this.addToQueue(behavior)
  }

  /**
   * 记录搜索行为
   */
  recordSearch(userId, query, results = [], metadata = {}) {
    const behavior = {
      id: this.generateId(),
      userId,
      type: 'search',
      query,
      results: results.slice(0, 10), // 只保存前10个结果
      metadata: {
        resultCount: results.length,
        hasResults: results.length > 0,
        ...metadata
      },
      timestamp: Date.now(),
      sessionId: this.getOrCreateSessionId(userId)
    }
    
    this.addToQueue(behavior)
  }

  /**
   * 记录推荐交互行为
   */
  recordRecommendationInteraction(userId, podcastId, action, recommendationData = {}, metadata = {}) {
    const behavior = {
      id: this.generateId(),
      userId,
      type: 'recommendation_interaction',
      podcastId,
      action, // 'view', 'click', 'play', 'favorite', 'like'
      recommendationId: recommendationData.recommendationId,
      algorithm: recommendationData.algorithm,
      position: recommendationData.position,
      score: recommendationData.score,
      metadata,
      timestamp: Date.now(),
      sessionId: this.getOrCreateSessionId(userId)
    }
    
    this.addToQueue(behavior)
  }

  /**
   * 记录用户偏好行为
   */
  recordUserPreference(userId, preferenceType, preferenceValue, metadata = {}) {
    const behavior = {
      id: this.generateId(),
      userId,
      type: 'user_preference',
      preferenceType, // 'category', 'channel', 'topic', 'duration'
      preferenceValue,
      metadata,
      timestamp: Date.now(),
      sessionId: this.getOrCreateSessionId(userId)
    }
    
    this.addToQueue(behavior)
  }

  /**
   * 记录异常行为
   */
  recordAbnormalBehavior(userId, behaviorType, details = {}) {
    const behavior = {
      id: this.generateId(),
      userId,
      type: 'abnormal_behavior',
      behaviorType, // 'rapid_action', 'unusual_pattern', 'bot_like'
      details,
      timestamp: Date.now(),
      sessionId: this.getOrCreateSessionId(userId)
    }
    
    this.addToQueue(behavior)
  }

  /**
   * 获取用户行为摘要
   */
  async getUserBehaviorSummary(userId, timeRange = 7 * 24 * 60 * 60 * 1000) {
    try {
      const startTime = Date.now() - timeRange
      
      // 从数据库获取用户行为数据
      const behaviors = await this.getUserBehaviorsFromDB(userId, startTime)
      
      const summary = {
        userId,
        timeRange,
        totalBehaviors: behaviors.length,
        behaviorBreakdown: this.analyzeBehaviorBreakdown(behaviors),
        preferenceAnalysis: this.analyzeUserPreferences(behaviors),
        engagementMetrics: this.calculateEngagementMetrics(behaviors),
        recommendationEffectiveness: this.analyzeRecommendationEffectiveness(behaviors),
        abnormalPatterns: this.detectAbnormalPatterns(behaviors)
      }
      
      return summary
    } catch (error) {
      console.error('获取用户行为摘要失败:', error)
      return null
    }
  }

  /**
   * 分析行为分布
   */
  analyzeBehaviorBreakdown(behaviors) {
    const breakdown = {}
    const typeMap = {}
    
    behaviors.forEach(behavior => {
      typeMap[behavior.type] = (typeMap[behavior.type] || 0) + 1
    })
    
    return typeMap
  }

  /**
   * 分析用户偏好
   */
  analyzeUserPreferences(behaviors) {
    const preferences = {
      categories: {},
      channels: {},
      actions: {},
      timePatterns: {
        hourly: new Array(24).fill(0),
        daily: new Array(7).fill(0)
      }
    }
    
    behaviors.forEach(behavior => {
      const hour = new Date(behavior.timestamp).getHours()
      const day = new Date(behavior.timestamp).getDay()
      
      preferences.timePatterns.hourly[hour]++
      preferences.timePatterns.daily[day]++
      
      if (behavior.metadata?.category) {
        preferences.categories[behavior.metadata.category] = 
          (preferences.categories[behavior.metadata.category] || 0) + 1
      }
      
      if (behavior.channelId) {
        preferences.channels[behavior.channelId] = 
          (preferences.channels[behavior.channelId] || 0) + 1
      }
      
      if (behavior.action) {
        preferences.actions[behavior.action] = 
          (preferences.actions[behavior.action] || 0) + 1
      }
    })
    
    return preferences
  }

  /**
   * 计算参与度指标
   */
  calculateEngagementMetrics(behaviors) {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    
    const dailyActivity = {}
    let totalSessionTime = 0
    let sessionCount = 0
    
    behaviors.forEach(behavior => {
      const day = Math.floor(behavior.timestamp / dayMs)
      dailyActivity[day] = (dailyActivity[day] || 0) + 1
    })
    
    // 计算会话时间（简化计算）
    const sessions = this.groupBehaviorsBySession(behaviors)
    sessions.forEach(session => {
      if (session.behaviors.length >= 2) {
        const sessionTime = session.behaviors[session.behaviors.length - 1].timestamp - 
                           session.behaviors[0].timestamp
        totalSessionTime += sessionTime
        sessionCount++
      }
    })
    
    return {
      activeDays: Object.keys(dailyActivity).length,
      avgDailyBehaviors: behaviors.length / Math.max(1, Object.keys(dailyActivity).length),
      avgSessionTime: sessionCount > 0 ? totalSessionTime / sessionCount : 0,
      sessionCount,
      totalBehaviors: behaviors.length
    }
  }

  /**
   * 分析推荐效果
   */
  analyzeRecommendationEffectiveness(behaviors) {
    const recommendationBehaviors = behaviors.filter(b => b.type === 'recommendation_interaction')
    
    const algorithmStats = {}
    const actionStats = {}
    
    recommendationBehaviors.forEach(behavior => {
      if (behavior.algorithm) {
        if (!algorithmStats[behavior.algorithm]) {
          algorithmStats[behavior.algorithm] = { views: 0, clicks: 0, conversions: 0 }
        }
        
        algorithmStats[behavior.algorithm].views++
        
        if (behavior.action === 'click') {
          algorithmStats[behavior.algorithm].clicks++
        }
        
        if (['play', 'favorite', 'like'].includes(behavior.action)) {
          algorithmStats[behavior.algorithm].conversions++
        }
      }
      
      actionStats[behavior.action] = (actionStats[behavior.action] || 0) + 1
    })
    
    // 计算各算法的CTR和转化率
    Object.keys(algorithmStats).forEach(algorithm => {
      const stats = algorithmStats[algorithm]
      stats.ctr = stats.views > 0 ? stats.clicks / stats.views : 0
      stats.conversionRate = stats.clicks > 0 ? stats.conversions / stats.clicks : 0
    })
    
    return {
      totalRecommendations: recommendationBehaviors.length,
      algorithmStats,
      actionStats,
      overallCTR: recommendationBehaviors.filter(b => b.action === 'click').length / 
                   Math.max(1, recommendationBehaviors.filter(b => b.action === 'view').length),
      overallConversionRate: recommendationBehaviors.filter(b => ['play', 'favorite', 'like'].includes(b.action)).length / 
                              Math.max(1, recommendationBehaviors.filter(b => b.action === 'click').length)
    }
  }

  /**
   * 检测异常行为模式
   */
  detectAbnormalPatterns(behaviors) {
    const abnormalities = []
    
    // 检测快速连续操作
    const rapidActions = this.detectRapidActions(behaviors)
    if (rapidActions.length > 0) {
      abnormalities.push({
        type: 'rapid_actions',
        count: rapidActions.length,
        details: rapidActions
      })
    }
    
    // 检测非人类行为模式
    const botLikePatterns = this.detectBotLikePatterns(behaviors)
    if (botLikePatterns.length > 0) {
      abnormalities.push({
        type: 'bot_like_patterns',
        count: botLikePatterns.length,
        details: botLikePatterns
      })
    }
    
    return abnormalities
  }

  /**
   * 检测快速连续操作
   */
  detectRapidActions(behaviors, threshold = 1000) {
    const rapidActions = []
    
    for (let i = 1; i < behaviors.length; i++) {
      const timeDiff = behaviors[i].timestamp - behaviors[i-1].timestamp
      if (timeDiff < threshold) {
        rapidActions.push({
          behaviors: [behaviors[i-1], behaviors[i]],
          timeDiff
        })
      }
    }
    
    return rapidActions
  }

  /**
   * 检测机器人行为模式
   */
  detectBotLikePatterns(behaviors) {
    const patterns = []
    
    // 检测过于规律的时间间隔
    const intervals = []
    for (let i = 1; i < behaviors.length; i++) {
      intervals.push(behaviors[i].timestamp - behaviors[i-1].timestamp)
    }
    
    if (intervals.length > 10) {
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length
      const stdDev = Math.sqrt(variance)
      
      // 如果标准差太小，可能是机器人
      if (stdDev < avgInterval * 0.1) {
        patterns.push({
          type: 'regular_timing',
          avgInterval,
          stdDev
        })
      }
    }
    
    return patterns
  }

  /**
   * 添加行为到队列
   */
  addToQueue(behavior) {
    // 检查缓存避免重复
    const cacheKey = this.getBehaviorCacheKey(behavior)
    if (this.behaviorCache.has(cacheKey)) {
      return
    }
    
    this.behaviorQueue.push(behavior)
    this.behaviorCache.set(cacheKey, Date.now())
    
    // 维护缓存大小
    if (this.behaviorCache.size > this.cacheMaxSize) {
      const oldestKey = this.behaviorCache.keys().next().value
      this.behaviorCache.delete(oldestKey)
    }
    
    // 立即处理如果队列满了
    if (this.behaviorQueue.length >= this.queueMaxSize) {
      this.flushQueue()
    }
  }

  /**
   * 获取行为缓存键
   */
  getBehaviorCacheKey(behavior) {
    return `${behavior.userId}_${behavior.type}_${behavior.podcastId || ''}_${behavior.timestamp}`
  }

  /**
   * 获取或创建会话ID
   */
  getOrCreateSessionId(userId) {
    const now = Date.now()
    const session = this.userSessions.get(userId)
    
    if (!session || (now - session.lastActivity) > this.sessionTimeout) {
      const newSession = {
        id: this.generateId(),
        userId,
        startTime: now,
        lastActivity: now
      }
      this.userSessions.set(userId, newSession)
      return newSession.id
    }
    
    session.lastActivity = now
    return session.id
  }

  /**
   * 从数据库获取用户行为
   */
  async getUserBehaviorsFromDB(userId, startTime) {
    try {
      // 这里应该实现从数据库获取用户行为的逻辑
      // 暂时返回模拟数据
      return []
    } catch (error) {
      console.error('从数据库获取用户行为失败:', error)
      return []
    }
  }

  /**
   * 按会话分组行为
   */
  groupBehaviorsBySession(behaviors) {
    const sessions = {}
    
    behaviors.forEach(behavior => {
      const sessionId = behavior.sessionId || 'default'
      if (!sessions[sessionId]) {
        sessions[sessionId] = {
          sessionId,
          behaviors: [],
          startTime: behavior.timestamp,
          endTime: behavior.timestamp
        }
      }
      
      sessions[sessionId].behaviors.push(behavior)
      sessions[sessionId].startTime = Math.min(sessions[sessionId].startTime, behavior.timestamp)
      sessions[sessionId].endTime = Math.max(sessions[sessionId].endTime, behavior.timestamp)
    })
    
    return Object.values(sessions)
  }

  /**
   * 处理行为队列
   */
  async flushQueue() {
    if (this.behaviorQueue.length === 0) return
    
    const behaviors = [...this.behaviorQueue]
    this.behaviorQueue = []
    
    try {
      // 这里应该实现将行为数据写入数据库的逻辑
      console.log(`批量处理 ${behaviors.length} 个用户行为`)
      
      // 模拟异步处理
      await this.processBehaviors(behaviors)
      
    } catch (error) {
      console.error('处理行为队列失败:', error)
      // 失败时重新加入队列
      this.behaviorQueue.unshift(...behaviors)
    }
  }

  /**
   * 处理行为数据
   */
  async processBehaviors(behaviors) {
    // 这里可以实现复杂的行为处理逻辑
    // 例如：实时更新用户画像，触发推荐算法更新等
    return new Promise(resolve => {
      setTimeout(resolve, 100)
    })
  }

  /**
   * 启动定期刷新
   */
  startPeriodicFlush() {
    setInterval(() => {
      this.flushQueue()
      this.cleanExpiredCache()
      this.cleanExpiredSessions()
    }, this.flushInterval)
  }

  /**
   * 清理过期缓存
   */
  cleanExpiredCache() {
    const now = Date.now()
    for (const [key, timestamp] of this.behaviorCache.entries()) {
      if (now - timestamp > this.cacheExpiration) {
        this.behaviorCache.delete(key)
      }
    }
  }

  /**
   * 清理过期会话
   */
  cleanExpiredSessions() {
    const now = Date.now()
    for (const [userId, session] of this.userSessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.userSessions.delete(userId)
      }
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 获取行为统计
   */
  getBehaviorStats() {
    return {
      queueSize: this.behaviorQueue.length,
      cacheSize: this.behaviorCache.size,
      sessionCount: this.userSessions.size,
      cacheHitRate: this.calculateCacheHitRate()
    }
  }

  /**
   * 计算缓存命中率
   */
  calculateCacheHitRate() {
    // 这里应该实现真实的缓存命中率计算
    return 0.85
  }

  /**
   * 手动刷新队列
   */
  async manualFlush() {
    await this.flushQueue()
  }

  /**
   * 重置跟踪器
   */
  reset() {
    this.behaviorQueue = []
    this.behaviorCache.clear()
    this.userSessions.clear()
  }
}

// 创建单例实例
const userBehaviorTracker = new UserBehaviorTracker()

module.exports = userBehaviorTracker

// 全局行为跟踪函数
const originalPage = Page
Page = function(config) {
  const originalOnLoad = config.onLoad
  const originalOnShow = config.onShow
  const originalOnHide = config.onHide
  const originalOnUnload = config.onUnload
  
  config.onLoad = function(options) {
    const app = getApp()
    const userInfo = app.globalData.userInfo
    
    if (userInfo && userInfo.id) {
      userBehaviorTracker.recordPageView(userInfo.id, this.route, {
        options,
        referrer: getCurrentPages().length > 1 ? getCurrentPages()[getCurrentPages().length - 2].route : null
      })
    }
    
    if (originalOnLoad) {
      originalOnLoad.call(this, options)
    }
  }
  
  config.onShow = function() {
    if (originalOnShow) {
      originalOnShow.call(this)
    }
  }
  
  config.onHide = function() {
    if (originalOnHide) {
      originalOnHide.call(this)
    }
  }
  
  config.onUnload = function() {
    if (originalOnUnload) {
      originalOnUnload.call(this)
    }
  }
  
  return originalPage(config)
}