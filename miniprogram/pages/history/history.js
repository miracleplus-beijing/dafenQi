// 历史记录页面逻辑
const app = getApp()

Page({
  data: {
    historyList: []
  },

  onLoad: function (options) {
    this.loadHistoryList()
  },

  onShow: function () {
    this.loadHistoryList()
  },

  loadHistoryList: function() {
    const historyList = app.globalData.historyList.map(item => ({
      ...item,
      playTimeText: this.formatTime(item.playTime)
    }))
    
    this.setData({
      historyList: historyList
    })
  },

  formatTime: function(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
    return Math.floor(diff / 86400000) + '天前'
  },

  playHistoryItem: function(e) {
    const item = e.currentTarget.dataset.item
    wx.switchTab({
      url: '/pages/browse/browse'
    })
  },

  removeFromHistory: function(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          // 从历史记录中删除
          const historyList = app.globalData.historyList.filter(item => item.id !== id)
          app.globalData.historyList = historyList
          app.saveLocalData()
          this.loadHistoryList()
        }
      }
    })
  },

  clearAllHistory: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      confirmColor: '#FF4444',
      success: (res) => {
        if (res.confirm) {
          app.globalData.historyList = []
          app.saveLocalData()
          this.setData({
            historyList: []
          })
          wx.showToast({
            title: '已清空历史记录',
            icon: 'success'
          })
        }
      }
    })
  }
})