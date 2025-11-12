/**
 * 智能预加载控制器
 * 负责监控播放位置、触发预加载和管理加载优先级
 */

const audioChunkManager = require('./audio-chunk-manager.service.js');
const lruCache = require('./lru-cache.service.js');

class SmartPreloadController {
  constructor() {
    // 预加载配置
    this.preloadRange = 3; // 预加载范围(块数量)
    this.triggerThreshold = 0.7; // 触发阈值(当前块播放70%时触发下一块预加载)
    this.maxConcurrentLoads = 3; // 最大并发加载数

    // 状态管理
    this.currentAudioUrl = null;
    this.currentTime = 0;
    this.isPreloading = false;
    this.activeLoads = new Set(); // 正在加载的块标识
    this.preloadQueue = []; // 预加载队列

    // 性能监控
    this.loadingStats = {
      totalLoads: 0,
      successfulLoads: 0,
      failedLoads: 0,
      averageLoadTime: 0,
      totalLoadTime: 0,
    };

    // 自适应参数
    this.adaptiveConfig = {
      networkSpeed: 'unknown', // fast, medium, slow
      memoryPressure: 1, // 1-5级别
      batteryLevel: 100, // 电量百分比
      enableAdaptive: true, // 是否启用自适应优化
    };

    // 初始化监控
    wx.onMemoryWarning(res => {
      console.warn('内存警告:', res.level);
    });
  }

  /**
   * 初始化音频预加载
   * @param {string} audioUrl - 音频URL
   * @param {number} duration - 音频时长
   */
  async initialize(audioUrl, duration) {
    console.log('初始化智能预加载控制器:', audioUrl);

    this.currentAudioUrl = audioUrl;
    this.currentTime = 0;

    try {
      // 分析音频文件
      await audioChunkManager.analyzeAudioFile(audioUrl, duration);

      // 开始预加载初始块
      this.startInitialPreload();
    } catch (error) {
      console.error('初始化预加载失败:', error);
    }
  }

  /**
   * 开始初始预加载
   */
  async startInitialPreload() {
    if (!this.currentAudioUrl) return;

    // 获取初始预加载块列表
    const initialChunks = audioChunkManager.getPreloadChunks(
      this.currentAudioUrl,
      0,
      this.preloadRange
    );

    console.log('开始初始预加载，块列表:', initialChunks);

    // 按优先级加载(当前播放块优先级最高)
    for (const chunkIndex of initialChunks) {
      this.enqueuePreload(
        this.currentAudioUrl,
        chunkIndex,
        chunkIndex === 0 ? 'high' : 'medium'
      );
    }

    // 开始处理预加载队列
    this.processPreloadQueue();
  }

  /**
   * 更新播放位置并触发智能预加载
   * @param {number} currentTime - 当前播放时间(秒)
   */
  onPlaybackProgress(currentTime) {
    this.currentTime = currentTime;

    if (!this.currentAudioUrl) return;

    // 获取当前播放的块索引
    const currentChunkIndex = audioChunkManager.getChunkIndexByTime(
      this.currentAudioUrl,
      currentTime
    );

    // 检查是否需要触发预加载
    this.checkPreloadTrigger(currentChunkIndex, currentTime);
  }

  /**
   * 检查预加载触发条件
   * @param {number} currentChunkIndex - 当前块索引
   * @param {number} currentTime - 当前时间
   */
  checkPreloadTrigger(currentChunkIndex, currentTime) {
    // 获取需要预加载的块列表
    const requiredChunks = audioChunkManager.getPreloadChunks(
      this.currentAudioUrl,
      currentTime,
      this.preloadRange
    );

    // 检查哪些块还未缓存
    const missingChunks = requiredChunks.filter(
      chunkIndex =>
        !lruCache.has(this.currentAudioUrl, chunkIndex) &&
        !this.isChunkLoading(this.currentAudioUrl, chunkIndex)
    );

    if (missingChunks.length > 0) {
      console.log('触发预加载，缺失块:', missingChunks);

      // 根据播放方向设置优先级
      missingChunks.forEach(chunkIndex => {
        let priority = 'medium';
        if (chunkIndex === currentChunkIndex) priority = 'high';
        else if (chunkIndex === currentChunkIndex + 1) priority = 'high';
        else if (chunkIndex > currentChunkIndex) priority = 'medium';
        else priority = 'low'; // 后退方向的块优先级较低

        this.enqueuePreload(this.currentAudioUrl, chunkIndex, priority);
      });

      this.processPreloadQueue();
    }
  }

  /**
   * 检查块是否正在加载
   * @param {string} audioUrl - 音频URL
   * @param {number} chunkIndex - 块索引
   * @returns {boolean} 是否正在加载
   */
  isChunkLoading(audioUrl, chunkIndex) {
    const loadId = `${audioUrl}#${chunkIndex}`;
    return this.activeLoads.has(loadId);
  }

  /**
   * 将预加载任务加入队列
   * @param {string} audioUrl - 音频URL
   * @param {number} chunkIndex - 块索引
   * @param {string} priority - 优先级 high/medium/low
   */
  enqueuePreload(audioUrl, chunkIndex, priority = 'medium') {
    // 检查是否已经在队列中
    const exists = this.preloadQueue.some(
      task => task.audioUrl === audioUrl && task.chunkIndex === chunkIndex
    );

    if (
      !exists &&
      !this.isChunkLoading(audioUrl, chunkIndex) &&
      !lruCache.has(audioUrl, chunkIndex)
    ) {
      const task = {
        audioUrl,
        chunkIndex,
        priority,
        addedAt: Date.now(),
      };

      this.preloadQueue.push(task);

      // 按优先级排序队列
      this.preloadQueue.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff =
          priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.addedAt - b.addedAt; // 相同优先级按添加时间排序
      });

      console.log(`加入预加载队列: chunk ${chunkIndex}, 优先级: ${priority}`);
    }
  }

  /**
   * 处理预加载队列
   */
  async processPreloadQueue() {
    if (this.isPreloading) return;

    this.isPreloading = true;

    while (
      this.preloadQueue.length > 0 &&
      this.activeLoads.size < this.maxConcurrentLoads
    ) {
      const task = this.preloadQueue.shift();

      // 再次检查是否已缓存(可能在队列等待期间已加载)
      if (lruCache.has(task.audioUrl, task.chunkIndex)) {
        continue;
      }

      // 开始加载任务
      await this.startChunkLoad(task);
    }

    this.isPreloading = false;
  }

  /**
   * 开始加载数据块
   * @param {Object} task - 加载任务
   */
  async startChunkLoad(task) {
    const { audioUrl, chunkIndex } = task;
    const loadId = `${audioUrl}#${chunkIndex}`;
    const startTime = Date.now();

    this.activeLoads.add(loadId);
    this.loadingStats.totalLoads++;

    try {
      console.log(`开始加载块: ${audioUrl} chunk ${chunkIndex}`);

      // 获取块的字节范围
      const { start, end } = audioChunkManager.getChunkByteRange(
        audioUrl,
        chunkIndex
      );

      // 发起Range请求
      const chunkData = await this.loadChunkData(audioUrl, start, end);

      if (chunkData && chunkData.byteLength > 0) {
        // 存入缓存
        const success = lruCache.put(audioUrl, chunkIndex, chunkData);

        if (success) {
          this.loadingStats.successfulLoads++;
          const loadTime = Date.now() - startTime;
          this.updateLoadTimeStats(loadTime);

          console.log(
            `块加载成功: chunk ${chunkIndex}, 大小: ${(chunkData.byteLength / 1024).toFixed(1)}KB, 耗时: ${loadTime}ms`
          );
        } else {
          console.warn(`块缓存失败: chunk ${chunkIndex}`);
          this.loadingStats.failedLoads++;
        }
      } else {
        console.warn(`块数据为空: chunk ${chunkIndex}`);
        this.loadingStats.failedLoads++;
      }
    } catch (error) {
      console.error(`块加载失败: chunk ${chunkIndex}`, error);
      this.loadingStats.failedLoads++;
    } finally {
      this.activeLoads.delete(loadId);

      // 继续处理队列
      setTimeout(() => this.processPreloadQueue(), 10);
    }
  }

  /**
   * 加载数据块数据
   * @param {string} url - 音频URL
   * @param {number} start - 开始字节
   * @param {number} end - 结束字节
   * @returns {Promise<ArrayBuffer>} 数据块
   */
  loadChunkData(url, start, end) {
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: 'GET',
        header: {
          Range: `bytes=${start}-${end}`,
        },
        responseType: 'arraybuffer',
        success: res => {
          if (res.statusCode === 206 || res.statusCode === 200) {
            // Partial Content 或 OK
            resolve(res.data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        },
        fail: error => {
          reject(error);
        },
      });
    });
  }

  /**
   * 更新加载时间统计
   * @param {number} loadTime - 加载时间
   */
  updateLoadTimeStats(loadTime) {
    this.loadingStats.totalLoadTime += loadTime;
    this.loadingStats.averageLoadTime =
      this.loadingStats.totalLoadTime / this.loadingStats.successfulLoads;
  }

  /**
   * 切换到新音频
   * @param {string} newAudioUrl - 新音频URL
   * @param {number} duration - 音频时长
   */
  async switchAudio(newAudioUrl, duration) {
    console.log('切换音频:', newAudioUrl);

    // 清理旧音频的预加载队列
    this.preloadQueue = this.preloadQueue.filter(
      task => task.audioUrl === newAudioUrl
    );

    // 可选：清理旧音频的缓存(保留一定数量以支持快速切换回来)
    if (this.currentAudioUrl && this.currentAudioUrl !== newAudioUrl) {
      // 保留最近播放的音频块，清理其他
      setTimeout(() => {
        const oldAudioCacheCount = this.countAudioCache(this.currentAudioUrl);
        if (oldAudioCacheCount > 5) {
          // 如果超过5块，清理部分
          lruCache.removeAudio(this.currentAudioUrl);
        }
      }, 5000); // 5秒后清理
    }

    // 初始化新音频
    await this.initialize(newAudioUrl, duration);
  }

  /**
   * 统计指定音频的缓存块数量
   * @param {string} audioUrl - 音频URL
   * @returns {number} 缓存块数量
   */
  countAudioCache(audioUrl) {
    const keys = lruCache.getAllKeys();
    return keys.filter(item => item.audioUrl === audioUrl).length;
  }

  /**
   * 暂停预加载
   */
  pausePreload() {
    this.preloadQueue.length = 0; // 清空队列
    console.log('已暂停预加载');
  }

  /**
   * 恢复预加载
   */
  resumePreload() {
    if (this.currentAudioUrl) {
      this.checkPreloadTrigger(
        audioChunkManager.getChunkIndexByTime(
          this.currentAudioUrl,
          this.currentTime
        ),
        this.currentTime
      );
    }
    console.log('已恢复预加载');
  }

  /**
   * 获取控制器统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.loadingStats,
      currentAudio: this.currentAudioUrl,
      currentTime: this.currentTime,
      preloadRange: this.preloadRange,
      activeLoads: this.activeLoads.size,
      queueSize: this.preloadQueue.length,
      maxConcurrentLoads: this.maxConcurrentLoads,
      adaptiveConfig: this.adaptiveConfig,
      cacheStats: lruCache.getStats(),
    };
  }

  /**
   * 销毁控制器
   */
  destroy() {
    this.pausePreload();
    this.currentAudioUrl = null;
    this.activeLoads.clear();
    console.log('智能预加载控制器已销毁');
  }
}

// 创建并导出智能预加载控制器实例
const smartPreloadController = new SmartPreloadController();
module.exports = smartPreloadController;
