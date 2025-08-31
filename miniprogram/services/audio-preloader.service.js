/**
 * 音频智能预加载服务
 * 提供音频预加载、缓存管理和播放优化
 */

class AudioPreloaderService {
  constructor() {
    this.preloadedAudios = new Map() // 预加载的音频实例
    this.downloadQueue = new Map()   // 下载队列
    this.cacheManager = new Map()    // 缓存管理器
    this.maxPreloadCount = 3         // 最大预加载数量
    this.preloadTriggerProgress = 0.7 // 播放到70%时触发预加载
    this.isPreloading = false
  }

  /**
   * 初始化预加载服务
   * @param {Array} podcastList - 播客列表
   * @param {number} currentIndex - 当前播放索引
   */
  initialize(podcastList, currentIndex = 0) {
    this.podcastList = podcastList
    this.currentIndex = currentIndex
    
    console.log('音频预加载服务初始化:', {
      totalPodcasts: podcastList.length,
      currentIndex,
      maxPreload: this.maxPreloadCount
    })
    
    // 立即预加载当前和相邻的音频
    this.preloadAdjacent()
  }

  /**
   * 预加载相邻音频
   */
  async preloadAdjacent() {
    if (this.isPreloading || !this.podcastList) return
    
    this.isPreloading = true
    const { currentIndex, podcastList } = this
    
    const toPreload = []
    
    // 预加载下一个音频（优先级最高）
    if (currentIndex + 1 < podcastList.length) {
      toPreload.push(currentIndex + 1)
    }
    
    // 预加载上一个音频
    if (currentIndex - 1 >= 0) {
      toPreload.push(currentIndex - 1)
    }
    
    // 预加载下下个音频
    if (currentIndex + 2 < podcastList.length) {
      toPreload.push(currentIndex + 2)
    }
    
    console.log('开始预加载音频:', toPreload.map(i => podcastList[i]?.title))
    
    // 并行预加载
    const preloadPromises = toPreload.map(index => 
      this.preloadAudio(podcastList[index], index)
    )
    
    try {
      await Promise.all(preloadPromises)
      console.log('✅ 相邻音频预加载完成')
    } catch (error) {
      console.warn('部分音频预加载失败:', error)
    } finally {
      this.isPreloading = false
    }
  }

  /**
   * 预加载单个音频
   * @param {Object} podcast - 播客对象
   * @param {number} index - 索引
   */
  async preloadAudio(podcast, index) {
    if (!podcast || !podcast.audio_url) return
    
    const audioUrl = podcast.audio_url
    
    // 检查是否已经预加载
    if (this.preloadedAudios.has(audioUrl)) {
      console.log('音频已预加载:', podcast.title)
      return this.preloadedAudios.get(audioUrl)
    }
    
    return new Promise((resolve, reject) => {
      console.log('开始预加载音频:', podcast.title)
      
      // 创建音频实例进行预加载
      const audioContext = wx.createInnerAudioContext()
      
      // 设置音频源
      audioContext.src = audioUrl
      
      // 监听加载事件
      audioContext.onCanplay(() => {
        console.log('✅ 音频预加载完成:', podcast.title)
        
        // 缓存音频实例
        this.preloadedAudios.set(audioUrl, {
          audioContext,
          podcast,
          index,
          preloadedAt: Date.now()
        })
        
        // 清理过期缓存
        this.cleanExpiredCache()
        
        resolve(audioContext)
      })
      
      audioContext.onError((error) => {
        console.warn('❌ 音频预加载失败:', podcast.title, error)
        audioContext.destroy()
        reject(error)
      })
      
      // 设置超时
      setTimeout(() => {
        if (!this.preloadedAudios.has(audioUrl)) {
          console.warn('⏰ 音频预加载超时:', podcast.title)
          audioContext.destroy()
          reject(new Error('预加载超时'))
        }
      }, 10000) // 10秒超时
    })
  }

  /**
   * 获取预加载的音频实例
   * @param {string} audioUrl - 音频URL
   * @returns {Object|null} 预加载的音频数据
   */
  getPreloadedAudio(audioUrl) {
    const cached = this.preloadedAudios.get(audioUrl)
    
    if (cached) {
      console.log('🚀 使用预加载音频:', cached.podcast.title)
      
      // 从缓存中移除（避免重复使用）
      this.preloadedAudios.delete(audioUrl)
      
      return cached.audioContext
    }
    
    console.log('📱 音频未预加载，使用标准加载:', audioUrl)
    return null
  }

  /**
   * 触发进度预加载
   * @param {number} currentProgress - 当前播放进度 (0-1)
   * @param {number} currentIndex - 当前索引
   */
  onProgressUpdate(currentProgress, currentIndex) {
    // 当播放到70%时，预加载下一个音频
    if (currentProgress >= this.preloadTriggerProgress) {
      this.triggerNextPreload(currentIndex)
    }
  }

  /**
   * 触发下一个音频预加载
   * @param {number} currentIndex - 当前播放索引
   */
  async triggerNextPreload(currentIndex) {
    if (!this.podcastList || this.isPreloading) return
    
    const nextIndex = currentIndex + 1
    if (nextIndex >= this.podcastList.length) return
    
    const nextPodcast = this.podcastList[nextIndex]
    if (!nextPodcast) return
    
    // 检查是否已预加载
    if (this.preloadedAudios.has(nextPodcast.audio_url)) return
    
    console.log('🔮 触发下一个音频预加载:', nextPodcast.title)
    
    try {
      await this.preloadAudio(nextPodcast, nextIndex)
    } catch (error) {
      console.warn('下一个音频预加载失败:', error)
    }
  }

  /**
   * 更新当前播放位置
   * @param {number} newIndex - 新的播放索引
   */
  updateCurrentIndex(newIndex) {
    this.currentIndex = newIndex
    
    // 清理过远的预加载音频
    this.cleanDistantPreloads(newIndex)
    
    // 预加载新的相邻音频
    setTimeout(() => {
      this.preloadAdjacent()
    }, 1000) // 延迟1秒避免干扰当前播放
  }

  /**
   * 清理距离当前位置过远的预加载音频
   * @param {number} currentIndex - 当前索引
   */
  cleanDistantPreloads(currentIndex) {
    for (const [audioUrl, cached] of this.preloadedAudios.entries()) {
      const distance = Math.abs(cached.index - currentIndex)
      
      // 清理距离超过5的预加载音频
      if (distance > 5) {
        console.log('🧹 清理过远预加载音频:', cached.podcast.title)
        cached.audioContext.destroy()
        this.preloadedAudios.delete(audioUrl)
      }
    }
  }

  /**
   * 清理过期缓存
   */
  cleanExpiredCache() {
    const now = Date.now()
    const expireTime = 10 * 60 * 1000 // 10分钟过期
    
    for (const [audioUrl, cached] of this.preloadedAudios.entries()) {
      if (now - cached.preloadedAt > expireTime) {
        console.log('🕐 清理过期预加载音频:', cached.podcast.title)
        cached.audioContext.destroy()
        this.preloadedAudios.delete(audioUrl)
      }
    }
    
    // 限制最大缓存数量
    if (this.preloadedAudios.size > this.maxPreloadCount) {
      // 删除最旧的预加载音频
      const oldestKey = this.preloadedAudios.keys().next().value
      const oldest = this.preloadedAudios.get(oldestKey)
      
      console.log('📦 缓存已满，清理最旧音频:', oldest.podcast.title)
      oldest.audioContext.destroy()
      this.preloadedAudios.delete(oldestKey)
    }
  }

  /**
   * 销毁所有预加载音频
   */
  destroyAll() {
    console.log('🗑️ 销毁所有预加载音频')
    
    for (const [audioUrl, cached] of this.preloadedAudios.entries()) {
      cached.audioContext.destroy()
    }
    
    this.preloadedAudios.clear()
    this.downloadQueue.clear()
    this.cacheManager.clear()
  }

  /**
   * 获取预加载统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      preloadedCount: this.preloadedAudios.size,
      maxPreloadCount: this.maxPreloadCount,
      currentIndex: this.currentIndex,
      isPreloading: this.isPreloading,
      preloadedTitles: Array.from(this.preloadedAudios.values()).map(cached => cached.podcast.title)
    }
  }
}

// 创建并导出音频预加载服务实例
const audioPreloaderService = new AudioPreloaderService()
module.exports = audioPreloaderService