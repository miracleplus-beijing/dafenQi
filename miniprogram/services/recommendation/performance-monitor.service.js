/**
 * 推荐系统性能监控服务
 * 用于监控推荐算法的性能指标和效果评估
 */

class RecommendationPerformanceMonitor {
  constructor() {
    this.metrics = {
      // 算法性能指标
      responseTime: [],
      cacheHitRate: 0,
      matrixBuildTime: 0,
      similarityComputeTime: 0,
      
      // 推荐质量指标
      precision: 0,
      recall: 0,
      coverage: 0,
      diversity: 0,
      novelty: 0,
      
      // 用户行为指标
      clickThroughRate: 0,
      conversionRate: 0,
      userEngagement: 0,
      
      // 系统指标
      memoryUsage: 0,
      cacheSize: 0,
      activeUsers: 0
    }
    
    this.interactions = []
    this.maxInteractions = 1000
    this.startTime = Date.now()
    
    // 性能阈值
    this.thresholds = {
      maxResponseTime: 2000,      // 最大响应时间(ms)
      minPrecision: 0.1,          // 最小精度
      minRecall: 0.05,            // 最小召回率
      minClickThroughRate: 0.02,  // 最小点击率
      maxCacheSize: 100           // 最大缓存大小(MB)
    }
  }

  /**
   * 记录推荐请求
   */
  recordRecommendationRequest(userId, algorithm, options) {
    const request = {
      id: this.generateId(),
      userId,
      algorithm,
      options,
      timestamp: Date.now(),
      startTime: performance.now()
    }
    
    this.interactions.push(request)
    this.cleanOldInteractions()
    
    return request.id
  }

  /**
   * 记录推荐响应
   */
  recordRecommendationResponse(requestId, recommendations, success = true, error = null) {
    const interaction = this.interactions.find(i => i.id === requestId)
    if (!interaction) return
    
    const responseTime = performance.now() - interaction.startTime
    
    interaction.response = {
      recommendations: recommendations.length,
      success,
      error,
      responseTime,
      timestamp: Date.now()
    }
    
    // 记录响应时间
    this.recordResponseTime(responseTime)
    
    return interaction
  }

  /**
   * 记录用户点击行为
   */
  recordUserClick(userId, podcastId, recommendationId, position, algorithm) {
    const click = {
      id: this.generateId(),
      userId,
      podcastId,
      recommendationId,
      position,
      algorithm,
      timestamp: Date.now(),
      type: 'click'
    }
    
    this.interactions.push(click)
    this.cleanOldInteractions()
    
    // 更新点击率
    this.updateClickThroughRate()
    
    return click
  }

  /**
   * 记录用户转化行为（收藏、点赞、完成播放等）
   */
  recordUserConversion(userId, podcastId, action, recommendationId, algorithm) {
    const conversion = {
      id: this.generateId(),
      userId,
      podcastId,
      action, // 'favorite', 'like', 'complete'
      recommendationId,
      algorithm,
      timestamp: Date.now(),
      type: 'conversion'
    }
    
    this.interactions.push(conversion)
    this.cleanOldInteractions()
    
    // 更新转化率
    this.updateConversionRate()
    
    return conversion
  }

  /**
   * 记录矩阵构建时间
   */
  recordMatrixBuildTime(duration) {
    this.metrics.matrixBuildTime = duration
    
    if (duration > this.thresholds.maxMatrixBuildTime) {
      console.warn(`矩阵构建时间超过阈值: ${duration}ms`)
    }
  }

  /**
   * 记录相似度计算时间
   */
  recordSimilarityComputeTime(duration) {
    this.metrics.similarityComputeTime = duration
    
    if (duration > this.thresholds.maxSimilarityComputeTime) {
      console.warn(`相似度计算时间超过阈值: ${duration}ms`)
    }
  }

  /**
   * 记录响应时间
   */
  recordResponseTime(duration) {
    this.metrics.responseTime.push({
      duration,
      timestamp: Date.now()
    })
    
    // 保持最近100条记录
    if (this.metrics.responseTime.length > 100) {
      this.metrics.responseTime.shift()
    }
    
    if (duration > this.thresholds.maxResponseTime) {
      console.warn(`推荐响应时间超过阈值: ${duration}ms`)
    }
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(cacheType) {
    this.cacheHits = (this.cacheHits || {}) 
    this.cacheHits[cacheType] = (this.cacheHits[cacheType] || 0) + 1
    this.updateCacheHitRate()
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(cacheType) {
    this.cacheMisses = (this.cacheMisses || {})
    this.cacheMisses[cacheType] = (this.cacheMisses[cacheType] || 0) + 1
    this.updateCacheHitRate()
  }

  /**
   * 计算推荐质量指标
   */
  calculateQualityMetrics(testSet, recommendations) {
    // 计算精度 (Precision)
    const relevantRecommended = recommendations.filter(rec => 
      testSet.some(test => test.podcastId === rec.podcastId && test.rating > 0)
    ).length
    
    this.metrics.precision = relevantRecommended / recommendations.length
    
    // 计算召回率 (Recall)
    const totalRelevant = testSet.filter(test => test.rating > 0).length
    this.metrics.recall = totalRelevant > 0 ? relevantRecommended / totalRelevant : 0
    
    // 计算覆盖率 (Coverage)
    const uniqueRecommended = new Set(recommendations.map(r => r.podcastId)).size
    const totalItems = new Set(testSet.map(t => t.podcastId)).size
    this.metrics.coverage = uniqueRecommended / totalItems
    
    // 计算多样性 (Diversity)
    this.metrics.diversity = this.calculateDiversity(recommendations)
    
    // 计算新颖性 (Novelty)
    this.metrics.novelty = this.calculateNovelty(recommendations)
    
    return {
      precision: this.metrics.precision,
      recall: this.metrics.recall,
      coverage: this.metrics.coverage,
      diversity: this.metrics.diversity,
      novelty: this.metrics.novelty
    }
  }

  /**
   * 计算多样性
   */
  calculateDiversity(recommendations) {
    if (recommendations.length < 2) return 0
    
    let totalDissimilarity = 0
    let pairs = 0
    
    for (let i = 0; i < recommendations.length; i++) {
      for (let j = i + 1; j < recommendations.length; j++) {
        // 基于分类的相似度计算
        const similarity = this.calculateCategorySimilarity(
          recommendations[i].category,
          recommendations[j].category
        )
        totalDissimilarity += (1 - similarity)
        pairs++
      }
    }
    
    return pairs > 0 ? totalDissimilarity / pairs : 0
  }

  /**
   * 计算新颖性 (基于流行度)
   */
  calculateNovelty(recommendations) {
    if (recommendations.length === 0) return 0
    
    const totalPopularity = recommendations.reduce((sum, rec) => {
      return sum + (rec.play_count || 0)
    }, 0)
    
    const avgPopularity = totalPopularity / recommendations.length
    
    // 新颖性 = 1 - 归一化流行度 (假设最大播放量为10000)
    const maxPopularity = 10000
    return 1 - Math.min(avgPopularity / maxPopularity, 1)
  }

  /**
   * 计算类别相似度
   */
  calculateCategorySimilarity(category1, category2) {
    if (!category1 || !category2) return 0
    if (category1 === category2) return 1
    
    // 简单的类别相似度计算
    const categories1 = category1.split('.')
    const categories2 = category2.split('.')
    
    let commonLevel = 0
    for (let i = 0; i < Math.min(categories1.length, categories2.length); i++) {
      if (categories1[i] === categories2[i]) {
        commonLevel++
      } else {
        break
      }
    }
    
    return commonLevel / Math.max(categories1.length, categories2.length)
  }

  /**
   * 更新点击率
   */
  updateClickThroughRate() {
    const recentRecommendations = this.interactions.filter(i => 
      i.type === 'recommendation' && 
      i.timestamp > Date.now() - 24 * 60 * 60 * 1000 // 最近24小时
    )
    
    const recentClicks = this.interactions.filter(i => 
      i.type === 'click' && 
      i.timestamp > Date.now() - 24 * 60 * 60 * 1000
    )
    
    this.metrics.clickThroughRate = recentRecommendations.length > 0 
      ? recentClicks.length / recentRecommendations.length 
      : 0
  }

  /**
   * 更新转化率
   */
  updateConversionRate() {
    const recentClicks = this.interactions.filter(i => 
      i.type === 'click' && 
      i.timestamp > Date.now() - 24 * 60 * 60 * 1000
    )
    
    const recentConversions = this.interactions.filter(i => 
      i.type === 'conversion' && 
      i.timestamp > Date.now() - 24 * 60 * 60 * 1000
    )
    
    this.metrics.conversionRate = recentClicks.length > 0 
      ? recentConversions.length / recentClicks.length 
      : 0
  }

  /**
   * 更新缓存命中率
   */
  updateCacheHitRate() {
    const totalHits = Object.values(this.cacheHits || {}).reduce((sum, count) => sum + count, 0)
    const totalMisses = Object.values(this.cacheMisses || {}).reduce((sum, count) => sum + count, 0)
    const total = totalHits + totalMisses
    
    this.metrics.cacheHitRate = total > 0 ? totalHits / total : 0
  }

  /**
   * 获取性能统计信息
   */
  getPerformanceStats() {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((sum, r) => sum + r.duration, 0) / this.metrics.responseTime.length
      : 0
    
    const recentResponseTimes = this.metrics.responseTime.filter(r => 
      r.timestamp > Date.now() - 60 * 60 * 1000 // 最近1小时
    )
    
    const recentAvgResponseTime = recentResponseTimes.length > 0
      ? recentResponseTimes.reduce((sum, r) => sum + r.duration, 0) / recentResponseTimes.length
      : 0
    
    return {
      system: {
        uptime: Date.now() - this.startTime,
        totalInteractions: this.interactions.length,
        cacheHitRate: this.metrics.cacheHitRate,
        memoryUsage: this.metrics.memoryUsage
      },
      performance: {
        avgResponseTime,
        recentAvgResponseTime,
        matrixBuildTime: this.metrics.matrixBuildTime,
        similarityComputeTime: this.metrics.similarityComputeTime
      },
      quality: {
        precision: this.metrics.precision,
        recall: this.metrics.recall,
        coverage: this.metrics.coverage,
        diversity: this.metrics.diversity,
        novelty: this.metrics.novelty
      },
      engagement: {
        clickThroughRate: this.metrics.clickThroughRate,
        conversionRate: this.metrics.conversionRate,
        activeUsers: this.getActiveUserCount()
      },
      alerts: this.getPerformanceAlerts()
    }
  }

  /**
   * 获取活跃用户数
   */
  getActiveUserCount() {
    const activeTime = Date.now() - 24 * 60 * 60 * 1000 // 最近24小时
    const activeUsers = new Set(
      this.interactions
        .filter(i => i.timestamp > activeTime && i.userId)
        .map(i => i.userId)
    )
    return activeUsers.size
  }

  /**
   * 获取性能告警
   */
  getPerformanceAlerts() {
    const alerts = []
    
    if (this.metrics.precision < this.thresholds.minPrecision) {
      alerts.push({
        type: 'quality',
        severity: 'warning',
        message: `推荐精度低于阈值: ${this.metrics.precision.toFixed(3)} < ${this.thresholds.minPrecision}`,
        timestamp: Date.now()
      })
    }
    
    if (this.metrics.clickThroughRate < this.thresholds.minClickThroughRate) {
      alerts.push({
        type: 'engagement',
        severity: 'warning',
        message: `点击率低于阈值: ${this.metrics.clickThroughRate.toFixed(3)} < ${this.thresholds.minClickThroughRate}`,
        timestamp: Date.now()
      })
    }
    
    const recentResponseTimes = this.metrics.responseTime.filter(r => 
      r.timestamp > Date.now() - 60 * 60 * 1000
    )
    
    if (recentResponseTimes.length > 0) {
      const avgRecentTime = recentResponseTimes.reduce((sum, r) => sum + r.duration, 0) / recentResponseTimes.length
      if (avgRecentTime > this.thresholds.maxResponseTime) {
        alerts.push({
          type: 'performance',
          severity: 'critical',
          message: `平均响应时间超过阈值: ${avgRecentTime.toFixed(0)}ms > ${this.thresholds.maxResponseTime}ms`,
          timestamp: Date.now()
        })
      }
    }
    
    return alerts
  }

  /**
   * 清理旧的交互记录
   */
  cleanOldInteractions() {
    if (this.interactions.length > this.maxInteractions) {
      // 保留最近90%的记录
      const keepCount = Math.floor(this.maxInteractions * 0.9)
      this.interactions = this.interactions.slice(-keepCount)
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 重置统计信息
   */
  reset() {
    this.metrics = {
      responseTime: [],
      cacheHitRate: 0,
      matrixBuildTime: 0,
      similarityComputeTime: 0,
      precision: 0,
      recall: 0,
      coverage: 0,
      diversity: 0,
      novelty: 0,
      clickThroughRate: 0,
      conversionRate: 0,
      userEngagement: 0,
      memoryUsage: 0,
      cacheSize: 0,
      activeUsers: 0
    }
    
    this.interactions = []
    this.cacheHits = {}
    this.cacheMisses = {}
    this.startTime = Date.now()
  }

  /**
   * 导出性能报告
   */
  exportPerformanceReport() {
    const stats = this.getPerformanceStats()
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        uptime: stats.system.uptime,
        totalInteractions: stats.system.totalInteractions,
        activeUsers: stats.engagement.activeUsers,
        overallHealth: this.calculateOverallHealth(stats)
      },
      performance: stats.performance,
      quality: stats.quality,
      engagement: stats.engagement,
      alerts: stats.alerts,
      recommendations: this.generateRecommendations(stats)
    }
  }

  /**
   * 计算整体健康度
   */
  calculateOverallHealth(stats) {
    const weights = {
      performance: 0.3,
      quality: 0.3,
      engagement: 0.4
    }
    
    const performanceScore = Math.max(0, 1 - stats.performance.recentAvgResponseTime / 3000)
    const qualityScore = (stats.quality.precision + stats.quality.recall + stats.quality.diversity) / 3
    const engagementScore = stats.engagement.clickThroughRate * 10 // 放大点击率影响
    
    const overallHealth = (
      performanceScore * weights.performance +
      qualityScore * weights.quality +
      Math.min(engagementScore, 1) * weights.engagement
    )
    
    return Math.round(overallHealth * 100)
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(stats) {
    const recommendations = []
    
    if (stats.performance.recentAvgResponseTime > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        suggestion: '优化推荐算法响应时间，考虑增加缓存或优化相似度计算'
      })
    }
    
    if (stats.quality.precision < 0.2) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        suggestion: '提高推荐精度，考虑调整相似度阈值或增加训练数据'
      })
    }
    
    if (stats.engagement.clickThroughRate < 0.05) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        suggestion: '提升用户参与度，考虑增加推荐多样性或改进推荐理由'
      })
    }
    
    return recommendations
  }
}

// 创建单例实例
const performanceMonitor = new RecommendationPerformanceMonitor()

module.exports = performanceMonitor