/**
 * 音频智能分块预加载服务
 * 纯分块预加载实现，不再支持传统完整文件预加载
 */

// 导入分块预加载组件
const smartPreloadController = require('./smart-preload-controller.service.js')
const lruCache = require('./lru-cache.service.js')
const audioChunkManager = require('./audio-chunk-manager.service.js')

class AudioPreloaderService {
  constructor() {
    // 当前播放状态
    this.podcastList = []
    this.currentIndex = 0
    this.currentPlayingAudio = null
    
    // 分块预加载配置
    this.preloadRange = 3           // 预加载范围(块数量)
    this.preloadTriggerProgress = 0.7 // 播放到70%时触发下一音频预加载
    this.isPreloading = false
    
    // 播放进度监控
    this.playbackProgressInterval = null
    this.lastProgressUpdate = 0
    
    console.log('音频智能分块预加载服务初始化 - 纯分块模式')
  }

  /**
   * 初始化预加载服务
   * @param {Array} podcastList - 播客列表
   * @param {number} currentIndex - 当前播放索引
   */
  async initialize(podcastList, currentIndex = 0) {
    this.podcastList = podcastList
    this.currentIndex = currentIndex
    
    console.log('音频分块预加载服务初始化:', {
      totalPodcasts: podcastList.length,
      currentIndex,
      preloadRange: this.preloadRange
    })
    
    // 初始化当前音频的分块预加载
    if (podcastList[currentIndex]) {
      const currentPodcast = podcastList[currentIndex]
      if (currentPodcast && currentPodcast.audio_url) {
        this.currentPlayingAudio = currentPodcast
        console.log('初始化音频分块预加载:', currentPodcast.title)
        
        try {
          await smartPreloadController.initialize(currentPodcast.audio_url, currentPodcast.duration || 0)
        } catch (error) {
          console.error('初始化分块预加载失败:', error)
        }
      }
    }
  }

  /**
   * 获取预加载的音频实例 (分块预加载版本)
   * 检查是否有分块预加载数据可用
   * @param {string} audioUrl - 音频URL
   * @returns {Object|null} 音频上下文或null
   */
  getPreloadedAudio(audioUrl) {
    // 检查是否有分块预加载数据
    if (this.hasChunkData(audioUrl)) {
      console.log('🚀 使用分块预加载音频:', audioUrl)
      return this.createAudioContextWithChunks(audioUrl)
    }
    
    console.log('📱 音频未预加载，使用标准加载:', audioUrl)
    return null
  }
  
  /**
   * 检查是否有分块预加载数据
   * @param {string} audioUrl - 音频URL
   * @returns {boolean} 是否有缓存的分块数据
   */
  hasChunkData(audioUrl) {
    // 检查是否至少有第一个块（播放起始块）
    return lruCache.has(audioUrl, 0)
  }
  
  /**
   * 创建带分块数据的音频上下文
   * @param {string} audioUrl - 音频URL
   * @returns {Object} 音频上下文对象
   */
  createAudioContextWithChunks(audioUrl) {
    const audioContext = wx.createInnerAudioContext()
    audioContext.src = audioUrl
    
    // 添加分块预加载标记
    audioContext._hasChunkPreload = true
    audioContext._preloadReady = true
    
    return audioContext
  }

  /**
   * 触发进度预加载 (分块预加载版本)
   * @param {number} currentProgress - 当前播放进度 (0-1)
   * @param {number} currentIndex - 当前索引
   * @param {number} currentTime - 当前播放时间(秒)
   */
  onProgressUpdate(currentProgress, currentIndex, currentTime = 0) {
    // 实时更新分块预加载控制器
    if (this.currentPlayingAudio) {
      smartPreloadController.onPlaybackProgress(currentTime)
    }
    
    // 当播放到70%时，开始预加载下一个音频
    if (currentProgress >= this.preloadTriggerProgress) {
      this.triggerNextAudioPreload(currentIndex)
    }
    
    this.lastProgressUpdate = Date.now()
  }

  /**
   * 触发下一个音频的预加载
   * @param {number} currentIndex - 当前播放索引
   */
  async triggerNextAudioPreload(currentIndex) {
    if (!this.podcastList || this.isPreloading) return
    
    const nextIndex = currentIndex + 1
    if (nextIndex >= this.podcastList.length) return
    
    const nextPodcast = this.podcastList[nextIndex]
    if (!nextPodcast) return
    
    // 检查下一个音频是否已有分块数据
    if (this.hasChunkData(nextPodcast.audio_url)) {
      console.log('下一个音频已有分块预加载数据:', nextPodcast.title)
      return
    }
    
    console.log('🔮 开始预加载下一个音频的分块数据:', nextPodcast.title)
    
    try {
      this.isPreloading = true
      
      // 分析下一个音频文件并开始预加载初始块
      await audioChunkManager.analyzeAudioFile(nextPodcast.audio_url, nextPodcast.duration || 0)
      
      // 预加载下一个音频的前几个块
      const initialChunks = audioChunkManager.getPreloadChunks(nextPodcast.audio_url, 0, 2) // 预加载前2块
      
      for (const chunkIndex of initialChunks) {
        smartPreloadController.enqueuePreload(nextPodcast.audio_url, chunkIndex, 'low') // 低优先级
      }
      
    } catch (error) {
      console.warn('下一个音频预加载失败:', error)
    } finally {
      this.isPreloading = false
    }
  }

  /**
   * 更新当前播放位置 (分块预加载版本)
   * @param {number} newIndex - 新的播放索引
   */
  async updateCurrentIndex(newIndex) {
    const oldIndex = this.currentIndex
    this.currentIndex = newIndex
    
    console.log(`切换音频: ${oldIndex} -> ${newIndex}`)
    
    // 切换到新音频的分块预加载
    if (this.podcastList && this.podcastList[newIndex]) {
      const newPodcast = this.podcastList[newIndex]
      if (newPodcast && newPodcast.audio_url) {
        // 如果切换到不同音频，更新智能预加载控制器
        if (!this.currentPlayingAudio || this.currentPlayingAudio.audio_url !== newPodcast.audio_url) {
          this.currentPlayingAudio = newPodcast
          console.log('切换到新音频，启用分块预加载:', newPodcast.title)
          
          try {
            await smartPreloadController.switchAudio(newPodcast.audio_url, newPodcast.duration || 0)
          } catch (error) {
            console.error('切换音频分块预加载失败:', error)
          }
        }
      }
    }
    
    // 清理距离太远的音频缓存（保持内存使用合理）
    this.cleanDistantAudioCache(newIndex)
  }

  /**
   * 清理距离当前位置过远的音频缓存
   * @param {number} currentIndex - 当前索引
   */
  cleanDistantAudioCache(currentIndex) {
    if (!this.podcastList) return
    
    const maxDistance = 3 // 最大保留距离
    
    // 获取所有缓存的音频URL
    const allCacheKeys = lruCache.getAllKeys()
    const audioUrls = [...new Set(allCacheKeys.map(item => item.audioUrl))]
    
    audioUrls.forEach(audioUrl => {
      // 找到这个音频在播客列表中的位置
      const audioIndex = this.podcastList.findIndex(podcast => podcast.audio_url === audioUrl)
      
      if (audioIndex >= 0) {
        const distance = Math.abs(audioIndex - currentIndex)
        
        // 如果距离超过最大距离，清理这个音频的缓存
        if (distance > maxDistance) {
          const removedCount = lruCache.removeAudio(audioUrl)
          if (removedCount > 0) {
            console.log(`🧹 清理过远音频缓存: 索引${audioIndex}, 距离${distance}, 清理${removedCount}个块`)
          }
        }
      }
    })
  }

  /**
   * 获取当前音频的缓冲进度 (分块预加载版本)
   * @param {string} audioUrl - 音频URL
   * @param {number} currentTime - 当前播放时间
   * @param {number} duration - 音频总时长
   * @param {Object} audioContext - 音频上下文对象
   * @returns {number} 缓冲进度百分比 (0-100)
   */
  getBufferProgress(audioUrl, currentTime = 0, duration = 0, audioContext = null) {
    if (!duration) return 0
    
    // 使用分块预加载数据计算精确缓冲进度
    const chunkBufferProgress = this.calculateChunkBufferProgress(audioUrl, currentTime, duration)
    if (chunkBufferProgress >= 0) {
      return chunkBufferProgress
    }
    
    // 如果无法使用分块数据，使用微信音频上下文的buffered属性
    if (audioContext && typeof audioContext.buffered === 'number') {
      const bufferedSeconds = audioContext.buffered
      const realBufferProgress = (bufferedSeconds / duration) * 100
      return Math.min(100, Math.max(0, realBufferProgress))
    }
    
    // 最后的备选方案：基于播放行为的智能估算
    const playedRatio = currentTime / duration
    let estimatedBufferAhead = 30 // 基础30秒缓冲
    
    if (playedRatio < 0.1) {
      estimatedBufferAhead = 20 // 开始阶段保守估算
    } else if (playedRatio > 0.8) {
      estimatedBufferAhead = duration - currentTime + 5 // 接近结尾
    }
    
    const estimatedBufferTime = Math.min(duration, currentTime + estimatedBufferAhead)
    const estimatedProgress = (estimatedBufferTime / duration) * 100
    
    return Math.min(100, Math.max(0, estimatedProgress))
  }
  
  /**
   * 基于分块预加载数据计算缓冲进度
   * @param {string} audioUrl - 音频URL
   * @param {number} currentTime - 当前播放时间(秒)
   * @param {number} duration - 音频总时长(秒)
   * @returns {number} 缓冲进度百分比，-1表示无法计算
   */
  calculateChunkBufferProgress(audioUrl, currentTime, duration) {
    try {
      // 获取音频文件信息
      const audioInfo = audioChunkManager.audioFileInfo.get(audioUrl)
      if (!audioInfo) {
        return -1 // 无法获取文件信息
      }
      
      const { totalChunks, chunkSize, fileSize } = audioInfo
      let bufferedBytes = 0
      
      // 统计已缓存的字节数
      for (let i = 0; i < totalChunks; i++) {
        if (lruCache.has(audioUrl, i)) {
          // 计算这个块的实际大小
          const { start, end } = audioChunkManager.getChunkByteRange(audioUrl, i)
          bufferedBytes += (end - start + 1)
        }
      }
      
      // 计算缓冲百分比
      const bufferPercentage = (bufferedBytes / fileSize) * 100
      
      return Math.min(100, Math.max(0, bufferPercentage))
      
    } catch (error) {
      console.warn('计算分块缓冲进度失败:', error)
      return -1
    }
  }

  /**
   * 获取分块缓存分布信息 (新增)
   * 用于进度条可视化显示
   * @param {string} audioUrl - 音频URL
   * @returns {Array} 缓存块分布数组
   */
  getChunkDistribution(audioUrl) {
    try {
      const audioInfo = audioChunkManager.audioFileInfo.get(audioUrl)
      if (!audioInfo) {
        return []
      }
      
      const { totalChunks } = audioInfo
      const distribution = []
      
      for (let i = 0; i < totalChunks; i++) {
        distribution.push({
          index: i,
          cached: lruCache.has(audioUrl, i),
          loading: smartPreloadController.isChunkLoading(audioUrl, i)
        })
      }
      
      return distribution
      
    } catch (error) {
      console.warn('获取分块分布失败:', error)
      return []
    }
  }

  /**
   * 暂停分块预加载
   */
  pausePreload() {
    smartPreloadController.pausePreload()
    console.log('已暂停分块预加载')
  }
  
  /**
   * 恢复分块预加载
   */
  resumePreload() {
    smartPreloadController.resumePreload()
    console.log('已恢复分块预加载')
  }

  /**
   * 获取预加载统计信息 (分块预加载版本)
   * @returns {Object} 统计信息
   */
  getStats() {
    const controllerStats = smartPreloadController.getStats()
    const cacheStats = lruCache.getStats()
    const chunkStats = audioChunkManager.getStats()
    
    return {
      mode: 'chunk-only',
      currentIndex: this.currentIndex,
      currentPlayingAudio: this.currentPlayingAudio ? this.currentPlayingAudio.title : null,
      isPreloading: this.isPreloading,
      
      // 缓存信息
      totalMemoryUsage: `${cacheStats.currentSizeMB}MB`,
      cacheHitRate: cacheStats.hitRate,
      cacheNodeCount: cacheStats.nodeCount,
      
      // 网络和性能
      networkAdaptive: controllerStats.adaptiveConfig,
      loadingStats: controllerStats.loadingStats,
      
      // 分块信息
      chunkStats: chunkStats,
      
      // 控制器状态
      activeLoads: controllerStats.activeLoads,
      queueSize: controllerStats.queueSize,
      preloadRange: this.preloadRange
    }
  }

  /**
   * 清理过期缓存 (兼容旧版API)
   */
  cleanExpiredCache() {
    console.log('🧹 清理过期缓存 (分块预加载版本)')
    // 使用LRU缓存的自动清理机制
    lruCache.cleanup()
    // 清理过期的音频文件信息
    audioChunkManager.cleanExpiredInfo(5 * 60 * 1000) // 清理5分钟前的信息
  }

  /**
   * 清理距离当前位置过远的预加载内容 (兼容旧版API)
   * @param {number} currentIndex - 当前播放索引
   */
  cleanDistantPreloads(currentIndex) {
    console.log('🧹 清理过远预加载内容:', currentIndex)
    this.cleanDistantAudioCache(currentIndex)
  }

  /**
   * 销毁所有预加载资源
   */
  destroyAll() {
    console.log('🗑️ 销毁所有分块预加载资源')

    // 清理分块预加载资源
    smartPreloadController.destroy()
    lruCache.clear()
    audioChunkManager.cleanExpiredInfo(0) // 立即清理所有缓存

    // 重置状态
    this.currentPlayingAudio = null
    this.isPreloading = false

    if (this.playbackProgressInterval) {
      clearInterval(this.playbackProgressInterval)
      this.playbackProgressInterval = null
    }

    console.log('✅ 所有分块预加载资源已清理完成')
  }
}

// 创建并导出音频预加载服务实例
const audioPreloaderService = new AudioPreloaderService()
module.exports = audioPreloaderService