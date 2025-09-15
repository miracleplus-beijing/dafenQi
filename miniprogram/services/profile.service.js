/**
 * 用户资料管理服务
 * 综合管理用户信息、Storage文件和数据同步
 */

const storageService = require('./storage.service.js')

class ProfileService {
  constructor() {
    this.supabaseUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co'
    this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmZjYWZnbmh6amlhdXVrc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY4NjAsImV4cCI6MjA3MTAwMjg2MH0.uxO5eyw0Usyd59UKz-S7bTrmOnNPg9Ld9wJ6pDMIQUA'
    this.storageService = storageService
  }

  /**
   * 获取用户完整资料(包含Storage文件的签名URL)
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户完整资料
   */
  async getUserCompleteProfile(userId) {
    try {
      // 获取用户基础信息
      const response = await this.supabaseRequest({
        url: '/rest/v1/users',
        method: 'GET',
        params: {
          select: '*',
          id: `eq.${userId}`
        }
      })

      if (response.length === 0) {
        return { success: false, error: '用户不存在' }
      }

      const user = response[0]

      // 获取头像显示URL (处理private storage)
      const avatarDisplayUrl = await this.getAvatarDisplayUrl(user)
      
      // 获取用户Storage文件统计
      const storageStats = await this.storageService.getUserFiles(userId)
      
      const completeProfile = {
        ...user,
        display_name: user.nickname || user.username,
        avatar_url: avatarDisplayUrl,
        avatar_storage_path: user.avatar_url?.startsWith('storage:') ? 
          user.avatar_url.replace('storage:user_profile/', '') : null,
        has_user_info: !!(user.nickname && user.nickname !== '微信用户' && avatarDisplayUrl && !avatarDisplayUrl.includes('default-avatar')),
        storage_stats: storageStats.success ? {
          total_files: storageStats.count,
          files: storageStats.files
        } : null
      }

      return { success: true, profile: completeProfile }
    } catch (error) {
      console.error('获取用户完整资料失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 更新用户资料(综合处理头像上传和信息更新)
   * @param {string} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateUserProfile(userId, updateData) {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser || currentUser.id !== userId) {
        return { success: false, error: '用户身份验证失败' }
      }

      const updates = {
        updated_at: new Date().toISOString()
      }

      // 处理头像更新
      if (updateData.avatarFile || updateData.avatarUrl) {
        const avatarUpdateResult = await this.handleAvatarUpdate(
          userId, 
          updateData.avatarFile || updateData.avatarUrl
        )
        
        if (avatarUpdateResult.success) {
          updates.avatar_url = avatarUpdateResult.storageReference
          // 清理旧头像文件
          await this.cleanupOldAvatars(userId)
        } else {
          console.warn('头像更新失败:', avatarUpdateResult.error)
          return { success: false, error: '头像更新失败: ' + avatarUpdateResult.error }
        }
      }

      // 处理昵称更新
      if (updateData.nickname || updateData.nickName) {
        updates.nickname = updateData.nickname || updateData.nickName
      }

      // 处理其他用户信息更新
      if (updateData.username) {
        updates.username = updateData.username
      }

      if (updateData.academic_field) {
        updates.academic_field = updateData.academic_field
      }

      console.log('准备更新用户资料:', updates)

      // 更新users表
      const response = await this.supabaseRequest({
        url: '/rest/v1/users',
        method: 'PATCH',
        params: {
          id: `eq.${userId}`
        },
        data: updates,
        headers: {
          'Prefer': 'return=representation'
        }
      })

      console.log('用户资料更新响应:', response)

      // 获取更新后的完整资料
      const updatedProfileResult = await this.getUserCompleteProfile(userId)
      if (!updatedProfileResult.success) {
        throw new Error(updatedProfileResult.error)
      }

      // 同步到全局状态
      await this.syncToGlobalState(updatedProfileResult.profile)

      return { success: true, profile: updatedProfileResult.profile }
    } catch (error) {
      console.error('更新用户资料失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 处理头像更新(上传到private storage)
   * @param {string} userId - 用户ID
   * @param {string} avatarSource - 头像来源(文件路径或URL)
   * @returns {Promise<Object>} 头像更新结果
   */
  async handleAvatarUpdate(userId, avatarSource) {
    try {
      // 如果是微信临时文件或选择的文件
      if (avatarSource.includes('tmp') || avatarSource.includes('temp') || avatarSource.startsWith('wxfile://')) {
        console.log('上传头像到private storage:', avatarSource)
        
        // 上传到private bucket
        const uploadResult = await this.storageService.uploadUserFileToPrivateBucket(
          userId,
          'avatar',
          avatarSource
        )

        if (uploadResult.success) {
          return {
            success: true,
            storageReference: `storage:user_profile/${uploadResult.path}`,
            storagePath: uploadResult.path
          }
        } else {
          return { success: false, error: uploadResult.error }
        }
      }

      // 如果是已有的URL，直接使用
      return {
        success: true,
        storageReference: avatarSource,
        storagePath: null
      }

    } catch (error) {
      console.error('处理头像更新失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 清理用户旧头像文件
   * @param {string} userId - 用户ID
   * @returns {Promise<void>}
   */
  async cleanupOldAvatars(userId) {
    try {
      console.log('清理用户旧头像文件:', userId)
      
      // 获取用户头像文件列表
      const filesResult = await this.storageService.getUserFiles(userId, 'avatar')
      if (!filesResult.success || filesResult.files.length <= 1) {
        return // 无需清理或只有一个文件
      }

      // 按创建时间排序，保留最新的1个，删除其他
      const files = filesResult.files
      files.sort((a, b) => new Date(b.created_at || b.updated_at) - new Date(a.created_at || a.updated_at))
      
      const filesToDelete = files.slice(1) // 保留第一个(最新的)
      
      for (const file of filesToDelete) {
        const filePath = `${userId}/avatars/${file.name}`
        await this.storageService.deleteUserFile(filePath)
        console.log('已删除旧头像:', filePath)
      }
      
      console.log(`清理完成，删除了${filesToDelete.length}个旧头像文件`)
    } catch (error) {
      console.error('清理旧头像失败:', error)
    }
  }

  /**
   * 获取用户Storage使用统计
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 存储统计
   */
  async getUserStorageStats(userId) {
    try {
      const stats = {
        avatars: { count: 0, files: [] },
        covers: { count: 0, files: [] },
        documents: { count: 0, files: [] },
        total: { count: 0, size: 0 }
      }

      // 获取各类型文件
      for (const [type, folder] of Object.entries(this.storageService.fileTypes)) {
        const filesResult = await this.storageService.getUserFiles(userId, type)
        if (filesResult.success) {
          stats[folder] = {
            count: filesResult.count,
            files: filesResult.files
          }
          stats.total.count += filesResult.count
        }
      }

      return { success: true, stats }
    } catch (error) {
      console.error('获取存储统计失败:', error)
      return { success: false, error: error.message, stats: null }
    }
  }

  /**
   * 批量生成用户文件的签名URL
   * @param {string} userId - 用户ID
   * @param {Array} filePaths - 文件路径数组
   * @returns {Promise<Object>} 批量签名URL结果
   */
  async batchGenerateSignedUrls(userId, filePaths) {
    try {
      const signedUrls = {}
      
      for (const filePath of filePaths) {
        const result = await this.storageService.generateUserFileSignedUrl(filePath, 86400)
        if (result.success) {
          signedUrls[filePath] = result.signedUrl
        }
      }

      return { success: true, signedUrls }
    } catch (error) {
      console.error('批量生成签名URL失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 同步用户信息到全局状态和本地存储
   * @param {Object} userProfile - 用户资料
   */
  async syncToGlobalState(userProfile) {
    try {
      // 保存到本地存储
      await this.saveUserSession(userProfile)
      
      // 同步到全局状态
      const app = getApp()
      if (app && app.globalData) {
        app.globalData.userInfo = userProfile
        app.globalData.isLoggedIn = true
      }

      console.log('用户信息已同步到全局状态')
    } catch (error) {
      console.error('同步到全局状态失败:', error)
    }
  }

  /**
   * 检查用户资料完整性
   * @param {Object} user - 用户信息
   * @returns {Object} 完整性检查结果
   */
  checkProfileCompleteness(user) {
    const checks = {
      hasBasicInfo: !!(user.nickname && user.nickname !== '微信用户'),
      hasAvatar: !!(user.avatar_url && !user.avatar_url.includes('default-avatar')),
      hasAcademicField: !!(user.academic_field && user.academic_field.fields && user.academic_field.fields.length > 0)
    }

    const completeness = {
      ...checks,
      overall: Object.values(checks).filter(Boolean).length / Object.keys(checks).length,
      missing: Object.entries(checks)
        .filter(([key, value]) => !value)
        .map(([key]) => key)
    }

    return completeness
  }

  /**
   * 初始化用户Storage空间
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 初始化结果
   */
  async initializeUserStorage(userId) {
    try {
      console.log('为用户初始化Storage空间:', userId)
      
      // 检查用户是否已有文件
      const existingFiles = await this.storageService.getUserFiles(userId)
      
      if (existingFiles.success && existingFiles.count > 0) {
        console.log('用户已有Storage文件，无需初始化')
        return { success: true, message: '用户Storage空间已存在' }
      }

      // 可以在这里创建用户初始文件夹结构
      // 由于RLS策略，用户首次上传文件时会自动创建文件夹结构

      return { success: true, message: '用户Storage空间初始化完成' }
    } catch (error) {
      console.error('初始化用户Storage失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Supabase REST API请求封装
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async supabaseRequest(options) {
    const { url, method = 'GET', data, params = {}, headers = {} } = options
    
    // 构建查询参数
    let queryString = ''
    if (Object.keys(params).length > 0) {
      queryString = '?' + Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
    }
    
    const requestUrl = `${this.supabaseUrl}${url}${queryString}`
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: requestUrl,
        method,
        data,
        header: {
          'apikey': this.supabaseAnonKey,
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json',
          ...headers
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`))
          }
        },
        fail: reject
      })
    })
  }

  /**
   * 获取头像显示URL (处理private storage的签名URL)
   * @param {Object} user - 用户信息
   * @returns {Promise<string>} 头像显示URL
   */
  async getAvatarDisplayUrl(user) {
    try {
      // 如果没有avatar_url，返回默认头像
      if (!user.avatar_url) {
        return 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png'
      }

      // 如果是storage引用格式，生成签名URL
      if (user.avatar_url.startsWith('storage:user_profile/')) {
        const storagePath = user.avatar_url.replace('storage:user_profile/', '')
        const signedUrlResult = await this.storageService.generateUserFileSignedUrl(storagePath, 86400)
        
        if (signedUrlResult.success) {
          return signedUrlResult.signedUrl
        } else {
          console.warn('生成头像签名URL失败:', signedUrlResult.error)
          // 回退到默认头像
          return 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png'
        }
      }

      // 如果是普通URL，直接返回
      return user.avatar_url
      
    } catch (error) {
      console.error('获取头像显示URL失败:', error)
      return 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png'
    }
  }

  /**
   * 获取当前用户信息
   * @returns {Object|null} 用户信息
   */
  getCurrentUser() {
    try {
      const app = getApp()
      return app && app.globalData ? app.globalData.userInfo : null
    } catch (error) {
      console.warn('获取当前用户失败:', error)
      return null
    }
  }

  /**
   * 保存用户会话信息
   * @param {Object} user - 用户信息
   */
  async saveUserSession(user) {
    try {
      wx.setStorageSync('userInfo', user)
      wx.setStorageSync('lastLoginTime', Date.now())
    } catch (error) {
      console.error('保存用户会话失败:', error)
    }
  }
}

// 创建并导出用户资料服务实例
const profileService = new ProfileService()
module.exports = profileService