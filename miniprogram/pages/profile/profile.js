// 我的页面逻辑
const app = getApp()

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

  onShow: function () {
    console.log('我的页面显示')
    
    // 每次显示时检查登录状态
    this.checkLoginStatus()
    
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
    // 检查登录状态
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const globalData = app.globalData
    
    // 优先检查全局状态
    let isLoggedIn = globalData.isLoggedIn || false
    let userInfo = globalData.userInfo || {}
    
    // 如果全局状态没有，检查本地存储
    if (!isLoggedIn || !userInfo.id) {
      try {
        const localUserInfo = wx.getStorageSync('userInfo')
        if (localUserInfo && localUserInfo.id) {
          userInfo = localUserInfo
          isLoggedIn = true
          
          // 同步到全局数据
          app.globalData.userInfo = userInfo
          app.globalData.isLoggedIn = true
        }
      } catch (e) {
        console.error('读取本地用户信息失败:', e)
      }
    }
    
    // 再次检查认证服务
    if (!isLoggedIn) {
      const authService = require('../../services/auth.service.js')
      isLoggedIn = authService.getCurrentUser() !== null
      if (isLoggedIn && !userInfo.id) {
        userInfo = authService.getCurrentUser()
      }
    }
    
    // 格式化用户信息显示
    const displayUserInfo = {
      ...userInfo,
      // 确保使用正确的字段名显示昵称
      nickName: userInfo.nickname || userInfo.nickName || userInfo.username || '微信用户',
      avatarUrl: userInfo.avatar_url || userInfo.avatarUrl || 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/default-avatar.png'
    }
    
    this.setData({
      isLoggedIn: isLoggedIn,
      userInfo: displayUserInfo
    })
    
    console.log('登录状态:', isLoggedIn)
    console.log('用户信息:', displayUserInfo)
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
      
      case 'share':
        console.log('分享给朋友')
        this.handleShare()
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
      
      default:
        console.log('未知菜单项:', type)
        wx.showToast({
          title: '功能开发中',
          icon: 'none',
          duration: 1500
        })
    }
  },

  // 处理分享
  handleShare: function() {
    wx.showShareMenu({
      withShareTicket: true,
      showShareItems: ['wechatFriends', 'wechatMoment']
    })
    
    wx.showToast({
      title: '请使用右上角分享',
      icon: 'none',
      duration: 2000
    })
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
  performLogout: function() {
    wx.showLoading({
      title: '退出中...'
    })
    
    // 清除全局用户数据
    app.logout()
    
    // 清除本地存储的用户信息
    try {
      wx.removeStorageSync('userInfo')
    } catch (e) {
      console.error('清除本地用户信息失败:', e)
    }
    
    // 更新页面状态
    this.setData({
      isLoggedIn: false,
      userInfo: {}
    })
    
    setTimeout(() => {
      wx.hideLoading()
      
      wx.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 1500
      })
    }, 500)
    
    console.log('退出登录成功')
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

  // 获取用户信息
  getUserInfo: async function(e) {
    if (e.detail.userInfo) {
      // 用户允许获取用户信息
      const userInfo = e.detail.userInfo
      const authService = require('../../services/auth.service.js')
      
      try {
        // 使用auth service更新用户信息，包括微信头像
        const result = await authService.updateUserInfo({
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        })
        
        if (result.success) {
          // 更新页面数据
          this.setData({
            userInfo: result.user
          })
          
          // 更新全局数据
          app.globalData.userInfo = result.user
          
          console.log('微信用户信息更新成功', result.user)
        } else {
          // 回退到本地更新
          const newUserInfo = {
            ...this.data.userInfo,
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl
          }
          
          this.setData({
            userInfo: newUserInfo
          })
          
          app.globalData.userInfo = newUserInfo
          wx.setStorageSync('userInfo', newUserInfo)
          
          console.warn('用户信息更新失败，使用本地更新:', result.error)
        }
      } catch (error) {
        console.error('更新用户信息失败:', error)
        
        // 回退到本地更新
        const newUserInfo = {
          ...this.data.userInfo,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        }
        
        this.setData({
          userInfo: newUserInfo
        })
        
        app.globalData.userInfo = newUserInfo
        wx.setStorageSync('userInfo', newUserInfo)
      }
    } else {
      console.log('用户拒绝授权用户信息')
    }
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    console.log('下拉刷新')
    
    // 重新检查登录状态和用户信息
    this.checkLoginStatus()
    
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

  // 更换头像
  changeAvatar: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500
      })
      return
    }

    wx.showActionSheet({
      itemList: ['从相册选择', '拍照'],
      success: (res) => {
        const sourceType = res.tapIndex === 0 ? ['album'] : ['camera']
        
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: sourceType,
          success: (res) => {
            const tempFilePath = res.tempFilePaths[0]
            
            // 显示加载中
            wx.showLoading({
              title: '上传中...'
            })
            
            // 模拟上传过程
            setTimeout(() => {
              this.updateAvatar(tempFilePath)
            }, 1000)
          },
          fail: (err) => {
            console.error('选择图片失败:', err)
            wx.showToast({
              title: '选择图片失败',
              icon: 'none',
              duration: 1500
            })
          }
        })
      }
    })
  },

  // 更新头像
  updateAvatar: async function(avatarUrl) {
    const authService = require('../../services/auth.service.js')
    
    try {
      const result = await authService.updateUserInfo({
        avatarUrl: avatarUrl
      })
      
      if (result.success) {
        // 更新页面数据
        const newUserInfo = result.user
        this.setData({
          userInfo: newUserInfo
        })
        
        // 更新全局数据
        app.globalData.userInfo = newUserInfo
        
        wx.hideLoading()
        wx.showToast({
          title: '头像更新成功',
          icon: 'success',
          duration: 1500
        })
        
        console.log('头像更新成功:', newUserInfo.avatar_url)
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
  updateUserName: function(nickName) {
    wx.showLoading({
      title: '更新中...'
    })
    
    // 模拟网络请求
    setTimeout(() => {
      const newUserInfo = {
        ...this.data.userInfo,
        nickName: nickName
      }
      
      // 更新页面数据
      this.setData({
        userInfo: newUserInfo
      })
      
      // 更新全局数据
      app.globalData.userInfo = newUserInfo
      
      // 保存到本地存储
      wx.setStorageSync('userInfo', newUserInfo)
      
      wx.hideLoading()
      wx.showToast({
        title: '用户名更新成功',
        icon: 'success',
        duration: 1500
      })
      
      console.log('用户名更新成功:', nickName)
    }, 800)
  }
})