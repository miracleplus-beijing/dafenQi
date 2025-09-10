App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    isGuestMode: false,
    currentProgress: 0,
    maxProgress: 100,
    isPlaying: false,
    currentPodcast: null,
    favoriteList: [],
    historyList: [],
    settings: {
      autoPlay: false, // 禁用自动播放
      downloadQuality: 'high',
      theme: 'light'
    },
    // Supabase配置
    supabaseUrl: 'https://gxvfcafgnhzjiauukssj.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmZjYWZnbmh6amlhdXVrc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY4NjAsImV4cCI6MjA3MTAwMjg2MH0.uxO5eyw0Usyd59UKz-S7bTrmOnNPg9Ld9wJ6pDMIQUA'
  },

  onLaunch: function () {
    console.log('达芬Qi说小程序启动')
    
    // 初始化隐私检查
    this.initPrivacyCheck()
    
    // 初始化认证服务
    this.initAuthService()
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 加载本地数据
    this.loadLocalData()
  },

  onShow: function (options) {
    console.log('小程序显示', options)
  },

  onHide: function () {
    console.log('小程序隐藏')
    // 保存数据
    this.saveLocalData()
  },

  initAuthService: function() {
    // 导入认证服务
    const authService = require('./services/auth.service.js')
    this.authService = authService
  },

  async checkLoginStatus() {
    try {
      if (this.authService) {
        const isLoggedIn = await this.authService.checkLoginStatus()
        console.log('登录状态检查结果:', isLoggedIn)
      } else {
        // 兼容旧版本检查
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo) {
          this.globalData.userInfo = userInfo
          this.globalData.isLoggedIn = true
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
    }
  },

  loadLocalData: function() {
    try {
      const favoriteList = wx.getStorageSync('favoriteList') || []
      const historyList = wx.getStorageSync('historyList') || []
      const settings = wx.getStorageSync('settings') || this.globalData.settings
      
      this.globalData.favoriteList = favoriteList
      this.globalData.historyList = historyList
      this.globalData.settings = settings
    } catch (e) {
      console.error('加载本地数据失败', e)
    }
  },

  saveLocalData: function() {
    try {
      wx.setStorageSync('favoriteList', this.globalData.favoriteList)
      wx.setStorageSync('historyList', this.globalData.historyList)
      wx.setStorageSync('settings', this.globalData.settings)
    } catch (e) {
      console.error('保存本地数据失败', e)
    }
  },

  // 全局方法
  login: function(userInfo) {
    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = true
    wx.setStorageSync('userInfo', userInfo)
  },

  logout: function() {
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
    wx.removeStorageSync('userInfo')
  },

  addToFavorites: function(item) {
    const favorites = this.globalData.favoriteList
    const index = favorites.findIndex(fav => fav.id === item.id)
    if (index === -1) {
      favorites.unshift(item)
      this.saveLocalData()
      return true
    }
    return false
  },

  removeFromFavorites: function(itemId) {
    const favorites = this.globalData.favoriteList
    const index = favorites.findIndex(fav => fav.id === itemId)
    if (index !== -1) {
      favorites.splice(index, 1)
      this.saveLocalData()
      return true
    }
    return false
  },

  addToHistory: function(item) {
    const history = this.globalData.historyList
    const index = history.findIndex(h => h.id === item.id)
    
    // 如果已存在，先删除旧记录
    if (index !== -1) {
      history.splice(index, 1)
    }
    
    // 添加到开头
    history.unshift({
      ...item,
      playTime: new Date().getTime()
    })
    
    // 限制历史记录数量
    if (history.length > 100) {
      history.splice(100)
    }
    
    this.saveLocalData()
  },

  updateSettings: function(newSettings) {
    this.globalData.settings = {
      ...this.globalData.settings,
      ...newSettings
    }
    this.saveLocalData()
  },

  // 初始化全局隐私检查
  initPrivacyCheck: function() {
    // 检查基础库版本
    try {
      const appBaseInfo = wx.getAppBaseInfo()
      const SDKVersion = appBaseInfo.SDKVersion || '1.0.0'
      
      // 如果基础库版本过低，跳过隐私检查
      if (this.compareVersion(SDKVersion, '2.32.3') < 0) {
        console.warn('基础库版本过低，不支持隐私接口')
        return
      }
    } catch (error) {
      console.warn('获取基础库版本失败，使用兼容模式:', error)
      // 如果新API不可用，回退到旧API
      try {
        const systemInfo = wx.getSystemInfoSync()
        const SDKVersion = systemInfo.SDKVersion || '1.0.0'
        if (this.compareVersion(SDKVersion, '2.32.3') < 0) {
          console.warn('基础库版本过低，不支持隐私接口')
          return
        }
      } catch (fallbackError) {
        console.warn('获取系统信息失败，跳过隐私检查:', fallbackError)
        return
      }
    }

    try {
      // 设置全局被动监听隐私授权
      wx.onNeedPrivacyAuthorization((resolve, eventInfo) => {
        console.log('全局触发隐私授权事件, 接口:', eventInfo.referrer)
        
        // 获取当前页面
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        
        if (currentPage && currentPage.handleGlobalPrivacyAuth) {
          // 如果当前页面有处理方法，交给页面处理
          currentPage.handleGlobalPrivacyAuth(resolve, eventInfo)
        } else {
          // 否则显示全局隐私弹窗
          this.showGlobalPrivacyModal(resolve, eventInfo)
        }
      })
    } catch (error) {
      console.error('全局隐私检查初始化失败:', error)
    }
  },

  // 显示全局隐私弹窗
  showGlobalPrivacyModal: function(resolve, eventInfo) {
    wx.showModal({
      title: '隐私保护指引',
      content: `为了给您提供更好的服务，${eventInfo.referrer ? `"${eventInfo.referrer}"功能` : '该功能'}需要获取您的相关信息。\n\n我们承诺严格保护您的个人隐私，仅用于改善用户体验。`,
      confirmText: '同意',
      cancelText: '拒绝',
      success: (res) => {
        if (res.confirm) {
          // 用户同意
          resolve({ event: 'agree' })
          
          wx.showToast({
            title: '已同意隐私协议',
            icon: 'success',
            duration: 1500
          })
        } else {
          // 用户拒绝
          resolve({ event: 'disagree' })
          
          wx.showToast({
            title: '您拒绝了隐私授权',
            icon: 'none',
            duration: 2000
          })
        }
      }
    })
  },

  // 版本比较函数
  compareVersion: function(version1, version2) {
    const v1 = version1.split('.')
    const v2 = version2.split('.')
    const len = Math.max(v1.length, v2.length)

    while (v1.length < len) {
      v1.push('0')
    }
    while (v2.length < len) {
      v2.push('0')
    }

    for (let i = 0; i < len; i++) {
      const num1 = parseInt(v1[i])
      const num2 = parseInt(v2[i])

      if (num1 > num2) {
        return 1
      } else if (num1 < num2) {
        return -1
      }
    }

    return 0
  }
})