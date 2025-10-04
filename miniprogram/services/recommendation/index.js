/**
 * 推荐系统服务总入口
 * 整合所有推荐相关服务
 */

const ratingMatrixService = require('./rating-matrix.service.js')
const collaborativeFilteringService = require('./collaborative-filtering.service.js')
const performanceMonitor = require('./performance-monitor.service.js')
const requestUtil = require('../../utils/request.js')

class RecommendationService {
  constructor() {
    this.ratingService = ratingMatrixService
    this.cfService = collaborativeFilteringService
    this.monitor = performanceMonitor
    this.requestUtil = requestUtil

    // 服务状态
    this.isInitialized = false
    this.serviceHealth = 'healthy' // 'healthy', 'degraded', 'unhealthy'
    this.lastHealthCheck = null
  }

  /**
   * 初始化推荐服务
   */
  async initialize() {
    try {
      console.log('初始化推荐服务...')

      // 清理缓存
      this.clearAllCache()

      // 检查数据完整性（使用更宽松的检查）
      await this.validateDataIntegrity()

      // 预热推荐系统（可选）
      // await this.preheatSystem()

      this.isInitialized = true
      this.serviceHealth = 'healthy'
      this.lastHealthCheck = Date.now()

      console.log('推荐服务初始化完成')
      return { success: true, message: '推荐服务初始化成功' }

    } catch (error) {
      console.error('推荐服务初始化失败:', error)

      // 更宽松的初始化策略：即使某些检查失败，仍然允许服务启动
      // 这样可以确保基本的推荐功能可用
      this.isInitialized = true
      this.serviceHealth = 'degraded'
      this.lastHealthCheck = Date.now()

      console.warn('推荐服务以降级模式启动:', error.message)
      return {
        success: true,
        message: '推荐服务以降级模式启动',
        warning: error.message
      }
    }
  }

  /**
   * 获取个性化推荐 (主要接口)
   */
  async getPersonalizedRecommendations(userId, options = {}) {
    const requestId = this.monitor.recordRecommendationRequest(userId, 'personalized', options)
    
    try {
      // 健康检查
      if (!await this.performHealthCheck()) {
        throw new Error('推荐服务健康检查失败')
      }
      
      // 获取推荐
      const result = await this.cfService.getPersonalizedRecommendations(userId, options)
      
      // 记录响应
      this.monitor.recordRecommendationResponse(
        requestId, 
        result.data || [], 
        result.success,
        result.error
      )
      
      return result
      
    } catch (error) {
      console.error('个性化推荐失败:', error)
      this.monitor.recordRecommendationResponse(requestId, [], false, error.message)
      
      // 返回降级方案
      return this.getFallbackRecommendations()
    }
  }

  /**
   * 获取热门推荐
   */
  async getPopularRecommendations(limit = 10) {
    try {
      // 首先尝试使用协同过滤服务获取推荐
      const result = await this.cfService.getPopularItems(limit)
      return result
    } catch (error) {
      console.error('获取热门推荐失败，使用降级方案:', error)

      // 降级方案：直接从数据库获取最受欢迎的播客
      try {
        const podcasts = await this.requestUtil.get('/rest/v1/podcasts', {
          select: 'id,title,description,cover_url,audio_url,duration,play_count,like_count',
          order: 'play_count.desc,created_at.desc',
          limit: limit
        })

        return {
          success: true,
          data: podcasts || [],
          metadata: {
            algorithm: 'fallback_popular',
            message: '使用降级方案获取热门内容'
          }
        }
      } catch (fallbackError) {
        console.error('降级方案也失败了:', fallbackError)
        return {
          success: false,
          error: fallbackError.message,
          data: []
        }
      }
    }
  }

  /**
   * 记录用户点击推荐
   */
  async recordRecommendationClick(userId, podcastId, recommendationId, position, algorithm = 'unknown') {
    try {
      this.monitor.recordUserClick(userId, podcastId, recommendationId, position, algorithm)
      
      // 可以在这里添加额外的点击处理逻辑
      // 例如：更新用户行为数据，触发实时推荐更新等
      
      return { success: true }
    } catch (error) {
      console.error('记录推荐点击失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 记录用户转化行为
   */
  async recordUserConversion(userId, podcastId, action, recommendationId, algorithm = 'unknown') {
    try {
      this.monitor.recordUserConversion(userId, podcastId, action, recommendationId, algorithm)
      
      // 可以在这里添加额外的转化处理逻辑
      // 例如：更新推荐算法权重，记录用户偏好等
      
      return { success: true }
    } catch (error) {
      console.error('记录用户转化失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取推荐统计信息
   */
  async getRecommendationStats(userId) {
    try {
      const [cfStats, monitorStats] = await Promise.all([
        this.cfService.getRecommendationStats(userId),
        this.monitor.getPerformanceStats()
      ])
      
      return {
        success: true,
        data: {
          algorithmStats: cfStats,
          performanceStats: monitorStats,
          serviceHealth: this.serviceHealth,
          lastHealthCheck: this.lastHealthCheck
        }
      }
    } catch (error) {
      console.error('获取推荐统计失败:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 获取性能报告
   */
  async getPerformanceReport() {
    try {
      const report = this.monitor.exportPerformanceReport()
      
      return {
        success: true,
        data: report
      }
    } catch (error) {
      console.error('获取性能报告失败:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  /**
   * 清理所有缓存
   */
  async clearAllCache() {
    try {
      this.cfService.clearCache()
      this.ratingService.clearCache()
      this.monitor.reset()
      
      return { success: true, message: '所有缓存已清理' }
    } catch (error) {
      console.error('清理缓存失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 健康检查
   */
  async performHealthCheck() {
    try {
      const checks = await Promise.all([
        this.checkDataSource(),
        this.checkAlgorithmHealth(),
        this.checkPerformance()
      ])
      
      const allHealthy = checks.every(check => check.healthy)
      
      if (allHealthy) {
        this.serviceHealth = 'healthy'
      } else {
        const criticalIssues = checks.filter(check => !check.healthy && check.severity === 'critical')
        this.serviceHealth = criticalIssues.length > 0 ? 'unhealthy' : 'degraded'
      }
      
      this.lastHealthCheck = Date.now()
      
      return allHealthy || this.serviceHealth !== 'unhealthy'
      
    } catch (error) {
      console.error('健康检查失败:', error)
      this.serviceHealth = 'unhealthy'
      return false
    }
  }

  /**
   * 检查数据源
   */
  async checkDataSource() {
    try {
      // 检查数据库连接
      const result = await this.requestUtil.get('/rest/v1/users', { limit: 1 })

      return {
        healthy: result !== null,
        severity: 'critical',
        message: result !== null ? '数据源正常' : '数据源连接失败'
      }
    } catch (error) {
      return {
        healthy: false,
        severity: 'critical',
        message: `数据源检查失败: ${error.message}`
      }
    }
  }

  /**
   * 检查算法健康状态
   */
  async checkAlgorithmHealth() {
    try {
      // 检查评分矩阵是否可构建
      const { statistics } = await this.ratingService.buildRatingMatrix('test-user')
      
      const healthy = statistics.sparsity < 0.95 // 稀疏度不能太高
      
      return {
        healthy,
        severity: healthy ? 'none' : 'warning',
        message: healthy 
          ? '算法健康状态良好' 
          : `评分矩阵过于稀疏: ${(statistics.sparsity * 100).toFixed(1)}%`
      }
    } catch (error) {
      return {
        healthy: false,
        severity: 'warning',
        message: `算法健康检查失败: ${error.message}`
      }
    }
  }

  /**
   * 检查性能指标
   */
  async checkPerformance() {
    try {
      const stats = this.monitor.getPerformanceStats()
      const alerts = stats.alerts
      
      const hasCriticalAlerts = alerts.some(alert => alert.severity === 'critical')
      const hasWarnings = alerts.some(alert => alert.severity === 'warning')
      
      return {
        healthy: !hasCriticalAlerts,
        severity: hasCriticalAlerts ? 'critical' : (hasWarnings ? 'warning' : 'none'),
        message: hasCriticalAlerts 
          ? '存在严重性能问题' 
          : (hasWarnings ? '存在性能警告' : '性能状态良好')
      }
    } catch (error) {
      return {
        healthy: false,
        severity: 'warning',
        message: `性能检查失败: ${error.message}`
      }
    }
  }

  /**
   * 验证数据完整性
   */
  async validateDataIntegrity() {
    try {
      // 检查必要的表是否存在数据
      const [users, podcasts, favorites] = await Promise.all([
        this.requestUtil.get('/rest/v1/users', { limit: 1 }),
        this.requestUtil.get('/rest/v1/podcasts', { limit: 1 }),
        this.requestUtil.get('/rest/v1/user_favorites', { limit: 1 })
      ])

      const issues = []

      if (!users || users.length === 0) {
        issues.push('用户表数据为空')
      }

      if (!podcasts || podcasts.length === 0) {
        issues.push('播客表数据为空')
      }

      // 改进：对于user_favorites表为空，只记录警告而不抛出错误
      if (!favorites || favorites.length === 0) {
        console.warn('用户收藏表数据为空，推荐算法将使用降级方案')
      }

      if (issues.length > 0) {
        throw new Error(`数据完整性检查失败: ${issues.join(', ')}`)
      }

      console.log('数据完整性检查通过')
      return true

    } catch (error) {
      console.error('数据完整性检查失败:', error)
      throw error
    }
  }

  /**
   * 获取降级推荐
   */
  getFallbackRecommendations() {
    return {
      success: true,
      data: [],
      metadata: {
        algorithm: 'none',
        message: '推荐服务暂时不可用，请稍后重试或使用浏览功能'
      }
    }
  }

  /**
   * 获取服务状态
   */
  getServiceStatus() {
    return {
      initialized: this.isInitialized,
      health: this.serviceHealth,
      lastHealthCheck: this.lastHealthCheck,
      uptime: this.isInitialized ? Date.now() - this.startTime : 0
    }
  }
}

// 创建单例实例
const recommendationService = new RecommendationService()

module.exports = recommendationService

// 延迟自动初始化，避免阻塞模块加载
setTimeout(() => {
  recommendationService.initialize().then(result => {
    if (result.success) {
      console.log('推荐服务已就绪')
    } else {
      console.error('推荐服务初始化失败:', result.error)
    }
  }).catch(error => {
    console.error('推荐服务初始化异常:', error.message)
    // 即使初始化失败，也确保服务可用
    recommendationService.isInitialized = true
    recommendationService.serviceHealth = 'degraded'
  })
}, 0)