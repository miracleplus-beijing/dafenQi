// 收藏页面逻辑
const app = getApp()

Page({
  data: {
    favoriteList: []
  },

  onLoad: function (options) {
    this.loadFavoriteList()
  },

  onShow: function () {
    this.loadFavoriteList()
  },

  loadFavoriteList: function() {
    const favoriteList = app.globalData.favoriteList.map(item => ({
      ...item,
      favoriteTimeText: this.formatTime(item.favoriteTime)
    }))
    
    this.setData({
      favoriteList: favoriteList
    })
  },

  formatTime: function(timestamp) {
    const date = new Date(timestamp)
    return date.toLocaleDateString()
  },

  playFavoriteItem: function(e) {
    const item = e.currentTarget.dataset.item
    wx.switchTab({
      url: '/pages/browse/browse'
    })
  },

  removeFromFavorites: function(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这个内容吗？',
      success: (res) => {
        if (res.confirm) {
          app.removeFromFavorites(id)
          this.loadFavoriteList()
          wx.showToast({
            title: '已取消收藏',
            icon: 'success'
          })
        }
      }
    })
  }
})