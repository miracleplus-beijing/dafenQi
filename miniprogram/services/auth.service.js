/**
 * 认证服务
 * 处理微信登录、用户信息管理等认证相关功能
 */

const storageService = require('./storage.service.js')

class AuthService {
  constructor() {
    this.supabaseUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co'
    this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmZjYWZnbmh6amlhdXVrc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY4NjAsImV4cCI6MjA3MTAwMjg2MH0.uxO5eyw0Usyd59UKz-S7bTrmOnNPg9Ld9wJ6pDMIQUA'
    this.storageService = storageService
  }

  /**
   * 微信登录（集成Supabase存储）
   * @returns {Promise<Object>} 登录结果
   */
  async loginWithWechat() {
    try {
      // 1. 获取微信登录code
      const loginResult = await this.getWechatLoginCode()
      if (!loginResult.code) {
        throw new Error('获取微信登录code失败')
      }

      // 2. 模拟OpenID（实际中需要后端解析）
      const mockOpenId = 'mock_openid_' + loginResult.code
      
      // 3. 查询或创建用户
      const authResult = await this.findOrCreateUser(mockOpenId)

      // 4. 保存用户信息到全局状态
      if (authResult.success) {
        await this.saveUserSession(authResult.user)
        try {
          const app = getApp()
          if (app && app.globalData) {
            app.globalData.userInfo = authResult.user
            app.globalData.isLoggedIn = true
          }
        } catch (error) {
          console.warn('更新全局状态失败:', error)
        }
      }

      return authResult

    } catch (error) {
      console.error('微信登录失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取微信登录code
   * @returns {Promise<Object>} 登录结果
   */
  getWechatLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve({ code: res.code })
          } else {
            reject(new Error('微信登录失败: ' + res.errMsg))
          }
        },
        fail: (error) => {
          reject(new Error('微信登录失败: ' + error.errMsg))
        }
      })
    })
  }

  /**
   * 查找或创建用户（使用Supabase）
   * @param {string} wechatOpenId - 微信OpenID
   * @returns {Promise<Object>} 用户信息
   */
  async findOrCreateUser(wechatOpenId) {
    try {
      // 首先查询用户是否已存在
      const response = await this.supabaseRequest({
        url: '/rest/v1/users',
        method: 'GET',
        params: {
          select: '*',
          wechat_openid: `eq.${wechatOpenId}`
        }
      })

      let user = null
      
      if (response.length > 0) {
        // 用户已存在
        user = response[0]
        console.log('用户已存在:', user)
      } else {
        // 创建新用户
        const newUserData = {
          wechat_openid: wechatOpenId,
          username: '微信用户',
          nickname: '微信用户',
          avatar_url: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/icons/nav-profile.svg',
          role: 'user',
          academic_field: { fields: [] },
          is_active: true
        }
        
        console.log('准备创建新用户:', newUserData)
        
        const createResponse = await this.supabaseRequest({
          url: '/rest/v1/users',
          method: 'POST',
          data: newUserData,
          headers: {
            'Prefer': 'return=representation'
          }
        })
        
        user = Array.isArray(createResponse) ? createResponse[0] : createResponse
        console.log('创建新用户成功:', user)
      }

      // 确保用户对象存在
      if (!user) {
        throw new Error('用户创建或查询失败')
      }

      // 合并用户信息
      const combinedUserInfo = {
        ...user,
        // 兼容性字段，直接使用users表中的信息
        display_name: user.nickname || user.username,
        avatar_url: user.avatar_url,
        bio: user.bio || '',
        has_user_info: !!(user.nickname && user.avatar_url && !user.avatar_url.includes('default-avatar'))
      }

      return {
        success: true,
        user: combinedUserInfo
      }

    } catch (error) {
      console.error('查找或创建用户失败:', error)
      
      // 如果是RLS错误，提供更详细的错误信息
      if (error.message.includes('row-level security')) {
        return {
          success: false,
          error: '数据库权限错误，请联系管理员'
        }
      }
      
      return {
        success: false,
        error: error.message
      }
    }
  }


  /**
   * 更新用户信息（使用头像昵称填写组件得到的数据，支持private storage）
   * @param {Object} userInfo - 用户信息
   * @returns {Promise<Object>} 更新结果
   */
  async updateUserInfo(userInfo) {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        return { success: false, error: '用户未登录' }
      }

      // 处理头像上传到private bucket
      let avatarStoragePath = null
      let avatarSignedUrl = null
      let finalAvatarUrl = null
      
      if (userInfo.avatarUrl) {
        // 如果是微信临时文件，需要上传到private storage
        if (userInfo.avatarUrl.includes('tmp') || userInfo.avatarUrl.includes('temp') || userInfo.avatarUrl.includes('wxfile://')) {
          console.log('准备上传微信头像到private storage')
          
          // 使用storage service上传到private bucket
          const uploadResult = await this.storageService.uploadUserFileToPrivateBucket(
            currentUser.id, 
            'avatar', 
            userInfo.avatarUrl
          )
          
          if (uploadResult.success) {
            avatarStoragePath = uploadResult.path
            
            // 立即生成签名URL用于显示
            const signedUrlResult = await this.storageService.generateUserFileSignedUrl(
              uploadResult.path,
              86400 // 24小时有效期
            )
            
            if (signedUrlResult.success) {
              avatarSignedUrl = signedUrlResult.signedUrl
              finalAvatarUrl = avatarSignedUrl
              console.log('微信头像上传成功，签名URL已生成:', finalAvatarUrl)
            } else {
              console.warn('生成签名URL失败:', signedUrlResult.error)
            }
          } else {
            console.warn('头像上传失败:', uploadResult.error)
            // 提供更详细的错误信息和降级处理
            const errorMsg = uploadResult.error || '头像上传失败'
            console.error('详细错误信息:', errorMsg)
            
            // 不返回失败，使用默认头像继续
            finalAvatarUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/icons/nav-profile.svg'
            console.log('使用默认头像:', finalAvatarUrl)
          }
        } else if (userInfo.avatarUrl.includes('qlogo.cn') || userInfo.avatarUrl.includes('wx.qlogo.cn')) {
          // 微信头像URL，直接使用
          finalAvatarUrl = userInfo.avatarUrl
          console.log('使用微信头像URL:', finalAvatarUrl)
        } else {
          // 如果是已经上传的URL，直接使用
          finalAvatarUrl = userInfo.avatarUrl
        }
      }
      
      // 准备更新数据
      const userUpdateData = {
        updated_at: new Date().toISOString()
      }
      
      // 更新昵称
      if (userInfo.nickName) {
        userUpdateData.nickname = userInfo.nickName
      }
      
      // 更新头像URL - 优先使用签名URL，后备使用存储路径
      if (finalAvatarUrl) {
        userUpdateData.avatar_url = finalAvatarUrl
        console.log('准备更新users表头像URL:', userUpdateData.avatar_url)
      } else if (avatarStoragePath) {
        // 后备方案：如果签名URL生成失败，使用存储路径
        userUpdateData.avatar_url = `storage:user_profile/${avatarStoragePath}`
        console.log('使用存储路径作为头像URL:', userUpdateData.avatar_url)
      }

      // 更新users表
      const response = await this.supabaseRequest({
        url: `/rest/v1/users`,
        method: 'PATCH',
        params: {
          id: `eq.${currentUser.id}`
        },
        data: userUpdateData,
        headers: {
          'Prefer': 'return=representation'
        }
      })

      console.log('用户信息更新响应:', response)

      // 重新获取完整的用户信息
      const updatedUserResponse = await this.supabaseRequest({
        url: '/rest/v1/users',
        method: 'GET',
        params: {
          select: '*',
          id: `eq.${currentUser.id}`
        }
      })

      const updatedUser = updatedUserResponse[0]

      // 合并更新后的用户信息，确保头像URL正确
      const combinedUserInfo = {
        ...updatedUser,
        display_name: updatedUser.nickname || updatedUser.username,
        avatar_url: finalAvatarUrl || updatedUser.avatar_url || await this.getAvatarDisplayUrl(updatedUser),
        avatar_storage_path: avatarStoragePath,
        has_user_info: true
      }

      // 保存到本地和全局状态
      await this.saveUserSession(combinedUserInfo)
      try {
        const app = getApp()
        if (app && app.globalData) {
          app.globalData.userInfo = combinedUserInfo
        }
      } catch (error) {
        console.warn('更新全局状态失败:', error)
      }

      return { success: true, user: combinedUserInfo }
    } catch (error) {
      console.error('更新用户信息失败:', error)
      
      // 提供更详细的错误信息
      let errorMessage = '更新失败，请重试'
      
      if (error.message.includes('row-level security')) {
        errorMessage = '权限不足，请重新登录'
      } else if (error.message.includes('network')) {
        errorMessage = '网络连接失败，请检查网络'
      } else if (error.message.includes('timeout')) {
        errorMessage = '请求超时，请重试'
      } else if (error.message.includes('avatar') || error.message.includes('upload')) {
        errorMessage = '头像上传失败，已使用默认头像'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return { 
        success: false, 
        error: errorMessage,
        details: error.message // 保留原始错误信息用于调试
      }
    }
  }

  /**
   * 获取用户完整资料
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户资料
   */
  async getUserProfile(userId) {
    try {
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

      const combinedUserInfo = {
        ...user,
        display_name: user.nickname || user.username,
        avatar_url: user.avatar_url,
        bio: user.bio || '',
        has_user_info: !!(user.nickname && user.avatar_url && !user.avatar_url.includes('default-avatar'))
      }

      return { success: true, user: combinedUserInfo }
    } catch (error) {
      console.error('获取用户资料失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 更新用户详细资料
   * @param {Object} profileData - 详细资料数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateUserProfile(profileData) {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        return { success: false, error: '用户未登录' }
      }

      const updateData = {
        ...profileData,
        updated_at: new Date().toISOString()
      }

      const response = await this.supabaseRequest({
        url: `/rest/v1/users`,
        method: 'PATCH',
        params: {
          id: `eq.${currentUser.id}`
        },
        data: updateData,
        headers: {
          'Prefer': 'return=representation'
        }
      })

      return { success: true, profile: response[0] || response }
    } catch (error) {
      console.error('更新用户详细资料失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 上传头像到Supabase Storage
   * @param {string} tempFilePath - 微信临时文件路径
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 上传结果
   */
  async uploadAvatar(tempFilePath, userId) {
    try {
      // 读取临时文件
      const fileData = await this.readTempFile(tempFilePath)
      
      // 生成文件名
      const fileName = `avatars/${userId}_${Date.now()}.jpg`
      
      // 上传到Supabase Storage
      const uploadResponse = await this.supabaseStorageRequest({
        bucket: 'user-avatars',
        path: fileName,
        file: fileData,
        options: {
          contentType: 'image/jpeg',
          upsert: true
        }
      })
      
      if (uploadResponse.error) {
        throw new Error(uploadResponse.error.message)
      }
      
      // 获取公共URL
      const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/user-avatars/${fileName}`
      
      return {
        success: true,
        url: publicUrl,
        path: fileName
      }
    } catch (error) {
      console.error('头像上传失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 读取微信临时文件
   * @param {string} tempFilePath - 临时文件路径
   * @returns {Promise<ArrayBuffer>} 文件数据
   */
  async readTempFile(tempFilePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: tempFilePath,
        success: (res) => resolve(res.data),
        fail: reject
      })
    })
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
   * Supabase Storage API请求封装
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async supabaseStorageRequest(options) {
    const { bucket, path, file, options: uploadOptions = {} } = options
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.supabaseUrl}/storage/v1/object/${bucket}/${path}`,
        method: 'POST',
        data: file,
        header: {
          'apikey': this.supabaseAnonKey,
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': uploadOptions.contentType || 'application/octet-stream'
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: res.data, error: null })
          } else {
            resolve({ data: null, error: { message: `HTTP ${res.statusCode}: ${JSON.stringify(res.data)}` } })
          }
        },
        fail: (error) => resolve({ data: null, error })
      })
    })
  }

  /**
   * 验证手机号（使用微信官方手机号验证组件）
   * @param {string} code - 微信返回的code
   * @returns {Promise<Object>} 验证结果
   */
  async verifyPhoneNumber(code) {
    try {
      // 模拟后端验证手机号
      await new Promise(resolve => setTimeout(resolve, 1500)) // 模拟网络延迟
      
      // 模拟解析手机号（实际中需要后端接口）
      const phoneNumber = '138****' + Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      
      return {
        success: true,
        phoneNumber: phoneNumber
      }
    } catch (error) {
      console.error('手机号验证失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 与真实后端进行认证（需要后端实现对应的RPC函数）
   * @param {Object} data - 认证数据
   * @returns {Promise<Object>} 认证结果
   */
  async authenticateWithBackend(data) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.supabaseUrl}/rest/v1/rpc/wechat_login`,
        method: 'POST',
        header: {
          'apikey': this.supabaseAnonKey,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseAnonKey}`
        },
        data: {
          wechat_code: data.code,
          user_info: data.userInfo
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve({
              success: true,
              user: res.data
            })
          } else {
            reject(new Error(`认证失败: ${res.statusCode} ${res.data?.message || ''}`))
          }
        },
        fail: (error) => {
          reject(new Error('网络请求失败: ' + error.errMsg))
        }
      })
    })
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

  /**
   * 获取本地用户会话
   * @returns {Object|null} 用户信息
   */
  getLocalUserSession() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      const lastLoginTime = wx.getStorageSync('lastLoginTime')
      
      // 检查会话是否过期（7天）
      const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000
      if (userInfo && lastLoginTime && (Date.now() - lastLoginTime < SESSION_DURATION)) {
        return userInfo
      }
    } catch (error) {
      console.error('获取本地用户会话失败:', error)
    }
    return null
  }

  /**
   * 登出
   * @returns {Promise<Object>} 登出结果
   */
  async logout() {
    try {
      // 清除本地存储
      wx.removeStorageSync('userInfo')
      wx.removeStorageSync('lastLoginTime')
      
      // 清除全局状态
      try {
        const app = getApp()
        if (app && app.globalData) {
          app.globalData.userInfo = null
          app.globalData.isLoggedIn = false
        }
      } catch (error) {
        console.warn('清除全局状态失败:', error)
      }
      
      return { success: true }
    } catch (error) {
      console.error('登出失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 检查登录状态
   * @returns {Promise<boolean>} 是否已登录
   */
  async checkLoginStatus() {
    // 检查全局状态
    try {
      const app = getApp()
      if (app && app.globalData && app.globalData.isLoggedIn && app.globalData.userInfo) {
        return true
      }
    } catch (error) {
      console.warn('检查全局状态失败:', error)
    }

    // 检查本地存储
    const localUser = this.getLocalUserSession()
    if (localUser) {
      // 恢复全局状态
      try {
        const app = getApp()
        if (app && app.globalData) {
          app.globalData.userInfo = localUser
          app.globalData.isLoggedIn = true
        }
      } catch (error) {
        console.warn('恢复全局状态失败:', error)
      }
      return true
    }

    return false
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
   * 检查用户权限
   * @param {string} permission - 权限类型
   * @returns {boolean} 是否有权限
   */
  hasPermission(permission) {
    const user = this.getCurrentUser()
    if (!user) return false

    switch (permission) {
      case 'admin':
        return user.role === 'admin'
      case 'user':
        return user.role === 'user' || user.role === 'admin'
      default:
        return false
    }
  }

  /**
   * 绑定ORCID
   * @param {string} orcid - ORCID标识
   * @returns {Promise<Object>} 绑定结果
   */
  async bindOrcid(orcid) {
    // 验证ORCID格式
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    if (!orcidRegex.test(orcid)) {
      return { success: false, error: 'ORCID格式不正确' }
    }

    // 模拟更新用户信息
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        return { success: false, error: '用户未登录' }
      }

      const updatedUser = { ...currentUser, orcid }
      await this.saveUserSession(updatedUser)
      try {
        const app = getApp()
        if (app && app.globalData) {
          app.globalData.userInfo = updatedUser
        }
      } catch (error) {
        console.warn('更新全局状态失败:', error)
      }

      return { success: true, user: updatedUser }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 更新学术领域偏好
   * @param {Array} academicFields - 学术领域数组
   * @returns {Promise<Object>} 更新结果
   */
  async updateAcademicFields(academicFields) {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        return { success: false, error: '用户未登录' }
      }

      const updatedUser = { 
        ...currentUser, 
        academic_field: { fields: academicFields } 
      }
      await this.saveUserSession(updatedUser)
      try {
        const app = getApp()
        if (app && app.globalData) {
          app.globalData.userInfo = updatedUser
        }
      } catch (error) {
        console.warn('更新全局状态失败:', error)
      }

      return { success: true, user: updatedUser }
    } catch (error) {
      return { success: false, error: error.message }
    }
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
        return 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/icons/nav-profile.svg'
      }

      // 如果是storage引用格式，生成签名URL
      if (user.avatar_url.startsWith('storage:user_profile/')) {
        const storagePath = user.avatar_url.replace('storage:user_profile/', '')
        const signedUrlResult = await this.storageService.generateUserFileSignedUrl(storagePath, 86400)
        
        if (signedUrlResult.success) {
          return signedUrlResult.signedUrl
        } else {
          console.warn('生成头像签名URL失败:', signedUrlResult.error)
          return 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/icons/nav-profile.svg'
        }
      }

      // 如果是已经签名的URL或者是公共URL，直接返回
      if (user.avatar_url.startsWith('https://') || user.avatar_url.startsWith('http://')) {
        return user.avatar_url
      }

      // 如果是微信头像URL，直接返回
      if (user.avatar_url.includes('qlogo.cn') || user.avatar_url.includes('wx.qlogo.cn')) {
        return user.avatar_url
      }

      // 回退到默认头像
      return 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/icons/nav-profile.svg'
      
    } catch (error) {
      console.error('获取头像显示URL失败:', error)
      return 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/icons/nav-profile.svg'
    }
  }
}

// 创建并导出认证服务实例
const authService = new AuthService()
module.exports = authService