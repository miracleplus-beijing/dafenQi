/**
 * 音频分块预加载测试工具
 * 用于验证和调试分块预加载系统的功能和性能
 */

const audioPreloaderService = require('./audio-preloader.service.js')
const audioChunkManager = require('./audio-chunk-manager.service.js')
const lruCache = require('./lru-cache.service.js')
const smartPreloadController = require('./smart-preload-controller.service.js')

class AudioPreloadTester {
  constructor() {
    this.testResults = []
    this.isRunning = false
  }

  /**
   * 运行完整的测试套件
   * @returns {Promise<Object>} 测试结果
   */
  async runFullTestSuite() {
    if (this.isRunning) {
      console.warn('测试正在运行中...')
      return { success: false, error: '测试正在运行' }
    }

    this.isRunning = true
    console.log('🧪 开始音频分块预加载测试套件...')
    
    try {
      // 清理测试环境
      await this.setupTestEnvironment()
      
      // 运行各项测试
      const tests = [
        this.testChunkManager(),
        this.testLRUCache(),
        this.testSmartPreloadController(),
        this.testIntegratedPreloader(),
        this.testPerformanceMetrics()
      ]
      
      const results = await Promise.all(tests)
      
      // 汇总测试结果
      const summary = this.generateTestSummary(results)
      console.log('📊 测试套件完成:', summary)
      
      return summary
      
    } catch (error) {
      console.error('测试套件执行失败:', error)
      return { success: false, error: error.message }
    } finally {
      this.isRunning = false
    }
  }

  /**
   * 设置测试环境
   */
  async setupTestEnvironment() {
    console.log('🔧 设置测试环境...')
    
    // 清理所有缓存
    lruCache.clear()
    audioChunkManager.cleanExpiredInfo(0)
    
    // 重置统计信息
    this.testResults = []
  }

  /**
   * 测试音频分块管理器
   */
  async testChunkManager() {
    console.log('1️⃣ 测试音频分块管理器...')
    const testAudioUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/podcast-audios/2025.8/8.1.mp3'
    
    try {
      // 测试音频文件分析
      const audioInfo = await audioChunkManager.analyzeAudioFile(testAudioUrl, 1800) // 30分钟音频
      
      const tests = {
        audioAnalysis: audioInfo && audioInfo.totalChunks > 0,
        chunkCalculation: audioChunkManager.getChunkIndexByTime(testAudioUrl, 900) >= 0, // 15分钟位置
        byteRange: (() => {
          const range = audioChunkManager.getChunkByteRange(testAudioUrl, 0)
          return range.start === 0 && range.end > 0
        })(),
        preloadChunks: audioChunkManager.getPreloadChunks(testAudioUrl, 900, 3).length > 0
      }
      
      console.log('✅ 分块管理器测试结果:', tests)
      return { name: 'ChunkManager', success: Object.values(tests).every(Boolean), details: tests }
      
    } catch (error) {
      console.error('❌ 分块管理器测试失败:', error)
      return { name: 'ChunkManager', success: false, error: error.message }
    }
  }

  /**
   * 测试LRU缓存系统
   */
  async testLRUCache() {
    console.log('2️⃣ 测试LRU缓存系统...')
    
    try {
      const testUrl = 'test://audio1.mp3'
      const testData = new ArrayBuffer(1024) // 1KB测试数据
      
      const tests = {
        put: lruCache.put(testUrl, 0, testData),
        get: lruCache.get(testUrl, 0) !== null,
        has: lruCache.has(testUrl, 0),
        stats: (() => {
          const stats = lruCache.getStats()
          return stats.nodeCount === 1 && parseFloat(stats.currentSizeMB) > 0
        })(),
        eviction: (() => {
          // 填充缓存直到触发淘汰
          for (let i = 1; i < 50; i++) {
            lruCache.put(`test://audio${i}.mp3`, 0, new ArrayBuffer(300 * 1024)) // 300KB
          }
          const stats = lruCache.getStats()
          return stats.evictions > 0
        })()
      }
      
      console.log('✅ LRU缓存测试结果:', tests)
      return { name: 'LRUCache', success: Object.values(tests).every(Boolean), details: tests }
      
    } catch (error) {
      console.error('❌ LRU缓存测试失败:', error)
      return { name: 'LRUCache', success: false, error: error.message }
    }
  }

  /**
   * 测试智能预加载控制器
   */
  async testSmartPreloadController() {
    console.log('3️⃣ 测试智能预加载控制器...')
    
    try {
      const testUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/podcast-audios/2025.8/8.1.mp3'
      
      // 初始化控制器
      await smartPreloadController.initialize(testUrl, 1800)
      
      // 模拟播放进度更新
      smartPreloadController.onPlaybackProgress(60) // 1分钟位置
      
      // 等待一小段时间让异步操作完成
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const stats = smartPreloadController.getStats()
      
      const tests = {
        initialization: stats.currentAudio === testUrl,
        progressUpdate: stats.currentTime === 60,
        queueManagement: stats.queueSize >= 0,
        statsAvailable: stats.loadingStats && typeof stats.loadingStats.totalLoads === 'number'
      }
      
      console.log('✅ 智能预加载控制器测试结果:', tests)
      return { name: 'SmartController', success: Object.values(tests).every(Boolean), details: tests, stats }
      
    } catch (error) {
      console.error('❌ 智能预加载控制器测试失败:', error)
      return { name: 'SmartController', success: false, error: error.message }
    }
  }

  /**
   * 测试集成的音频预加载服务
   */
  async testIntegratedPreloader() {
    console.log('4️⃣ 测试集成音频预加载服务...')
    
    try {
      const testPodcasts = [
        {
          id: 'test1',
          title: '测试播客1',
          audio_url: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/podcast-audios/2025.8/8.1.mp3',
          duration: 1800
        },
        {
          id: 'test2', 
          title: '测试播客2',
          audio_url: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/podcast-audios/2025.8/8.2.mp3',
          duration: 2100
        }
      ]
      
      // 初始化服务
      audioPreloaderService.initialize(testPodcasts, 0)
      
      // 模拟播放进度
      audioPreloaderService.onProgressUpdate(0.5, 0, 900) // 50%进度，15分钟位置
      
      // 切换到下一个音频
      audioPreloaderService.updateCurrentIndex(1)
      
      // 等待异步操作
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const stats = audioPreloaderService.getStats()
      
      const tests = {
        initialization: stats.currentIndex === 1,
        chunkPreloadEnabled: stats.enableChunkPreload === true,
        hybridMode: stats.mode === 'hybrid',
        statsAvailable: stats.chunk && typeof stats.totalMemoryUsage === 'string',
        bufferProgress: (() => {
          const progress = audioPreloaderService.getBufferProgress(testPodcasts[0].audio_url, 900, 1800)
          return progress >= 0 && progress <= 100
        })()
      }
      
      console.log('✅ 集成服务测试结果:', tests)
      return { name: 'IntegratedService', success: Object.values(tests).every(Boolean), details: tests, stats }
      
    } catch (error) {
      console.error('❌ 集成服务测试失败:', error)
      return { name: 'IntegratedService', success: false, error: error.message }
    }
  }

  /**
   * 测试性能指标
   */
  async testPerformanceMetrics() {
    console.log('5️⃣ 测试性能指标...')
    
    try {
      // 收集各组件的性能统计
      const chunkStats = audioChunkManager.getStats()
      const cacheStats = lruCache.getStats()
      const controllerStats = smartPreloadController.getStats()
      const serviceStats = audioPreloaderService.getStats()
      
      // 性能指标阈值检查
      const tests = {
        memoryUsage: parseFloat(cacheStats.currentSizeMB) <= 15, // 内存使用不超过15MB
        cacheHitRate: cacheStats.hitRate === '0.00%' || parseFloat(cacheStats.hitRate) >= 0, // 命中率有效
        networkAdaptive: controllerStats.adaptiveConfig && controllerStats.adaptiveConfig.networkSpeed !== 'unknown',
        loadingPerformance: controllerStats.loadingStats.averageLoadTime < 5000 || controllerStats.loadingStats.totalLoads === 0,
        chunkSizeOptimal: chunkStats.currentChunkSizeKB >= 200 && chunkStats.currentChunkSizeKB <= 400
      }
      
      const performance = {
        memoryUsage: `${cacheStats.currentSizeMB}MB`,
        cacheHitRate: cacheStats.hitRate,
        avgLoadTime: `${controllerStats.loadingStats.averageLoadTime.toFixed(0)}ms`,
        chunkSize: `${chunkStats.currentChunkSizeKB}KB`,
        networkType: controllerStats.adaptiveConfig.networkSpeed
      }
      
      console.log('✅ 性能指标测试结果:', tests)
      console.log('📈 当前性能指标:', performance)
      
      return { name: 'Performance', success: Object.values(tests).every(Boolean), details: tests, performance }
      
    } catch (error) {
      console.error('❌ 性能指标测试失败:', error)
      return { name: 'Performance', success: false, error: error.message }
    }
  }

  /**
   * 生成测试总结
   * @param {Array} results - 测试结果数组
   * @returns {Object} 测试总结
   */
  generateTestSummary(results) {
    const totalTests = results.length
    const passedTests = results.filter(r => r.success).length
    const failedTests = totalTests - passedTests
    
    const summary = {
      success: failedTests === 0,
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      passRate: `${(passedTests / totalTests * 100).toFixed(1)}%`,
      results: results,
      timestamp: new Date().toISOString()
    }
    
    // 输出详细报告
    console.log('\n📊 音频分块预加载测试报告')
    console.log('='.repeat(50))
    console.log(`总测试数: ${totalTests}`)
    console.log(`通过: ${passedTests} ✅`)
    console.log(`失败: ${failedTests} ❌`) 
    console.log(`通过率: ${summary.passRate}`)
    console.log('='.repeat(50))
    
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌'
      console.log(`${index + 1}. ${result.name}: ${status}`)
      if (!result.success && result.error) {
        console.log(`   错误: ${result.error}`)
      }
    })
    
    if (summary.success) {
      console.log('\n🎉 所有测试通过！分块预加载系统运行正常。')
      this.logOptimizationSuggestions()
    } else {
      console.log('\n⚠️  部分测试失败，请检查相关组件。')
    }
    
    return summary
  }

  /**
   * 输出优化建议
   */
  logOptimizationSuggestions() {
    console.log('\n💡 优化建议:')
    console.log('1. 根据实际使用情况调整缓存大小限制')
    console.log('2. 监控网络状况，动态调整分块大小') 
    console.log('3. 根据用户行为模式优化预加载范围')
    console.log('4. 定期清理过期缓存以释放内存')
    console.log('5. 在电量较低时降低预加载活跃度')
  }

  /**
   * 快速健康检查
   * @returns {Object} 健康状态
   */
  quickHealthCheck() {
    const cacheStats = lruCache.getStats()
    const chunkStats = audioChunkManager.getStats()
    
    const health = {
      memoryOK: parseFloat(cacheStats.currentSizeMB) <= 20,
      cacheActive: cacheStats.nodeCount >= 0,
      networkAdaptive: chunkStats.networkType !== 'unknown',
      timestamp: Date.now()
    }
    
    const isHealthy = Object.values(health).every(v => typeof v === 'boolean' ? v : true)
    
    return {
      healthy: isHealthy,
      ...health,
      summary: isHealthy ? '系统运行正常' : '发现潜在问题'
    }
  }
}

// 创建并导出测试工具实例
const audioPreloadTester = new AudioPreloadTester()
module.exports = audioPreloadTester