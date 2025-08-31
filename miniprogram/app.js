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
  }
})