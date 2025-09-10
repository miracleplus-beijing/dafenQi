// 登录页面 - 简化版专注前端交互
const app = getApp()

// 默认头像URL
const defaultAvatarUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png'

Page({
  data: {
    // 用户头像
    avatarUrl: defaultAvatarUrl,
    
    // 是否显示用户信息表单
    showUserInfoForm: false,
    
    // 是否同意协议
    isAgreed: false,
    
    // 主题
    theme: 'light'
  },

  onLoad: function (options) {
    console.log('登录页面加载', options)
    
    // 获取系统主题
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      theme: systemInfo.theme || 'light'
    })
    
    // 监听主题变化
    wx.onThemeChange((result) => {
      this.setData({
        theme: result.theme
      })
    })
  },

  onShow: function () {
    console.log('登录页面显示')
  },

  // 微信登录处理 - 简化版
  handleWechatLogin: function() {
    if (!this.data.isAgreed) {
      wx.showModal({
        title: '提示',
        content: '请先同意《用户协议》和《隐私政策》',
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }

    console.log('开始微信登录流程')
    
    // 显示用户信息完善表单
    this.setData({
      showUserInfoForm: true
    })
    
    wx.showToast({
      title: '请完善个人信息',
      icon: 'none',
      duration: 2000
    })
  },

  // 头像选择 - 完全复刻avatar_nickname逻辑
  onChooseAvatar: function(e) {
    console.log('头像选择事件:', e.detail)
    
    const { avatarUrl } = e.detail
    if (avatarUrl) {
      this.setData({
        avatarUrl: avatarUrl
      })
      
      wx.showToast({
        title: '头像已选择',
        icon: 'success',
        duration: 1500
      })
    } else {
      wx.showToast({
        title: '头像选择失败',
        icon: 'none',
        duration: 1500
      })
    }
  },

  // 完成用户信息设置
  completeUserInfo: function() {
    console.log('完成用户信息设置')
    console.log('当前头像:', this.data.avatarUrl)
    
    // 模拟登录成功
    wx.showLoading({
      title: '保存中...'
    })
    
    setTimeout(() => {
      wx.hideLoading()
      
      wx.showToast({
        title: '设置完成',
        icon: 'success',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            // 返回上一页或跳转到主页
            wx.navigateBack({
              fail: () => {
                wx.switchTab({
                  url: '/pages/browse/browse'
                })
              }
            })
          }, 2000)
        }
      })
    }, 1000)
  },

  // 游客模式
  handleGuestMode: function() {
    wx.showModal({
      title: '游客模式',
      content: '游客模式下部分功能将受限，确定继续吗？',
      confirmText: '继续',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '已进入游客模式',
            icon: 'success',
            duration: 1500,
            success: () => {
              setTimeout(() => {
                wx.switchTab({
                  url: '/pages/browse/browse'
                })
              }, 1500)
            }
          })
        }
      }
    })
  },

  // 快速注册
  handleRegister: function() {
    wx.showToast({
      title: '注册功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  // 切换协议同意状态
  toggleAgreement: function() {
    this.setData({
      isAgreed: !this.data.isAgreed
    })
  },

  // 显示用户协议
  showUserAgreement: function() {
    wx.showModal({
      title: '用户协议',
      content: '这里是用户协议的内容...\\n\\n1. 用户须遵守相关法律法规\\n2. 不得发布违法违规内容\\n3. 尊重他人知识产权\\n4. 保护个人隐私信息',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 显示隐私政策
  showPrivacyPolicy: function() {
    wx.navigateTo({
      url: '/pages/privacy-policy/privacy-policy'
    })
  },

  // 分享功能
  onShareAppMessage: function() {
    return {
      title: '达芬Qi说 - 听见学术的声音',
      path: '/pages/login/login',
      imageUrl: '/images/share-cover.jpg'
    }
  }
})