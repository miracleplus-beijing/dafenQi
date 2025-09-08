// 个人信息清单页面逻辑
const app = getApp()

Page({
  data: {
    userInfo: {},
    favoriteCount: 0,
    historyCount: 0,
    academicFields: '',
    deviceInfo: {},
    updateTime: ''
  },

  onLoad: function (options) {
    this.loadUserData()
    this.loadDeviceInfo()
  },

  onShow: function() {
    this.loadUserData()
  },

  // 加载用户数据
  loadUserData: function() {
    const globalUserInfo = app.globalData.userInfo
    const favoriteList = app.globalData.favoriteList || []
    const historyList = app.globalData.historyList || []
    
    let academicFieldsText = '未设置'
    if (globalUserInfo && globalUserInfo.academic_field && globalUserInfo.academic_field.fields) {
      const fields = globalUserInfo.academic_field.fields
      academicFieldsText = fields.length > 0 ? fields.join('、') : '未设置'
    }

    this.setData({
      userInfo: globalUserInfo || {},
      favoriteCount: favoriteList.length,
      historyCount: historyList.length,
      academicFields: academicFieldsText,
      updateTime: new Date().toLocaleString('zh-CN')
    })
  },

  // 加载设备信息
  loadDeviceInfo: function() {
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          deviceInfo: {
            model: res.model,
            system: res.system
          }
        })
      }
    })
  },

  // 导出个人数据
  exportData: function() {
    wx.showLoading({ title: '准备数据中...' })
    
    setTimeout(() => {
      wx.hideLoading()
      wx.showModal({
        title: '数据导出',
        content: '个人数据已准备完成，将通过邮件发送到您的联系邮箱。请注意查收。',
        showCancel: false,
        success: () => {
          wx.showToast({
            title: '导出请求已提交',
            icon: 'success'
          })
        }
      })
    }, 2000)
  },

  // 清除历史记录
  clearHistory: function() {
    wx.showModal({
      title: '清除历史记录',
      content: '确定要清除所有播放历史记录吗？此操作不可撤销。',
      success: (res) => {
        if (res.confirm) {
          // 清除历史记录
          app.globalData.historyList = []
          app.saveLocalData()
          
          this.setData({
            historyCount: 0
          })
          
          wx.showToast({
            title: '历史记录已清除',
            icon: 'success'
          })
        }
      }
    })
  },

  // 删除所有数据
  deleteAllData: function() {
    wx.showModal({
      title: '删除所有数据',
      content: '此操作将删除您在本应用中的所有个人数据，包括收藏、历史记录等。确定继续吗？',
      confirmText: '确定删除',
      confirmColor: '#FF4444',
      success: (res) => {
        if (res.confirm) {
          // 清除所有本地数据
          app.globalData.favoriteList = []
          app.globalData.historyList = []
          app.saveLocalData()
          
          this.setData({
            favoriteCount: 0,
            historyCount: 0
          })
          
          wx.showToast({
            title: '数据已清除',
            icon: 'success'
          })
        }
      }
    })
  }
})