/**
 * 认证服务
 * 使用Supabase Auth处理微信登录、用户信息管理等认证相关功能
 */

const storageService = require('./storage.service.js')

class AuthService {
  constructor() {
    this.supabaseUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co'
    this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmZjYWZnbmh6amlhdXVrc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY4NjAsImV4cCI6MjA3MTAwMjg2MH0.uxO5eyw0Usyd59UKz-S7bTrmOnNPg9Ld9wJ6pDMIQUA'
    this.storageService = require('./storage.service.js')

    // Initialize Supabase client-like functionality
    this.currentSession = null
    this.currentUser = null
  }

  /**
   * 微信登录（使用Supabase Auth）
   * @returns {Promise<Object>} 登录结果
   */
  async loginWithWechat() {
    try {
      // 1. 获取微信登录code
      const loginResult = await this.getWechatLoginCode()
      if (!loginResult.code) {
        throw new Error('获取微信登录code失败')
      }

      console.log('微信登录code获取成功:', loginResult.code)

      // 2. 调用Edge Function进行认证
      const authResult = await this.callWechatAuthFunction(loginResult.code)

      if (!authResult.success) {
        throw new Error(authResult.error || '认证失败')
      }

      // 3. 设置会话
      await this.setSession(authResult.session)

      // 4. 更新全局状态
      const user = authResult.user
      await this.saveUserSession(user)

      try {
        const app = getApp()
        if (app && app.globalData) {
          app.globalData.userInfo = user
          app.globalData.isLoggedIn = true
        }
      } catch (error) {
        console.warn('更新全局状态失败:', error)
      }

      console.log('微信登录成功:', user)
      return { success: true, user }

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
   * 调用微信认证Edge Function（带Authorization header）
   * @param {string} code - 操作代码
   * @param {Object} userInfo - 用户信息（可选）
   * @param {string} accessToken - 用户access token
   * @returns {Promise<Object>} 认证结果
   */
  async callWechatAuthFunctionWithAuth(code, userInfo = null, accessToken) {
    try {
      console.log('调用wechat-auth Edge Function (带认证)...', { code, hasUserInfo: !!userInfo })

      const response = await this.supabaseRequest({
        url: '/functions/v1/wechat-auth',
        method: 'POST',
        data: {
          code: code,
          userInfo: userInfo
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })

      console.log('Edge Function (带认证) 响应:', response)
      return response

    } catch (error) {
      console.error('调用Edge Function (带认证) 失败:', error)
      throw error
    }
  }

  /**
   * 调用微信认证Edge Function
   * @param {string} code - 微信登录code
   * @param {Object} userInfo - 用户信息（可选）
   * @returns {Promise<Object>} 认证结果
   */
  async callWechatAuthFunction(code, userInfo = null) {
    try {
      console.log('调用wechat-auth Edge Function...')

      const response = await this.supabaseRequest({
        url: '/functions/v1/wechat-auth',
        method: 'POST',
        data: {
          code: code,
          userInfo: userInfo
        },
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.log('Edge Function响应:', response)
      return response

    } catch (error) {
      console.error('调用Edge Function失败:', error)
      throw error
    }
  }

  /**
   * 智能登录 - 自动判断用户是否需要跳转到login页面
   * @returns {Promise<Object>} 智能登录结果
   */
  async smartLogin() {
    try {
      console.log('开始智能登录流程...')

      // 1. 尝试进行微信登录
      const loginResult = await this.loginWithWechat()

      if (!loginResult.success) {
        return {
          success: false,
          action: 'error',
          error: loginResult.error
        }
      }

      const user = loginResult.user

      // 2. 根据Edge Function返回的isNew字段判断用户类型

      const isCompleted = this.checkProfileCompleteness(user)
      if (user.isNew === true || !isCompleted) {
        // 新用户，需要跳转到完善个人信息页面
        console.log('检测到新用户或者 信息缺失，需要完善个人信息')
        return {
          success: true,
          action: 'goto_login',
          user: user,
          message: '欢迎使用达芬Qi说！请完善您的个人信息'
        }
      } else {
        // 老用户，直接跳转到profile
        console.log('检测到老用户，直接登录')
        return {
          success: true,
          action: 'goto_profile',
          user: user,
          message: '欢迎回来！'
        }
      }

    } catch (error) {
      console.error('智能登录失败:', error)
      return {
        success: false,
        action: 'error',
        error: error.message
      }
    }
  }

  /**
   * 检查用户信息完整性
   * @param {Object} user - 用户信息
   * @returns {boolean} 是否完整
   */
  checkProfileCompleteness(user) {
    if (!user) return false

    // 检查必要的用户信息字段
    const hasNickname = user.nickname || user.nickName
    const hasAvatar = user.avatar_url || user.avatarUrl

    // 可以根据业务需求调整完整性标准
    return !!(hasNickname && hasAvatar && user.id)
  }

  /**
   * 设置Supabase Auth会话
   * @param {Object} session - 会话信息
   */
  async setSession(session) {
    console.log("set session: " + session )
    this.currentSession = session
    this.currentUser = session?.user || null

    // 保存到本地存储
    if (session) {
      try {
        wx.setStorageSync('supabase_session', session)
        wx.setStorageSync('lastLoginTime', Date.now())
      } catch (error) {
        console.error('保存会话到本地失败:', error)
      }
    }
  }

  /**
   * 获取当前会话 (简化版本，遵循Supabase最佳实践)
   * @returns {Object|null} 当前会话
   */
  getSession() {
    try {
      // 尝试从本地存储恢复 (简化验证)
      return this.recoverSessionFromStorage()
    } catch (error) {
      console.error('获取session时发生异常:', error)
      return { data: { session: null }, error: error.message }
    }
  }

  /**
   * 从本地存储恢复session (简化版本)
   * @returns {Object} session结果
   */
  recoverSessionFromStorage() {
    try {
      const session = wx.getStorageSync('supabase_session')
      const lastLoginTime = wx.getStorageSync('lastLoginTime')

      if (!session) {
        return { data: { session: null }, error: null }
      }

      // 只检查基本的时间过期（7天），移除复杂的JWT验证
      const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000
      const isTimeExpired = !lastLoginTime || (Date.now() - lastLoginTime >= SESSION_DURATION)

      if (isTimeExpired) {
        console.log('Session时间已过期，清理存储')
        this.clearStorageSession()
        return { data: { session: null }, error: null }
      }

      // 基本结构检查（简化）
      if (!session.access_token || !session.user || !session.user.id) {
        console.warn('Session结构不完整，清理存储')
        this.clearStorageSession()
        return { data: { session: null }, error: null }
      }

      // 恢复有效session到内存
      this.currentSession = session
      this.currentUser = session.user

      console.log('成功恢复session，用户:', session.user)
      return { data: { session }, error: null }

    } catch (error) {
      console.error('从本地存储恢复session失败:', error)
      this.clearStorageSession()
      return { data: { session: null }, error: error.message }
    }
  }

  /**
   * 验证session结构的完整性
   * @param {Object} session - session对象
   * @returns {boolean} 是否有效
   */
  validateSessionStructure(session) {
    try {
      if (!session || typeof session !== 'object') {
        console.warn('Session不是有效对象')
        return false
      }

      // 检查必需字段
      const requiredFields = ['access_token', 'user']
      for (const field of requiredFields) {
        if (!session[field]) {
          console.warn(`Session缺少必需字段: ${field}`)
          return false
        }
      }

      // 检查user对象结构
      if (!session.user.id || !session.user.email) {
        console.warn('Session中的user对象结构无效')
        return false
      }

      // 检查access_token格式
      if (typeof session.access_token !== 'string' || session.access_token.trim() === '') {
        console.warn('Session中的access_token格式无效')
        return false
      }

      return true
    } catch (error) {
      console.error('验证session结构时出错:', error)
      return false
    }
  }

  /**
   * 清理当前内存中的session
   */
  clearCurrentSession() {
    try {
      this.currentSession = null
      this.currentUser = null
      console.log('已清理内存中的session')
    } catch (error) {
      console.error('清理内存session失败:', error)
    }
  }

  /**
   * 清理本地存储中的session
   */
  clearStorageSession() {
    try {
      wx.removeStorageSync('supabase_session')
      wx.removeStorageSync('userInfo')
      wx.removeStorageSync('lastLoginTime')
      console.log('已清理本地存储中的session')
    } catch (error) {
      console.error('清理本地存储session失败:', error)
    }
  }

  /**
   * 检查JWT token是否过期
   * @param {string} token - JWT token
   * @returns {boolean} 是否过期
   */
  isTokenExpired(token) {
    try {
      // 严格的token格式验证
      if (!token || typeof token !== 'string' || token.trim() === '') {
        console.warn('Token为空或格式无效')
        return true
      }

      const trimmedToken = token.trim()
      const parts = trimmedToken.split('.')

      if (parts.length !== 3) {
        console.warn('JWT token格式错误，parts长度:', parts.length)
        return true
      }

      // 验证每个部分都不为空
      if (!parts[0] || !parts[1] || !parts[2]) {
        console.warn('JWT token部分为空')
        return true
      }

      // 验证payload部分的Base64编码
      const payload = parts[1]

      // 添加padding if needed
      let paddedPayload = payload
      while (paddedPayload.length % 4) {
        paddedPayload += '='
      }

      // 验证是否为有效的Base64字符串
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      if (!base64Regex.test(paddedPayload)) {
        console.warn('JWT payload不是有效的Base64编码')
        return true
      }

      // 尝试解码payload
      let decodedPayload
      try {
        decodedPayload = JSON.parse(atob(paddedPayload))
      } catch (decodeError) {
        console.error('JWT payload解码失败:', decodeError)
        return true
      }

      // 检查exp字段
      if (!decodedPayload.exp || typeof decodedPayload.exp !== 'number') {
        console.warn('JWT token缺少有效的exp字段')
        return true
      }

      // exp是Unix时间戳（秒），需要转换为毫秒
      const expirationTime = decodedPayload.exp * 1000
      const currentTime = Date.now()

      // 提前5分钟判断为过期，给刷新留时间
      const bufferTime = 5 * 60 * 1000

      const isExpired = currentTime >= (expirationTime - bufferTime)

      if (isExpired) {
        console.log('JWT token已过期或即将过期')
      }

      return isExpired
    } catch (error) {
      console.error('JWT token验证异常:', error)
      return true
    }
  }

  /**
   * 获取JWT token的剩余有效时间
   * @param {string} token - JWT token
   * @returns {number} 剩余时间（毫秒），-1表示无效
   */
  getTokenRemainingTime(token) {
    try {
      if (!token || typeof token !== 'string') {
        return -1
      }

      const parts = token.split('.')
      if (parts.length !== 3) {
        return -1
      }

      const payload = JSON.parse(atob(parts[1]))
      if (!payload.exp) {
        return -1
      }

      const expirationTime = payload.exp * 1000
      const currentTime = Date.now()

      return Math.max(0, expirationTime - currentTime)
    } catch (error) {
      console.error('解析JWT token失败:', error)
      return -1
    }
  }

  /**
   * 获取当前认证用户 (异步方法，遵循Supabase最佳实践)
   * @returns {Promise<Object>} 当前用户结果
   */
  async getUser() {
    try {

      // 从存储恢复会话和用户信息
      const sessionResult = this.getSession()
      if (sessionResult.data.session?.user) {
        this.currentUser = sessionResult.data.session.user
        return { data: { user: this.currentUser }, error: null }
      }

      return { data: { user: null }, error: null }
    } catch (error) {
      console.error('获取用户信息时发生异常:', error)
      return { data: { user: null }, error: error.message }
    }
  }


  /**
   * 更新用户信息（使用Supabase Auth）
   * @param {Object} userInfo - 用户信息
   * @returns {Promise<Object>} 更新结果
   */
  async updateUserInfo(userInfo) {
    console.log("要更新的用户信息：" + userInfo)

    try {
      const userResult = await this.getUser()
      if (!userResult.data.user) {
        return { success: false, error: '用户未登录' }
      }
  


      const currentUser = userResult.data.user
      console.log('更新用户信息:', userInfo)
      console.log('当前用户信息:', currentUser)
      if (!userInfo.nickName) {
        userInfo.nickName = currentUser.nickName
      }
      // 处理头像上传
      let finalAvatarUrl = null
      if (userInfo.avatarUrl) {
        if (userInfo.avatarUrl.includes('tmp') || userInfo.avatarUrl.includes('temp') || userInfo.avatarUrl.includes('wxfile://')) {

          console.log('开始调用uploadUserFileToBucket:', {
            userId: currentUser.id,
            fileType: 'avatar',
            tempFilePath: userInfo.avatarUrl
          })

          const uploadResult = await this.storageService.uploadUserFileToPublicBucket(
            currentUser.id,
            'avatar',
            userInfo.avatarUrl
          )

          console.log('头像上传结果:', uploadResult)

          if (uploadResult.success) {
          
            finalAvatarUrl = uploadResult.publicUrl
            console.log('头像上传成功，存储路径:', finalAvatarUrl)
          } else {
            console.error('头像上传失败:', uploadResult.error)
            // 使用默认头像
            finalAvatarUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png'
          }
        } else {
          finalAvatarUrl =  userInfo.avatarUrl
        }
      }

      // 调用Edge Function更新用户信息
      const updateData = {
        code: 'update_user_info', // 特殊标识
        userInfo: {
          nickName: userInfo.nickName,
          avatarUrl: finalAvatarUrl
        }
      }

      console.log('调用Edge Function更新用户信息:', updateData)

      // 获取当前session的token用于认证
      const currentSession = this.getSession()
      if (!currentSession.data.session?.access_token) {
        console.error('无法获取access_token进行Edge Function调用')
        return { success: false, error: '认证状态异常，请重新登录' }
      }

      const authResult = await this.callWechatAuthFunctionWithAuth('update_user_info', updateData.userInfo, currentSession.data.session.access_token)

      console.log("authResult: " + authResult)
      if (!authResult.success) {
        throw new Error(authResult.error || '更新失败')
      }



      currentSession.data.session.user = authResult.user
      await this.setSession(currentSession.data.session)
      console.log('用户信息更新成功:', authResult.user)
      return { success: true, user: authResult.user }

    } catch (error) {
      console.error('更新用户信息失败:', error)
      return {
        success: false,
        error: error.message || '更新失败，请重试'
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
   * 刷新用户session
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshSession() {
    try {
      const sessionResult = this.getSession()
      if (!sessionResult.data.session?.refresh_token) {
        console.log('没有可用的refresh_token')
        return { success: false, error: 'No refresh token available' }
      }

      console.log('尝试刷新session...')

      // 调用Edge Function进行session刷新
      const response = await this.supabaseRequest({
        url: '/functions/v1/wechat-auth',
        method: 'POST',
        data: {
          code: 'refresh_session',
          refresh_token: sessionResult.data.session.refresh_token
        },
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.success && response.session) {
        console.log('Session刷新成功')
        await this.setSession(response.session)

        // 更新全局状态
        try {
          const app = getApp()
          if (app && app.globalData) {
            app.globalData.userInfo = response.user
            app.globalData.isLoggedIn = true
          }
        } catch (error) {
          console.warn('更新全局状态失败:', error)
        }

        return { success: true, session: response.session }
      } else {
        console.warn('Session刷新失败:', response.error)
        return { success: false, error: response.error || 'Refresh failed' }
      }

    } catch (error) {
      console.error('Session刷新异常:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 登出
   * @returns {Promise<Object>} 登出结果
   */
  async logout() {
  try {
    // 1. 清除 Supabase Auth 会话（内存中的状态）
    this.currentSession = null;
    this.currentUser = null;

    // 2. 一键清除所有本地存储（替代逐个删除）
    // 注意：会删除所有通过 wx.setStorageSync 存储的数据
    wx.clearStorageSync();

    // 3. 清除全局状态
    try {
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = null;
        app.globalData.isLoggedIn = false;
        // 可补充其他全局状态的清除（如 token、权限等）
      }
    } catch (error) {
      console.warn('清除全局状态失败:', error);
    }


    console.log('用户已彻底登出');
    return { success: true };
  } catch (error) {
    console.error('登出失败:', error);
    return { success: false, error: error.message };
  }
}
  /**
   * 检查登录状态
   * @returns {Promise<boolean>} 是否已登录
   */
  async checkLoginStatus() {
    try {
      // 检查Supabase Auth会话
      const sessionResult = this.getSession()
      if (sessionResult.data.session?.user) {
        const user = sessionResult.data.session.user

        // 转换用户数据格式
        const userInfo = {
          id: user.id,
          email: user.email,
          nickName: user?.nickname || '微信用户',  // 统一使用nickName
          avatarUrl: user?.avatar_url,            // 统一使用avatarUrl
          nickname: user?.nickname || '微信用户', // 保持兼容性
          avatar_url: user?.avatar_url,           // 保持兼容性
          wechat_openid: user?.wechat_openid,
          display_name: user?.nickname || '微信用户',
          has_user_info: !!(user?.nickname && user?.avatar_url)
        }

        // 更新全局状态
        try {
          const app = getApp()
          if (app && app.globalData) {
            app.globalData.userInfo = userInfo
            app.globalData.isLoggedIn = true
          }
        } catch (error) {
          console.warn('更新全局状态失败:', error)
        }

        return true
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
    }

    return false
  }

  /**
   * 获取当前用户信息
   * @returns {Promise<Object|null>} 用户信息
   */
  async getCurrentUser() {
    // 优先从Supabase Auth获取
    const userResult = await this.getUser()
    console.log(userResult)
    if (userResult.data.user) {
      const user = userResult.data.user

      const avatarUrl = await this.getAvatarDisplayUrl({
        avatar_url: user?.avatar_url
      })

      return {
        id: user.id,
        email: user.email,
        nickName: user?.nickname || '微信用户',  // 统一使用nickName
        avatarUrl: avatarUrl,                                  // 使用动态生成的头像URL
        nickname: user?.nickname || '微信用户', // 保持兼容性
        avatar_url: user?.avatar_url,           // 原始avatar_url用于重新生成
        wechat_openid: user?.wechat_openid,
        display_name: user?.nickname || '微信用户',
        has_user_info: !!(user?.nickname && user?.avatar_url)
      }
    }

    // 回退到全局状态
    try {
      const app = getApp()
      const globalUser = app && app.globalData ? app.globalData.userInfo : null

      if (globalUser && globalUser.avatar_url) {
        // 也需要为全局状态的用户动态生成头像URL
        const avatarUrl = await this.getAvatarDisplayUrl(globalUser)
        return {
          ...globalUser,
          avatarUrl: avatarUrl
        }
      }

      return globalUser
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
      // 如果没有avatar_url，返回默认头像
      if (!user.avatar_url) {
        return 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png'
      }

      return user.avatar_url

  }

  /**
   * 重试生成签名URL (优化的错误处理和恢复机制)
   * @param {string} filePath - 文件路径
   * @param {number} maxRetries - 最大重试次数
   * @returns {Promise<Object>} 签名URL结果
   */
  async retryGenerateSignedUrl(filePath, maxRetries = 3) {
    let lastError = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`尝试生成签名URL (第${attempt}次尝试):`, filePath)

        const result = await this.storageService.generateUserFileSignedUrl(filePath, 604800)

        if (result.success) {
          console.log(`签名URL生成成功 (第${attempt}次尝试)`)
          return result
        } else {
          lastError = result.error
          console.warn(`签名URL生成失败 (第${attempt}次尝试):`, result.error)

          // 如果不是最后一次尝试，等待后重试
          if (attempt < maxRetries) {
            const delay = Math.min(attempt * 1000, 3000) // 递增延迟，最大3秒
            console.log(`等待${delay}ms后重试...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      } catch (error) {
        lastError = error.message || error
        console.error(`签名URL生成异常 (第${attempt}次尝试):`, error)



        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          const delay = Math.min(attempt * 1000, 3000)
          console.log(`等待${delay}ms后重试...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    return {
      success: false,
      error: lastError || `重试${maxRetries}次后仍然失败`
    }
  }

  /**
   * 判断是否应该尝试认证状态恢复
   * @param {string} errorMessage - 错误消息
   * @returns {Promise<boolean>} 是否应该尝试恢复
   */
  async shouldAttemptRecovery(errorMessage) {
    if (!errorMessage || typeof errorMessage !== 'string') {
      return false
    }

    const recoverableErrors = [
      '过期',
      '登录',
      'Unauthorized',
      'Invalid Compact JWS',
      'exp',
      'token',
      '认证'
    ]

    return recoverableErrors.some(keyword => errorMessage.includes(keyword))
  }


  /**
   * 清理无效认证状态
   * @returns {Promise<void>}
   */
  async clearInvalidSession() {
    try {
      console.log('清理无效的认证状态...')

      // 清理内存状态
      this.clearCurrentSession()

      // 清理本地存储
      this.clearStorageSession()

      console.log('认证状态清理完成')
    } catch (error) {
      console.error('清理认证状态失败:', error)
    }
  }
}

// 创建并导出认证服务实例
const authService = new AuthService()
module.exports = authService