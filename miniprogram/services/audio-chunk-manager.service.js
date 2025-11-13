/**
 * 音频分块管理器
 * 负责音频文件的分块分析、管理和数据块状态跟踪
 */

class AudioChunkManager {
  constructor() {
    // 音频文件信息缓存
    this.audioFileInfo = new Map(); // audioUrl -> { fileSize, duration, chunkSize, totalChunks }

    // 分块配置
    this.minChunkSize = 200 * 1024; // 200KB
    this.maxChunkSize = 400 * 1024; // 400KB
    this.defaultChunkSize = 300 * 1024; // 300KB

    // 网络状态监听
    this.networkType = 'wifi'; // wifi, 4g, 3g, 2g, slow-2g
    this.isSlowNetwork = false;

    // 初始化网络监听
    this.initNetworkMonitoring();
  }

  /**
   * 初始化网络状态监听
   */
  initNetworkMonitoring() {
    // 获取当前网络类型
    wx.getNetworkType({
      success: res => {
        this.networkType = res.networkType;
        this.isSlowNetwork = ['2g', 'slow-2g', '3g'].includes(res.networkType);
        console.log(
          '当前网络类型:',
          res.networkType,
          '慢网络:',
          this.isSlowNetwork
        );
      },
    });

    // 监听网络状态变化
    wx.onNetworkStatusChange(res => {
      this.networkType = res.networkType;
      this.isSlowNetwork = ['2g', 'slow-2g', '3g'].includes(res.networkType);
      console.log(
        '网络状态变化:',
        res.networkType,
        '慢网络:',
        this.isSlowNetwork
      );

      // 网络状态变化时重新计算分块大小
      this.adjustChunkSizeForNetwork();
    });
  }

  /**
   * 根据网络状况调整分块大小
   * @returns {number} 调整后的分块大小
   */
  adjustChunkSizeForNetwork() {
    let chunkSize = this.defaultChunkSize;

    switch (this.networkType) {
      case 'wifi':
        chunkSize = this.maxChunkSize; // 400KB
        break;
      case '4g':
        chunkSize = this.defaultChunkSize; // 300KB
        break;
      case '3g':
        chunkSize = this.minChunkSize + 50 * 1024; // 250KB
        break;
      case '2g':
      case 'slow-2g':
        chunkSize = this.minChunkSize; // 200KB
        break;
      default:
        chunkSize = this.defaultChunkSize;
    }

    console.log(
      `网络${this.networkType}，调整分块大小为: ${(chunkSize / 1024).toFixed(0)}KB`
    );
    return chunkSize;
  }

  /**
   * 分析音频文件并生成分块信息
   * @param {string} audioUrl - 音频文件URL
   * @param {number} duration - 音频时长(秒)，可选
   * @returns {Promise<Object>} 分块信息
   */
  async analyzeAudioFile(audioUrl, duration = 0) {
    // 检查缓存
    if (this.audioFileInfo.has(audioUrl)) {
      const cached = this.audioFileInfo.get(audioUrl);
      console.log('使用缓存的音频文件信息:', cached);
      return cached;
    }

    try {
      console.log('开始分析音频文件:', audioUrl);

      // 通过HEAD请求获取文件大小
      const fileSize = await this.getFileSize(audioUrl);
      if (!fileSize) {
        throw new Error('无法获取文件大小');
      }

      // 根据网络状况确定分块大小
      const chunkSize = this.adjustChunkSizeForNetwork();

      // 计算分块数量
      const totalChunks = Math.ceil(fileSize / chunkSize);

      const audioInfo = {
        audioUrl,
        fileSize,
        duration,
        chunkSize,
        totalChunks,
        analyzedAt: Date.now(),
      };

      // 缓存分析结果
      this.audioFileInfo.set(audioUrl, audioInfo);

      console.log('音频文件分析完成:', {
        fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
        chunkSize: `${(chunkSize / 1024).toFixed(0)}KB`,
        totalChunks,
        duration: `${duration}秒`,
      });

      return audioInfo;
    } catch (error) {
      console.error('分析音频文件失败:', audioUrl, error);
      throw error;
    }
  }

  /**
   * 通过HEAD请求获取文件大小
   * @param {string} url - 文件URL
   * @returns {Promise<number>} 文件大小(字节)
   */
  getFileSize(url) {
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: 'HEAD',
        success: res => {
          const contentLength =
            res.header['content-length'] || res.header['Content-Length'];
          if (contentLength) {
            const fileSize = parseInt(contentLength, 10);
            console.log(`文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
            resolve(fileSize);
          } else {
            console.warn('无法从HEAD请求获取文件大小，尝试部分请求');
            // 如果HEAD请求无法获取大小，尝试Range请求
            this.getFileSizeByRange(url).then(resolve).catch(reject);
          }
        },
        fail: error => {
          console.warn('HEAD请求失败，尝试部分请求:', error);
          // HEAD失败时尝试Range请求
          this.getFileSizeByRange(url).then(resolve).catch(reject);
        },
      });
    });
  }

  /**
   * 通过Range请求获取文件大小
   * @param {string} url - 文件URL
   * @returns {Promise<number>} 文件大小
   */
  getFileSizeByRange(url) {
    return new Promise((resolve, reject) => {
      // 尝试请求前1KB数据来获取文件总大小
      wx.request({
        url,
        method: 'GET',
        header: {
          Range: 'bytes=0-1023',
        },
        success: res => {
          if (res.statusCode === 206) {
            // Partial Content
            const contentRange =
              res.header['content-range'] || res.header['Content-Range'];
            if (contentRange) {
              // Content-Range格式: "bytes 0-1023/1234567"
              const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
              if (match) {
                const fileSize = parseInt(match[1], 10);
                console.log(
                  `通过Range获取文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`
                );
                resolve(fileSize);
                return;
              }
            }
          }

          // 如果Range请求也失败，估算大小（基于时长）
          console.warn('无法获取准确文件大小，使用估算');
          resolve(this.estimateFileSize(url));
        },
        fail: error => {
          console.warn('Range请求失败:', error);
          // 最后的备选方案：估算文件大小
          resolve(this.estimateFileSize(url));
        },
      });
    });
  }

  /**
   * 估算音频文件大小
   * @param {string} audioUrl - 音频URL
   * @returns {number} 估算的文件大小(字节)
   */
  estimateFileSize(audioUrl) {
    // 基于常见的音频编码格式估算
    // MP3 128kbps ≈ 1MB/分钟
    // 假设平均时长30分钟，文件大小约30MB
    const estimatedSize = 30 * 1024 * 1024; // 30MB
    console.log(`估算文件大小: ${(estimatedSize / 1024 / 1024).toFixed(0)}MB`);
    return estimatedSize;
  }

  /**
   * 计算指定时间点对应的数据块索引
   * @param {string} audioUrl - 音频URL
   * @param {number} currentTime - 当前播放时间(秒)
   * @returns {number} 数据块索引
   */
  getChunkIndexByTime(audioUrl, currentTime) {
    const audioInfo = this.audioFileInfo.get(audioUrl);
    if (!audioInfo || !audioInfo.duration) {
      return 0;
    }

    const { fileSize, duration, chunkSize } = audioInfo;

    // 估算当前时间对应的文件位置
    const estimatedPosition = (currentTime / duration) * fileSize;

    // 计算对应的块索引
    const chunkIndex = Math.floor(estimatedPosition / chunkSize);

    return Math.min(chunkIndex, audioInfo.totalChunks - 1);
  }

  /**
   * 获取指定块的字节范围
   * @param {string} audioUrl - 音频URL
   * @param {number} chunkIndex - 块索引
   * @returns {Object} { start, end } 字节范围
   */
  getChunkByteRange(audioUrl, chunkIndex) {
    const audioInfo = this.audioFileInfo.get(audioUrl);
    if (!audioInfo) {
      throw new Error('音频文件信息不存在');
    }

    const { fileSize, chunkSize } = audioInfo;
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize - 1, fileSize - 1);

    return { start, end };
  }

  /**
   * 计算预加载范围的块索引列表
   * @param {string} audioUrl - 音频URL
   * @param {number} currentTime - 当前播放时间
   * @param {number} preloadRange - 预加载范围(块数量)
   * @returns {Array<number>} 需要预加载的块索引列表
   */
  getPreloadChunks(audioUrl, currentTime, preloadRange = 3) {
    const currentChunkIndex = this.getChunkIndexByTime(audioUrl, currentTime);
    const audioInfo = this.audioFileInfo.get(audioUrl);

    if (!audioInfo) {
      return [0];
    }

    const chunks = [];
    const { totalChunks } = audioInfo;

    // 当前块
    chunks.push(currentChunkIndex);

    // 前面1-2块（用户可能后退）
    for (let i = 1; i <= Math.min(1, preloadRange - 1); i++) {
      const prevIndex = currentChunkIndex - i;
      if (prevIndex >= 0) {
        chunks.unshift(prevIndex);
      }
    }

    // 后面2-3块（用户主要播放方向）
    for (let i = 1; i <= preloadRange; i++) {
      const nextIndex = currentChunkIndex + i;
      if (nextIndex < totalChunks) {
        chunks.push(nextIndex);
      }
    }

    // console.log(`当前块:${currentChunkIndex}, 预加载块:`, chunks);
    return chunks;
  }

  /**
   * 清理过期的音频文件信息缓存
   * @param {number} maxAge - 最大缓存时间(毫秒)
   */
  cleanExpiredInfo(maxAge = 30 * 60 * 1000) {
    // 默认30分钟
    const now = Date.now();
    const expiredKeys = [];

    for (const [audioUrl, info] of this.audioFileInfo.entries()) {
      if (now - info.analyzedAt > maxAge) {
        expiredKeys.push(audioUrl);
      }
    }

    expiredKeys.forEach(key => {
      this.audioFileInfo.delete(key);
      console.log('清理过期音频信息:', key);
    });
  }

  /**
   * 获取管理器统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const totalFiles = this.audioFileInfo.size;
    let totalSizeMB = 0;
    let totalChunks = 0;

    for (const info of this.audioFileInfo.values()) {
      totalSizeMB += info.fileSize / 1024 / 1024;
      totalChunks += info.totalChunks;
    }

    return {
      totalFiles,
      totalSizeMB: Math.round(totalSizeMB * 100) / 100,
      totalChunks,
      networkType: this.networkType,
      isSlowNetwork: this.isSlowNetwork,
      currentChunkSizeKB: Math.round(this.adjustChunkSizeForNetwork() / 1024),
    };
  }
}

// 创建并导出音频分块管理器实例
const audioChunkManager = new AudioChunkManager();
module.exports = audioChunkManager;
