// 登录页面逻辑
const app = getApp()
const authService = require('../../services/auth.service.js')

Page({
  data: {
    // 是否同意协议
    isAgreed: false,
    
    // 登录状态
    isLogging: false,
    
    // 是否显示用户信息授权按钮
    showUserInfoAuth: false,
    
    // 临时存储的登录code
    tempLoginCode: null
  },

  onLoad: function (options) {
    console.log('登录页面加载', options)
  },

  onShow: function () {
    console.log('登录页面显示')
    
    // 检查是否已经登录
    if (app.globalData.isLoggedIn) {
      // 已登录，返回上一页
      wx.navigateBack()
    }
  },

  // 切换协议同意状态
  toggleAgreement: function() {
    this.setData({
      isAgreed: !this.data.isAgreed
    })
    
    wx.vibrateShort({
      type: 'light'
    })
  },

  // 微信登录（新版本，符合微信官方要求）
  async handleWechatLogin() {
    if (!this.data.isAgreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (this.data.isLogging) return

    this.setData({
      isLogging: true
    })

    try {
      wx.showLoading({
        title: '登录中...'
      })

      // 方式1: 直接使用静默登录（不获取用户信息）
      const loginResult = await authService.loginWithWechat({
        needUserInfo: false
      })

      if (loginResult.success) {
        this.loginSuccess(loginResult.user)
      } else {
        // 如果后端需要用户信息，显示授权按钮
        if (loginResult.error.includes('用户信息')) {
          this.setData({
            showUserInfoAuth: true,
            isLogging: false
          })
          wx.hideLoading()
          wx.showToast({
            title: '请授权获取用户信息',
            icon: 'none',
            duration: 2000
          })
        } else {
          this.loginFailed(loginResult.error)
        }
      }

    } catch (error) {
      console.error('登录失败:', error)
      this.loginFailed('登录失败，请重试')
    }
  },

  // 获取用户信息授权（新接口）
  async handleGetUserProfile(e) {
    const userInfo = e.detail.userInfo
    if (!userInfo) {
      wx.showToast({
        title: '授权已取消',
        icon: 'none',
        duration: 1500
      })
      return
    }

    this.setData({
      isLogging: true,
      showUserInfoAuth: false
    })

    try {
      wx.showLoading({
        title: '登录中...'
      })

      // 使用用户信息进行登录
      const loginResult = await authService.loginWithWechat({
        needUserInfo: true,
        userInfo: userInfo
      })

      if (loginResult.success) {
        this.loginSuccess(loginResult.user)
      } else {
        this.loginFailed(loginResult.error)
      }

    } catch (error) {
      console.error('授权登录失败:', error)
      this.loginFailed('登录失败，请重试')
    }
  },

  // 登录成功处理
  loginSuccess: function(user) {
    wx.hideLoading()
    
    this.setData({
      isLogging: false
    })

    // 更新全局状态
    app.globalData.userInfo = user
    app.globalData.isLoggedIn = true

    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500,
      success: () => {
        // 延迟返回
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    })

    console.log('登录成功', user)
  },

  // 登录失败
  loginFailed: function(message) {
    wx.hideLoading()
    
    this.setData({
      isLogging: false
    })

    wx.showToast({
      title: message || '登录失败',
      icon: 'none',
      duration: 2000
    })
  },

  // 手机号登录
  handlePhoneLogin: function() {
    if (!this.data.isAgreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none',
        duration: 2000
      })
      return
    }

    wx.showToast({
      title: '手机号登录功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  // 邮箱登录
  handleEmailLogin: function() {
    if (!this.data.isAgreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none',
        duration: 2000
      })
      return
    }

    wx.showToast({
      title: '邮箱登录功能开发中',
      icon: 'none',
      duration: 2000
    })
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
          // 设置游客模式
          app.globalData.isGuestMode = true
          
          wx.showToast({
            title: '已进入游客模式',
            icon: 'success',
            duration: 1500,
            success: () => {
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            }
          })
        }
      }
    })
  },

  // 显示用户协议
  showUserAgreement: function() {
    wx.showModal({
      title: '用户协议',
      content: '这里是用户协议的内容...\n\n1. 用户须遵守相关法律法规\n2. 不得发布违法违规内容\n3. 尊重他人知识产权\n4. 保护个人隐私信息',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 显示隐私政策
  showPrivacyPolicy: function() {
    wx.showModal({
      title: '隐私政策',
      content: '这里是隐私政策的内容...\n\n我们会保护您的个人信息安全，不会将您的信息泄露给第三方。收集的信息仅用于改善服务体验。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 分享功能
  onShareAppMessage: function() {
    return {
      title: '达芬Qi说 - 听见学术的声音',
      path: '/pages/login/login',
      imageUrl: '/images/icons/share-cover.jpg'
    }
  }
})