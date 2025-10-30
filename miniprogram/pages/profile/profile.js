// 我的页面逻辑
const app = getApp()
const authService = require('../../services/auth.service.js')
Page({
  data: {
    // 用户登录状态
    isLoggedIn: false,
    
    // 用户信息
    userInfo: {
      nickName: '',
      avatarUrl: '',
      id: ''
    },
    
    // 滑动相关
    showSwipeIndicator: false,
    swipeDirection: '',
    
    // 触摸相关
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false
  },

  onLoad: function (options) {
    console.log('我的页面加载', options)
    
    // 初始化页面数据
    this.initPageData()
  },

  onShow: async function () {
    console.log("onShow周期触发")

    await this.checkLoginStatus()
    // 页面进入动画
    this.enterAnimation()
  },

  onHide: function () {
    console.log('我的页面隐藏')
  },

  onUnload: function () {
    console.log('我的页面卸载')
  },

  // 初始化页面数据
  initPageData: function() {
    // 检查登录状态 (没有必要因为， show会执行)
    // this.checkLoginStatus()

  },


  // 页面进入动画
  enterAnimation: function() {
    const query = this.createSelectorQuery()
    query.select('.profile-container').boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        // 可以在这里添加进入动画逻辑
      }
    })
  },

  // 处理登录
  handleLogin: function() {
    console.log('跳转到登录页面')

    // 跳转到登录页面
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 处理菜单项点击
  handleMenuClick: function(e) {
    const type = e.currentTarget.dataset.type
    console.log('菜单点击:', type)
    
    switch(type) {
      case 'history':
        console.log('跳转到我的历史')
        wx.navigateTo({
          url: '/pages/history/history'
        })
        break
      
      case 'favorites':
        console.log('跳转到我的收藏')
        wx.navigateTo({
          url: '/pages/favorites/favorites'
        })
        break
      
      case 'feedback':
        console.log('跳转到问题反馈')
        wx.navigateTo({
          url: '/pages/feedback/feedback'
        })
        break
      
      case 'settings':
        console.log('跳转到设置')
        wx.navigateTo({
          url: '/pages/settings/settings'
        })
        break
      
      case 'comments':
        console.log('我的评论 - 功能待开发')
        wx.showToast({
          title: '功能开发中，敬请期待',
          icon: 'none',
          duration: 1500
        })
        break
      
      default:
        console.log('未知菜单项:', type)
        wx.showToast({
          title: '功能开发中',
          icon: 'none',
          duration: 1500
        })
    }
  },


  // 处理退出登录
  handleLogout: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      confirmColor: '#FF4444',
      success: (res) => {
        if (res.confirm) {
          this.performLogout()
        }
      }
    })
  },

  // 执行退出登录
  performLogout: async function() {
    const authService = require('../../services/auth.service.js')

    wx.showLoading({
      title: '退出中...'
    })

    try {
      // 使用auth service登出
      const result = await authService.logout()

      if (result.success) {
        // 更新页面状态
        this.setData({
          isLoggedIn: false,
          userInfo: {
            nickName: '',
            avatarUrl: '',
            id: ''
          }
        })

        wx.hideLoading()
        wx.showToast({
          title: '已退出登录',
          icon: 'success',
          duration: 1500
        })

        console.log('退出登录成功')
      } else {
        wx.hideLoading()
        wx.showToast({
          title: '退出失败: ' + result.error,
          icon: 'none',
          duration: 1500
        })
      }
    } catch (error) {
      console.error('退出登录失败:', error)

      // 即使退出失败，也清除本地状态
      this.setData({
        isLoggedIn: false,
        userInfo: {
          nickName: '',
          avatarUrl: '',
          id: ''
        }
      })

      // 清除全局状态
      try {
        const app = getApp()
        if (app && app.globalData) {
          app.globalData.isLoggedIn = false
          app.globalData.userInfo = null
        }
      } catch (appError) {
        console.warn('清除全局状态失败:', appError)
      }

      wx.hideLoading()
      wx.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 1500
      })
    }
  },

  // 触摸开始
  touchStart: function(e) {
    const touch = e.touches[0]
    this.setData({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isDragging: false
    })
  },

  // 触摸移动
  touchMove: function(e) {
    const touch = e.touches[0]
    const deltaX = touch.clientX - this.data.startX
    const deltaY = touch.clientY - this.data.startY
    
    this.setData({
      currentX: touch.clientX,
      currentY: touch.clientY
    })
    
    // 检查是否是水平滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      this.setData({
        isDragging: true,
        showSwipeIndicator: true
      })
      
      if (deltaX > 50) {
        this.setData({
          swipeDirection: 'right'
        })
      } else if (deltaX < -50) {
        this.setData({
          swipeDirection: 'left'
        })
      } else {
        this.setData({
          swipeDirection: ''
        })
      }
    }
  },

  // 触摸结束
  touchEnd: function(e) {
    if (!this.data.isDragging) {
      this.resetSwipeState()
      return
    }
    
    const deltaX = this.data.currentX - this.data.startX
    const threshold = 100
    
    this.setData({
      showSwipeIndicator: false,
      swipeDirection: ''
    })
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // 向右滑动 - 去分类页面
        console.log('向右滑动到分类页面')
        wx.switchTab({
          url: '/pages/category/category'
        })
      } else {
        // 向左滑动 - 已是最后一页
        console.log('向左滑动 - 已是最后一页')
      }
    }
    
    this.resetSwipeState()
  },
  async checkLoginStatus() {
    const currentUser = await authService.getCurrentUser()
    const isLoggedIn = await authService.checkLoginStatus()

    this.setData({
      isLoggedIn: isLoggedIn,
      userInfo: currentUser || {
        nickName: '',
        avatarUrl: '',
        id: ''
      }
    })

  },
  // 重置滑动状态
  resetSwipeState: function() {
    this.setData({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isDragging: false,
      showSwipeIndicator: false,
      swipeDirection: ''
    })
  },
  // 下拉刷新
  onPullDownRefresh: async function() {
    console.log('下拉刷新')
    
    // 重新检查登录状态和用户信息
    await this.checkLoginStatus()
    
    // 延迟停止刷新
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 分享功能
  onShareAppMessage: function() {
    const title = this.data.isLoggedIn 
      ? `${this.data.userInfo.nickName}邀请你一起听播客` 
      : '达芬Qi说 - 发现精彩的学术内容'
    
    return {
      title: title,
      path: '/pages/browse/browse',
      imageUrl: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/share-cover.jpg'
    }
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '推荐一个很棒的学术播客平台',
      query: 'share=timeline',
      imageUrl: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/share-cover.jpg'
    }
  },

  // 选择头像（简化版本，使用微信原生隐私流程）
  onChooseAvatar: async function(e) {
    console.log('选择头像事件触发:', e)

    // 检查登录状态
    await this.checkLoginStatus()

    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再修改头像',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          }
        }
      })
      return
    }

    const currentUser = await authService.getCurrentUser()
    if (!currentUser || !currentUser.id) {
      wx.showModal({
        title: '登录状态异常',
        content: '请重新登录后再试',
        confirmText: '重新登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          }
        }
      })
      return
    }

    // 获取选择的头像临时路径
    const { avatarUrl } = e.detail
    console.log("获取到头像路径:", avatarUrl)

    if (!avatarUrl) {
      console.error('未获取到头像路径')
      wx.showToast({
        title: '获取头像失败',
        icon: 'none',
        duration: 1500
      })
      return
    }

    // 显示加载中
    wx.showLoading({
      title: '上传中...'
    })

    // 上传头像
    this.updateAvatar(avatarUrl)
  },

  // 更新头像
  updateAvatar: async function(avatarUrl) {
    try {
      const result = await authService.updateUserInfo({
        avatarUrl: avatarUrl
      }).catch(e => {
        console.log(e)
      })
      console.log(result)
      
      if (result.success) {
        // 统一字段为 camelCase，兼容后端返回的 snake_case
        const u = result.user || {}
        const normalized = {
          nickName: u.nickName || u.nickname || this.data.userInfo.nickName || '',
          avatarUrl: u.avatarUrl || u.avatar_url || this.data.userInfo.avatarUrl || '',
          id: u.id || this.data.userInfo.id || ''
        }
        // 更新页面数据
        this.setData({ userInfo: normalized })
        // 更新全局数据
        app.globalData.userInfo = normalized
        
        wx.hideLoading()
        wx.showToast({
          title: '头像更新成功',
          icon: 'success',
          duration: 1500
        })
        
        console.log('头像更新成功:', normalized.avatarUrl)
      } else {
        wx.hideLoading()
        wx.showToast({
          title: '头像更新失败: ' + result.error,
          icon: 'none',
          duration: 2000
        })
      }


      
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '头像更新失败',
        icon: 'none',
        duration: 1500
      })
      console.error('头像更新失败:', error)
    }
  },

  // 更换用户名
  changeUserName: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500
      })
      return
    }

    const currentName = this.data.userInfo.nickName || '用户'
    
    wx.showModal({
      title: '修改用户名',
      content: '请输入新的用户名',
      editable: true,
      placeholderText: currentName,
      success: (res) => {
        if (res.confirm && res.content) {
          const newName = res.content.trim()
          
          if (newName.length === 0) {
            wx.showToast({
              title: '用户名不能为空',
              icon: 'none',
              duration: 1500
            })
            return
          }
          
          if (newName.length > 20) {
            wx.showToast({
              title: '用户名不能超过20个字符',
              icon: 'none',
              duration: 1500
            })
            return
          }
          
          this.updateUserName(newName)
        }
      }
    })
  },

  // 更新用户名
  updateUserName: async function(nickName) {

    wx.showLoading({
      title: '更新中...'
    })

    try {
      const result = await authService.updateUserInfo({
        nickName: nickName
      })

      if (result.success) {
        // 统一字段为 camelCase，兼容后端返回的 snake_case
        const u = result.user || {}
        const normalized = {
          nickName: u.nickName || u.nickname || this.data.userInfo.nickName || '',
          avatarUrl: u.avatarUrl || u.avatar_url || this.data.userInfo.avatarUrl || '',
          id: u.id || this.data.userInfo.id || ''
        }
        // 更新页面数据
        this.setData({ userInfo: normalized })

        // 更新全局数据
        app.globalData.userInfo = normalized

        wx.hideLoading()
        wx.showToast({
          title: '用户名更新成功',
          icon: 'success',
          duration: 1500
        })

        console.log('用户名更新成功:', normalized.nickName)
      } else {
        wx.hideLoading()
        wx.showToast({
          title: '用户名更新失败: ' + result.error,
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '用户名更新失败',
        icon: 'none',
        duration: 1500
      })
      console.error('用户名更新失败:', error)
    }
  }

})