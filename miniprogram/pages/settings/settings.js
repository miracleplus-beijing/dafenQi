// 设置页面逻辑
const app = getApp()

Page({
  data: {
    settings: {
      autoPlay: true,
      downloadQuality: 'high',
      pushNotification: true
    },
    qualityOptions: ['标清', '高清', '超清'],
    qualityIndex: 1,
    cacheSize: '12.5MB',
    version: '1.0.0'
  },

  onLoad: function (options) {
    this.loadSettings()
  },

  loadSettings: function() {
    const settings = app.globalData.settings
    let qualityIndex = 1
    
    switch(settings.downloadQuality) {
      case 'low': qualityIndex = 0; break
      case 'high': qualityIndex = 1; break
      case 'ultra': qualityIndex = 2; break
    }
    
    this.setData({
      settings: settings,
      qualityIndex: qualityIndex
    })
  },

  onAutoPlayChange: function(e) {
    const value = e.detail.value
    app.updateSettings({ autoPlay: value })
    this.setData({
      'settings.autoPlay': value
    })
  },

  onQualityChange: function(e) {
    const index = e.detail.value
    const qualities = ['low', 'high', 'ultra']
    
    app.updateSettings({ downloadQuality: qualities[index] })
    this.setData({
      qualityIndex: index,
      'settings.downloadQuality': qualities[index]
    })
  },

  onPushChange: function(e) {
    const value = e.detail.value
    app.updateSettings({ pushNotification: value })
    this.setData({
      'settings.pushNotification': value
    })
  },

  clearCache: function() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清除中...' })
          setTimeout(() => {
            wx.hideLoading()
            this.setData({ cacheSize: '0MB' })
            wx.showToast({
              title: '缓存已清除',
              icon: 'success'
            })
          }, 1000)
        }
      }
    })
  },

  checkUpdate: function() {
    wx.showLoading({ title: '检查中...' })
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '已是最新版本',
        icon: 'success'
      })
    }, 1000)
  },

  showAbout: function() {
    wx.showModal({
      title: '关于达芬Qi说',
      content: '达芬Qi说 v1.0.0\n\n听见学术的声音\n\n© 2024 达芬Qi说 版权所有',
      showCancel: false
    })
  }
})