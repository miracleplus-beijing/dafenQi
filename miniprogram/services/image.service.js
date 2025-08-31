/**
 * 图片资源管理服务
 * 处理图片CDN加载、缓存和降级策略
 */

class ImageService {
  constructor() {
    this.baseUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images'
    this.cache = new Map()
    this.failedUrls = new Set()
    this.maxCacheSize = 50 // 最大缓存50个图片URL
  }

  /**
   * 获取优化后的图片URL
   * @param {string} imagePath - 本地图片路径 
   * @param {Object} options - 图片选项
   * @returns {string} 优化后的图片URL
   */
  getImageUrl(imagePath, options = {}) {
    const {
      category = 'auto', // auto, large, icons, assets
      fallback = true,   // 是否启用本地降级
      cache = true,      // 是否启用缓存
      quality = 80,      // 图片质量
      width,             // 宽度
      height             // 高度
    } = options

    // 移除路径前缀，只保留文件名
    const fileName = imagePath.replace(/^.*[\\\/]/, '').replace(/^images[\\\/]/, '')
    
    // 自动分类
    const finalCategory = category === 'auto' ? this.categorizeImage(fileName) : category
    
    // 构建CDN URL
    let cdnUrl = `${this.baseUrl}/${finalCategory}/${fileName}`
    
    // 添加图片变换参数（如果支持）
    const params = []
    if (width) params.push(`width=${width}`)
    if (height) params.push(`height=${height}`)
    if (quality !== 80) params.push(`quality=${quality}`)
    
    if (params.length > 0) {
      cdnUrl += `?${params.join('&')}`
    }
    
    // 检查缓存
    if (cache && this.cache.has(cdnUrl)) {
      return this.cache.get(cdnUrl)
    }
    
    // 检查是否之前失败过
    if (this.failedUrls.has(cdnUrl) && fallback) {
      return imagePath // 返回本地路径
    }
    
    // 缓存URL
    if (cache) {
      this.addToCache(cdnUrl, cdnUrl)
    }
    
    return cdnUrl
  }

  /**
   * 自动分类图片
   * @param {string} fileName - 文件名
   * @returns {string} 分类目录
   */
  categorizeImage(fileName) {
    const file = fileName.toLowerCase()
    
    // 大文件图片
    const largeFiles = [
      'chatgpt podcast image.png',
      'image.png',
      'cs.ai logo - artificial intelligence.png',
      'cs.cv logo - computer vision.png',
      'cs.lg logo - learning.png',
      'cs.ro logo - robotics.png',
      'cs.sd logo - sound processing.png',
      'cs.cl logo - computational linguistics.png',
      'cs.ma logo - multi-agent systems.png'
    ]
    
    if (largeFiles.includes(file)) {
      return 'large'
    }
    
    // 图标文件
    if (file.includes('icon') || file.endsWith('.svg') || file.includes('分类') || file.includes('漫游') || file.includes('我的')) {
      return 'icons'
    }
    
    // 其他资源
    return 'assets'
  }

  /**
   * 预加载图片
   * @param {string} imagePath - 图片路径
   * @param {Object} options - 选项
   */
  async preloadImage(imagePath, options = {}) {
    const url = this.getImageUrl(imagePath, options)
    
    return new Promise((resolve, reject) => {
      const img = wx.createImage ? wx.createImage() : new Image()
      
      img.onload = () => {
        console.log('图片预加载成功:', url)
        resolve(url)
      }
      
      img.onerror = () => {
        console.warn('图片预加载失败:', url)
        this.failedUrls.add(url)
        
        // 如果CDN失败，尝试本地路径
        if (options.fallback !== false) {
          resolve(imagePath)
        } else {
          reject(new Error('图片加载失败'))
        }
      }
      
      img.src = url
    })
  }

  /**
   * 批量预加载图片
   * @param {Array} imagePaths - 图片路径数组
   * @param {Object} options - 选项
   */
  async preloadImages(imagePaths, options = {}) {
    const promises = imagePaths.map(path => 
      this.preloadImage(path, options).catch(err => {
        console.warn('预加载失败:', path, err)
        return path // 返回原路径作为降级
      })
    )
    
    return Promise.all(promises)
  }

  /**
   * 获取关键图标URL映射
   * @returns {Object} 图标URL映射
   */
  getCriticalIcons() {
    const icons = {
      // TabBar图标
      browse: this.getImageUrl('icons/browse.svg'),
      browseActive: this.getImageUrl('icons/browse.png'),
      category: this.getImageUrl('icons/category.svg'),
      categoryActive: this.getImageUrl('icons/category.png'),
      profile: this.getImageUrl('icons/user.svg'),
      profileActive: this.getImageUrl('icons/user.png'),
      
      // 播放控制图标
      play: this.getImageUrl('icons/播放-大.svg'),
      pause: this.getImageUrl('icons/暂停.svg'),
      favorite: this.getImageUrl('icons/收藏-未选择.svg'),
      favoriteActive: this.getImageUrl('icons/收藏-已选择.svg'),
      like: this.getImageUrl('icons/喜欢-未选择.svg'),
      likeActive: this.getImageUrl('icons/喜欢-已选择.svg'),
      
      // 分类封面
      aiCover: this.getImageUrl('CS.AI Logo - Artificial Intelligence.png', { category: 'large' }),
      cvCover: this.getImageUrl('CS.CV Logo - Computer Vision.png', { category: 'large' }),
      lgCover: this.getImageUrl('CS.LG Logo - Learning.png', { category: 'large' })
    }
    
    return icons
  }

  /**
   * 添加到缓存
   * @param {string} key - 缓存键
   * @param {string} value - 缓存值
   */
  addToCache(key, value) {
    // 清理过期缓存
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, value)
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear()
    this.failedUrls.clear()
    console.log('图片缓存已清理')
  }

  /**
   * 获取缓存统计
   * @returns {Object} 缓存统计信息
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      failedUrls: this.failedUrls.size,
      maxCacheSize: this.maxCacheSize
    }
  }
}

// 创建并导出图片服务实例
const imageService = new ImageService()
module.exports = imageService