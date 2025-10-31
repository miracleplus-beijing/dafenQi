// 登录页面 - 简化版专注前端交互
const app = getApp()
const authService = require('../../services/auth.service.js')

// 默认头像URL
const defaultAvatarUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png'

Page({
  data: {
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

    // 检查隐私权限
    this.checkPrivacyPermission()
  },

  onShow: function () {
    console.log('登录页面显示')
  },

  // 微信登录处理 - 使用Supabase Auth
  // 处理微信登录 - 使用智能登录逻辑
  handleWechatLogin: async function() {
    if (!this.data.isAgreed) {
      wx.showModal({
        title: '提示',
        content: '请先同意《用户协议》和《隐私政策》',
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }

    console.log('开始智能微信登录流程')

    // 显示加载状态
    wx.showLoading({
      title: '正在登录中...'
    })

    try {
      // 调用智能登录
      const smartLoginResult = await authService.smartLogin()

      wx.hideLoading()

      if (!smartLoginResult.success) {
        // 登录失败，显示错误信息
        wx.showModal({
          title: '登录失败',
          content: smartLoginResult.error || '登录过程中发生错误，请重试',
          showCancel: false
        })
        return
      }

      // 根据智能登录结果执行相应操作
      switch (smartLoginResult.action) {
        case 'goto_profile':
          // 老用户，信息完整，直接登录成功
          console.log('老用户登录成功，直接跳转')
          wx.showToast({
            title: smartLoginResult.message || '登录成功',
            icon: 'success',
            duration: 2000,
            success: () => {
              setTimeout(() => {
                // 跳转回来源页面或profile页面
                wx.navigateBack({
                  fail: () => {
                    wx.switchTab({
                      url: '/pages/profile/profile'
                    })
                  }
                })
              }, 2000)
            }
          })
          break

        case 'goto_login':
          // 新用户或信息不完整，显示信息完善表单
          console.log('新用户或信息不完整，显示完善表单')

          // 如果已经有部分用户信息，预填充表单
          const user = smartLoginResult.user
          if (user) {
            this.setData({
              avatarUrl: user.avatar_url || user.avatarUrl || this.data.avatarUrl,
              nickname: user.nickname || user.nickName || this.data.nickname
            })
          }

          this.setData({
            showUserInfoForm: true,
          })

          wx.showToast({
            title: smartLoginResult.message || '请完善个人信息',
            icon: 'none',
            duration: 2000
          })
          break

        default:
          // 未知操作，显示信息完善表单
          console.log('未知操作，显示信息完善表单')
          this.setData({
            showUserInfoForm: true,
          })

          wx.showToast({
            title: '请完善个人信息',
            icon: 'none',
            duration: 2000
          })
      }

    } catch (error) {
      wx.hideLoading()
      console.error('智能登录过程中发生错误:', error)

      // 发生错误时回退到原有流程
      wx.showModal({
        title: '登录异常',
        content: '登录过程中发生异常，是否继续完善信息？',
        confirmText: '继续',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 显示用户信息完善表单
            this.setData({
              showUserInfoForm: true,
            })

            wx.showToast({
              title: '请完善个人信息',
              icon: 'none',
              duration: 2000
            })
          }
        }
      })
    }
  },

  // 头像选择 - 完全复刻avatar_nickname逻辑
  onChooseAvatar: function(e) {
    console.log('头像选择事件:', e.detail)
    
    const { avatarUrl } = e.detail
    if (avatarUrl) {
      this.setData({
        avatarUrl: avatarUrl
      })
      console.log(avatarUrl)
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

  // 完成用户信息设置 - 优化避免重复登录
  completeUserInfo: async function() {
    console.log('完成用户信息设置')
    console.log('当前头像:', this.data.avatarUrl)
    console.log('当前昵称:', this.data.nickname)

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
        title: '完善信息中...'
      })

      // 检查用户是否已经登录
      const isLoggedIn = await authService.checkLoginStatus()
      const currentUser = authService.getCurrentUser()

      let loginResult = null

      if (!isLoggedIn || !currentUser) {
        // 用户未登录，执行完整的登录流程
        console.log('用户未登录，开始微信登录...')
        loginResult = await authService.loginWithWechat()

        if (!loginResult.success) {
          throw new Error(loginResult.error || '登录失败')
        }

        console.log('微信登录成功:', loginResult)
      } else {
        // 用户已登录，跳过登录步骤
        console.log('用户已登录，直接更新信息:', currentUser)
        loginResult = { success: true, user: currentUser }
      }

      // 更新用户信息（头像和昵称）
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
      const successTitle = '信息完善成功'
      wx.showToast({
        title: successTitle,
        icon: 'success',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            // 跳转页面
            wx.navigateBack({
              fail: () => {
                // 如果没有上一页，跳转到profile页面（因为用户刚登录）
                wx.switchTab({
                  url: '/pages/profile/profile'
                })
              }
            })
          }, 2000)
        }
      })

    } catch (error) {
      console.error('信息完善流程失败:', error)
      wx.hideLoading()

      // 显示错误信息
      const errorTitle = '信息完善失败'
      wx.showModal({
        title: errorTitle,
        content: error.message || '网络连接异常，请重试',
        confirmText: '重试',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 用户选择重试
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
    })

    wx.showToast({
      title: '请填写注册信息',
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
  }
})