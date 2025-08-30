/**
 * 认证服务
 * 处理微信登录、用户信息管理等认证相关功能
 */

class AuthService {
  constructor() {
    this.supabaseUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co'
    this.supabaseAnonKey = getApp().globalData.supabaseAnonKey
  }

  /**
   * 微信登录
   * @param {Object} options - 登录选项
   * @returns {Promise<Object>} 登录结果
   */
  async loginWithWechat(options = {}) {
    try {
      // 1. 获取微信登录code
      const loginResult = await this.getWechatLoginCode()
      if (!loginResult.code) {
        throw new Error('获取微信登录code失败')
      }

      // 2. 获取用户信息（如果需要）
      let userInfo = null
      if (options.needUserInfo) {
        try {
          userInfo = await this.getUserProfile()
        } catch (error) {
          console.warn('获取用户信息失败，将使用默认信息:', error)
        }
      }

      // 3. 模拟后端认证（实际项目中需要真实的后端API）
      const authResult = await this.mockAuthenticateWithBackend({
        code: loginResult.code,
        userInfo
      })

      // 4. 保存用户信息到全局状态
      if (authResult.success) {
        await this.saveUserSession(authResult.user)
        getApp().globalData.userInfo = authResult.user
        getApp().globalData.isLoggedIn = true
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
   * 获取用户信息
   * @returns {Promise<Object>} 用户信息
   */
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve(res.userInfo)
        },
        fail: (error) => {
          reject(new Error('获取用户信息失败: ' + error.errMsg))
        }
      })
    })
  }

  /**
   * 模拟后端认证（实际项目中应该调用真实的后端API）
   * @param {Object} data - 认证数据
   * @returns {Promise<Object>} 认证结果
   */
  async mockAuthenticateWithBackend(data) {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 生成模拟用户数据
    const mockUser = {
      id: 'mock_user_' + Date.now(),
      wechat_openid: 'mock_openid_' + data.code,
      username: data.userInfo?.nickName || '微信用户',
      avatar_url: data.userInfo?.avatarUrl || 'https://example.com/default_avatar.jpg',
      role: 'user',
      orcid: null,
      academic_field: { fields: [] },
      created_at: new Date().toISOString(),
      access_token: 'mock_token_' + Date.now()
    }

    return {
      success: true,
      user: mockUser
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
      getApp().globalData.userInfo = null
      getApp().globalData.isLoggedIn = false
      
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
    if (getApp().globalData.isLoggedIn && getApp().globalData.userInfo) {
      return true
    }

    // 检查本地存储
    const localUser = this.getLocalUserSession()
    if (localUser) {
      // 恢复全局状态
      getApp().globalData.userInfo = localUser
      getApp().globalData.isLoggedIn = true
      return true
    }

    return false
  }

  /**
   * 获取当前用户信息
   * @returns {Object|null} 用户信息
   */
  getCurrentUser() {
    return getApp().globalData.userInfo
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
      getApp().globalData.userInfo = updatedUser

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
      getApp().globalData.userInfo = updatedUser

      return { success: true, user: updatedUser }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

// 创建并导出认证服务实例
const authService = new AuthService()
module.exports = authService