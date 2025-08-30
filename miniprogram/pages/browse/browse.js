// 漫游页面逻辑
const app = getApp()

Page({
  data: {
    // 播放状态
    isPlaying: false,
    currentProgress: 0,
    maxProgress: 100,
    
    // 交互状态
    isLiked: false,
    isFavorited: false,
    isThumbsUp: false,
    
    // 播客数据
    podcastData: {
      id: 'podcast_001',
      title: '播客标题 播客标题 播客标题\n播客标题 播客标题 播客标题',
      channel: '频道名称',
      cover: '',
      description: '',
      duration: 3600 // 秒
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
    console.log('漫游页面加载', options)
    
    // 初始化页面数据
    this.initPageData()
    
    // 模拟进度更新
    this.startProgressSimulation()
  },

  onShow: function () {
    console.log('漫游页面显示')
    
    // 页面进入动画
    this.enterAnimation()
  },

  onHide: function () {
    console.log('漫游页面隐藏')
    
    // 停止进度模拟
    if (this.progressTimer) {
      clearInterval(this.progressTimer)
    }
  },

  onUnload: function () {
    console.log('漫游页面卸载')
    
    // 清理定时器
    if (this.progressTimer) {
      clearInterval(this.progressTimer)
    }
  },

  // 初始化页面数据
  initPageData: function() {
    const globalData = app.globalData
    
    // 同步全局播放状态
    this.setData({
      isPlaying: globalData.isPlaying,
      currentProgress: globalData.currentProgress
    })
    
    // 检查收藏状态
    this.checkFavoriteStatus()
  },

  // 检查收藏状态
  checkFavoriteStatus: function() {
    const favorites = app.globalData.favoriteList
    const podcastId = this.data.podcastData.id
    const isFavorited = favorites.some(item => item.id === podcastId)
    
    this.setData({
      isFavorited: isFavorited
    })
  },

  // 页面进入动画
  enterAnimation: function() {
    const query = this.createSelectorQuery()
    query.select('.browse-container').boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        // 可以在这里添加进入动画逻辑
      }
    })
  },

  // 处理播放/暂停
  handlePlayPause: function() {
    const isPlaying = !this.data.isPlaying
    
    this.setData({
      isPlaying: isPlaying
    })
    
    // 更新全局状态
    app.globalData.isPlaying = isPlaying
    
    // 添加到历史记录
    if (isPlaying) {
      app.addToHistory(this.data.podcastData)
    }
    
    console.log(isPlaying ? '开始播放' : '暂停播放')
    
    // 震动反馈
    wx.vibrateShort({
      type: 'light'
    })
  },

  // 处理进度条点击
  handleProgressClick: function(e) {
    const query = this.createSelectorQuery()
    query.select('.progress-bar').boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        const rect = res[0]
        const clickX = e.detail.x - rect.left
        const percentage = (clickX / rect.width) * 100
        const progress = Math.max(0, Math.min(100, percentage))
        
        this.setData({
          currentProgress: progress
        })
        
        // 更新全局进度
        app.globalData.currentProgress = progress
        
        console.log('跳转到进度:', progress + '%')
        
        // 震动反馈
        wx.vibrateShort({
          type: 'medium'
        })
      }
    })
  },

  // 处理后退15秒
  handleRewind: function() {
    const progress = Math.max(0, this.data.currentProgress - 5)
    this.setData({
      currentProgress: progress
    })
    
    app.globalData.currentProgress = progress
    console.log('后退15秒')
    
    wx.vibrateShort({
      type: 'light'
    })
  },

  // 处理前进30秒
  handleFastForward: function() {
    const progress = Math.min(100, this.data.currentProgress + 10)
    this.setData({
      currentProgress: progress
    })
    
    app.globalData.currentProgress = progress
    console.log('前进30秒')
    
    wx.vibrateShort({
      type: 'light'
    })
  },

  // 处理喜欢
  handleLike: function() {
    const isLiked = !this.data.isLiked
    this.setData({
      isLiked: isLiked
    })
    
    console.log(isLiked ? '已喜欢' : '取消喜欢')
    
    wx.vibrateShort({
      type: 'light'
    })
    
    // 显示提示
    wx.showToast({
      title: isLiked ? '已喜欢' : '取消喜欢',
      icon: 'none',
      duration: 1500
    })
  },

  // 处理点赞
  handleThumbsUp: function() {
    const isThumbsUp = !this.data.isThumbsUp
    this.setData({
      isThumbsUp: isThumbsUp
    })
    
    console.log(isThumbsUp ? '已点赞' : '取消点赞')
    
    wx.vibrateShort({
      type: 'light'
    })
    
    wx.showToast({
      title: isThumbsUp ? '已点赞' : '取消点赞',
      icon: 'none',
      duration: 1500
    })
  },

  // 处理收藏
  handleFavorite: function() {
    const isFavorited = !this.data.isFavorited
    const podcastData = this.data.podcastData
    
    if (isFavorited) {
      // 添加到收藏
      const success = app.addToFavorites({
        ...podcastData,
        favoriteTime: new Date().getTime()
      })
      
      if (success) {
        this.setData({
          isFavorited: true
        })
        
        wx.showToast({
          title: '已收藏',
          icon: 'success',
          duration: 1500
        })
      } else {
        wx.showToast({
          title: '已在收藏夹中',
          icon: 'none',
          duration: 1500
        })
      }
    } else {
      // 从收藏中移除
      const success = app.removeFromFavorites(podcastData.id)
      
      if (success) {
        this.setData({
          isFavorited: false
        })
        
        wx.showToast({
          title: '已取消收藏',
          icon: 'none',
          duration: 1500
        })
      }
    }
    
    wx.vibrateShort({
      type: 'medium'
    })
  },

  // 处理评论
  handleComment: function() {
    console.log('打开评论')
    
    wx.showToast({
      title: '评论功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  // 处理分享
  handleShare: function() {
    console.log('分享内容')
    
    wx.showShareMenu({
      withShareTicket: true,
      showShareItems: ['wechatFriends', 'wechatMoment']
    })
  },

  // 处理更多操作
  handleMore: function() {
    const items = ['下载', '设为铃声', '举报']
    
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        console.log('选择了:', items[res.tapIndex])
        
        wx.showToast({
          title: '功能开发中',
          icon: 'none',
          duration: 1500
        })
      }
    })
  },

  // 处理频道点击
  handleChannelClick: function() {
    console.log('跳转到频道页面')
    
    wx.showToast({
      title: '频道功能开发中',
      icon: 'none',
      duration: 1500
    })
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
        // 向右滑动 - 暂无页面
        console.log('向右滑动 - 已是第一页')
      } else {
        // 向左滑动 - 去分类页面
        console.log('向左滑动到分类页面')
        wx.switchTab({
          url: '/pages/category/category'
        })
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

  // 开始进度模拟
  startProgressSimulation: function() {
    this.progressTimer = setInterval(() => {
      if (this.data.isPlaying) {
        let progress = this.data.currentProgress + 0.1
        if (progress >= 100) {
          progress = 100
          this.setData({
            isPlaying: false
          })
          app.globalData.isPlaying = false
        }
        
        this.setData({
          currentProgress: progress
        })
        
        app.globalData.currentProgress = progress
      }
    }, 100)
  },

  // 分享功能
  onShareAppMessage: function() {
    return {
      title: this.data.podcastData.title,
      path: '/pages/browse/browse',
      imageUrl: this.data.podcastData.cover || '/images/icons/share-cover.jpg'
    }
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '我在达芬Qi说听到了这个有趣的内容',
      query: 'share=timeline',
      imageUrl: this.data.podcastData.cover || '/images/icons/share-cover.jpg'
    }
  }
})