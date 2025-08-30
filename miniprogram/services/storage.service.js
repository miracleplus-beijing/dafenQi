// 文件存储服务
const requestUtil = require('../utils/request.js')
const { STORAGE_BUCKETS } = require('../config/supabase.config.js')

class StorageService {
  constructor() {
    this.buckets = STORAGE_BUCKETS
  }

  // 上传文件到指定桶
  async uploadFile(bucketName, filePath, fileName, options = {}) {
    try {
      const {
        contentType,
        cacheControl = '3600',
        upsert = false
      } = options

      // 构建上传 URL
      const uploadUrl = `/storage/v1/object/${bucketName}/${fileName}${upsert ? '?upsert=true' : ''}`
      
      // 准备表单数据
      const formData = {}
      if (cacheControl) {
        formData['cacheControl'] = cacheControl
      }

      // 上传文件
      const result = await requestUtil.upload(uploadUrl, filePath, formData, {
        headers: {
          'Content-Type': contentType || 'application/octet-stream'
        }
      })

      // 获取公共访问 URL
      const publicUrl = this.getPublicUrl(bucketName, fileName)

      return {
        success: true,
        data: result,
        publicUrl: publicUrl,
        path: `${bucketName}/${fileName}`
      }
    } catch (error) {
      console.error('文件上传失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 上传 SVG 图标
  async uploadSVG(filePath, fileName) {
    return this.uploadFile(this.buckets.SVG_ICONS, filePath, fileName, {
      contentType: 'image/svg+xml',
      upsert: true
    })
  }

  // 上传音频文件
  async uploadAudio(filePath, fileName) {
    return this.uploadFile(this.buckets.AUDIO_FILES, filePath, fileName, {
      contentType: 'audio/mpeg',
      cacheControl: '86400' // 24小时缓存
    })
  }

  // 上传封面图片
  async uploadCoverImage(filePath, fileName) {
    return this.uploadFile(this.buckets.COVER_IMAGES, filePath, fileName, {
      contentType: 'image/jpeg',
      upsert: true
    })
  }

  // 上传用户头像
  async uploadAvatar(filePath, userId) {
    const fileName = `avatar_${userId}_${Date.now()}.jpg`
    return this.uploadFile(this.buckets.USER_AVATARS, filePath, fileName, {
      contentType: 'image/jpeg',
      upsert: true
    })
  }

  // 批量上传本地 SVG 文件
  async batchUploadLocalSVGs() {
    const svgFiles = [
      '分类.svg',
      '漫游.svg',
      '我的.svg',
      '搜索.svg',
      '播放-大.svg',
      '播放-小.svg',
      '暂停.svg',
      '收藏-已选择.svg',
      '收藏-未选择.svg',
      '喜欢-已选择.svg',
      '喜欢-未选择.svg',
      '点赞-已选择.svg',
      '点赞-未选择.svg',
      '前进30秒.svg',
      '后退15秒.svg',
      '设置.svg',
      '历史.svg',
      '返回.svg',
      '分享.svg',
      '评论.svg',
      '问题反馈.svg'
    ]

    const results = []
    
    for (const fileName of svgFiles) {
      try {
        console.log(`正在上传: ${fileName}`)
        
        // 从本地读取文件
        const localPath = `images/icons/${fileName}`
        const result = await this.uploadSVG(localPath, fileName)
        
        results.push({
          fileName,
          ...result
        })
        
        // 添加延迟避免请求过快
        await this.delay(500)
      } catch (error) {
        console.error(`上传 ${fileName} 失败:`, error)
        results.push({
          fileName,
          success: false,
          error: error.message
        })
      }
    }

    return results
  }

  // 获取文件列表
  async listFiles(bucketName, options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        search = '',
        sortBy = { column: 'name', order: 'asc' }
      } = options

      const params = {
        limit,
        offset
      }
      
      if (search) {
        params.search = search
      }
      
      if (sortBy) {
        params.sortBy = JSON.stringify(sortBy)
      }

      const result = await requestUtil.post(`/storage/v1/object/list/${bucketName}`, params)
      
      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('获取文件列表失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 删除文件
  async deleteFile(bucketName, fileName) {
    try {
      await requestUtil.delete(`/storage/v1/object/${bucketName}/${fileName}`)
      
      return {
        success: true,
        message: '文件删除成功'
      }
    } catch (error) {
      console.error('删除文件失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 获取文件公共访问 URL
  getPublicUrl(bucketName, fileName) {
    const { getCurrentConfig } = require('../config/supabase.config.js')
    const config = getCurrentConfig()
    return `${config.url}/storage/v1/object/public/${bucketName}/${fileName}`
  }

  // 获取签名 URL（用于私有文件）
  async getSignedUrl(bucketName, fileName, expiresIn = 3600) {
    try {
      const result = await requestUtil.post(`/storage/v1/object/sign/${bucketName}/${fileName}`, {
        expiresIn
      })
      
      return {
        success: true,
        signedUrl: result.signedURL
      }
    } catch (error) {
      console.error('获取签名URL失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 读取本地文件（用于上传前的文件处理）
  async readLocalFile(filePath, encoding = 'utf8') {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding,
        success: (res) => resolve(res.data),
        fail: reject
      })
    })
  }

  // 获取文件信息
  async getFileInfo(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath,
        success: resolve,
        fail: reject
      })
    })
  }

  // 压缩图片
  async compressImage(src, quality = 80) {
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src,
        quality,
        success: resolve,
        fail: reject
      })
    })
  }

  // 选择并上传图片
  async selectAndUploadImage(bucketName, options = {}) {
    try {
      // 选择图片
      const chooseResult = await this.chooseImage(options)
      if (!chooseResult.tempFilePaths || chooseResult.tempFilePaths.length === 0) {
        throw new Error('未选择图片')
      }

      const filePath = chooseResult.tempFilePaths[0]
      
      // 压缩图片（可选）
      let finalPath = filePath
      if (options.compress !== false) {
        const compressResult = await this.compressImage(filePath, options.quality || 80)
        finalPath = compressResult.tempFilePath
      }

      // 生成文件名
      const timestamp = Date.now()
      const extension = filePath.split('.').pop()
      const fileName = `${timestamp}.${extension}`

      // 上传文件
      const uploadResult = await this.uploadFile(bucketName, finalPath, fileName, {
        contentType: `image/${extension}`,
        upsert: true
      })

      return uploadResult
    } catch (error) {
      console.error('选择并上传图片失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 选择图片
  async chooseImage(options = {}) {
    const {
      count = 1,
      sizeType = ['original', 'compressed'],
      sourceType = ['album', 'camera']
    } = options

    return new Promise((resolve, reject) => {
      wx.chooseImage({
        count,
        sizeType,
        sourceType,
        success: resolve,
        fail: reject
      })
    })
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // SVG 优化
  optimizeSVG(svgContent) {
    return svgContent
      .replace(/\s+/g, ' ')              // 压缩空格
      .replace(/>\s+</g, '><')           // 移除标签间空格
      .replace(/\s*([\{\}:;,])\s*/g, '$1') // 压缩CSS
      .trim()
  }

  // 为 SVG 添加主题支持
  addThemeSupport(svgContent, primaryColor = '#0884FF') {
    return svgContent.replace(
      /fill="[^"]*"/g,
      `fill="var(--primary-color, ${primaryColor})"`
    )
  }
}

// 创建单例实例
const storageService = new StorageService()

module.exports = storageService