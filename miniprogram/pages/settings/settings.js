// 设置页面逻辑
const app = getApp()

Page({
  data: {
    
  },

  onLoad: function (options) {
    
  },

  // 处理菜单项点击
  handleMenuClick: function(e) {
    const type = e.currentTarget.dataset.type
    
    switch(type) {
      case 'privacy-policy':
        wx.navigateTo({
          url: '/pages/privacy-policy/privacy-policy'
        })
        break
      case 'service-agreement':
        wx.navigateTo({
          url: '/pages/service-agreement/service-agreement'
        })
        break
      case 'data-collection':
        wx.navigateTo({
          url: '/pages/data-collection/data-collection'
        })
        break
      case 'personal-info':
        wx.navigateTo({
          url: '/pages/personal-info/personal-info'
        })
        break
      case 'cancel-account':
        this.handleCancelAccount()
        break
      default:
        console.log('未知菜单项:', type)
    }
  },

  // 处理账户注销
  handleCancelAccount: function() {
    wx.showModal({
      title: '注销账户',
      content: '注销账户后，您的所有数据将被永久删除且无法恢复。确定要注销账户吗？',
      confirmText: '确定注销',
      cancelText: '取消',
      confirmColor: '#FF4444',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/account-cancel/account-cancel'
          })
        }
      }
    })
  }
})