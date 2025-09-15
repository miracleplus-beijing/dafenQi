// 登录页面 - 简化版专注前端交互
const app = getApp()
const authService = require('../../services/auth.service.js')

// 默认头像URL
const defaultAvatarUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png'

Page({
  data: {
    // 登录模式
    mode: 'login', // 'login' | 'register'

    // 用户头像
    avatarUrl: defaultAvatarUrl,

    // 用户昵称
    nickname: '',

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

  // 微信登录处理 - 使用Supabase Auth
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
      showUserInfoForm: true,
      mode: 'login'
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

  // 昵称输入处理
  onNicknameChange: function(e) {
    this.setData({
      nickname: e.detail.value
    })
  },

  // 完成用户信息设置
  completeUserInfo: async function() {
    console.log('完成用户信息设置')
    console.log('当前头像:', this.data.avatarUrl)
    console.log('当前昵称:', this.data.nickname)
    console.log('当前模式:', this.data.mode)

    // 验证必要信息
    if (!this.data.nickname.trim()) {
      wx.showModal({
        title: '提示',
        content: '请输入昵称',
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }

    try {
      // 显示加载中
      wx.showLoading({
        title: this.data.mode === 'register' ? '注册中...' : '登录中...'
      })

      // 第一步：微信登录（调用新的Supabase Auth流程）
      console.log('开始Supabase Auth微信登录...')
      const loginResult = await authService.loginWithWechat()

      if (!loginResult.success) {
        throw new Error(loginResult.error || '登录失败')
      }

      console.log('Supabase Auth登录成功:', loginResult)

      // 第二步：更新用户信息（头像和昵称）
      console.log('开始更新用户信息...')
      const userInfo = {
        nickName: this.data.nickname.trim(),
        avatarUrl: this.data.avatarUrl
      }

      const updateResult = await authService.updateUserInfo(userInfo)

      if (!updateResult.success) {
        console.warn('用户信息更新失败，但登录成功:', updateResult.error)
        // 不抛出错误，因为登录已经成功
      }

      console.log('用户信息更新完成:', updateResult)

      // 隐藏加载中
      wx.hideLoading()

      // 显示成功提示
      const successTitle = this.data.mode === 'register' ? '注册成功' : '登录成功'
      wx.showToast({
        title: successTitle,
        icon: 'success',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            // 第三步：跳转页面
            wx.navigateBack({
              fail: () => {
                // 如果没有上一页，跳转到首页
                wx.switchTab({
                  url: '/pages/browse/browse'
                })
              }
            })
          }, 2000)
        }
      })

    } catch (error) {
      console.error('登录/注册流程失败:', error)
      wx.hideLoading()

      // 显示错误信息
      const errorTitle = this.data.mode === 'register' ? '注册失败' : '登录失败'
      wx.showModal({
        title: errorTitle,
        content: error.message || '网络连接异常，请重试',
        confirmText: '重试',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 用户选择重试，重新调用登录
            setTimeout(() => {
              this.completeUserInfo()
            }, 500)
          }
        }
      })
    }
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

  // 注册功能
  handleRegister: function() {
    if (!this.data.isAgreed) {
      wx.showModal({
        title: '提示',
        content: '请先同意《用户协议》和《隐私政策》',
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }

    console.log('开始注册流程')

    // 显示用户信息完善表单
    this.setData({
      showUserInfoForm: true,
      mode: 'register'
    })

    wx.showToast({
      title: '请填写注册信息',
      icon: 'none',
      duration: 2000
    })
  },

  // 切换登录/注册模式
  switchMode: function() {
    const newMode = this.data.mode === 'login' ? 'register' : 'login'
    this.setData({
      mode: newMode,
      showUserInfoForm: false
    })

    const modeText = newMode === 'register' ? '注册' : '登录'
    wx.showToast({
      title: `切换到${modeText}模式`,
      icon: 'none',
      duration: 1500
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
  }
})