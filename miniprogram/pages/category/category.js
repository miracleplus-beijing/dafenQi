// 分类页面逻辑
const app = getApp()

Page({
  data: {
    // 当前选中的标签页
    currentTab: 'hot',
    
    // 搜索相关
    searchValue: '',
    
    // 排行榜数据
    hotRankings: [],
    newRankings: [],
    reviewRankings: [],
    
    // 推荐论文
    recommendedPapers: [],
    
    // 分类数据
    categories: [],
    
    // 精选播客
    featuredPodcasts: [],
    
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
    console.log('分类页面加载', options)
    
    // 初始化页面数据
    this.initPageData()
  },

  onShow: function () {
    console.log('分类页面显示')
    
    // 页面进入动画
    this.enterAnimation()
  },

  onHide: function () {
    console.log('分类页面隐藏')
  },

  onUnload: function () {
    console.log('分类页面卸载')
  },

  // 初始化页面数据
  initPageData: function() {
    // 初始化排行榜数据
    this.initRankingData()
    
    // 初始化推荐论文
    this.initRecommendedPapers()
    
    // 初始化分类数据
    this.initCategories()
    
    // 初始化精选播客
    this.initFeaturedPodcasts()
  },

  // 初始化排行榜数据
  async initRankingData() {
    try {
      // 并行加载三个榜单的数据
      const [hotResult, newResult, reviewResult] = await Promise.all([
        this.loadHotRankings(),
        this.loadNewRankings(), 
        this.loadReviewRankings()
      ])

      this.setData({
        hotRankings: hotResult.success ? hotResult.data : [],
        newRankings: newResult.success ? newResult.data : [],
        reviewRankings: reviewResult.success ? reviewResult.data : []
      })
    } catch (error) {
      console.error('加载排行榜数据失败:', error)
      // 如果出错，使用空数组
      this.setData({
        hotRankings: [],
        newRankings: [],
        reviewRankings: []
      })
    }
  },

  // 加载最热榜 - 按播放量排序
  async loadHotRankings() {
    return new Promise((resolve) => {
      wx.request({
        url: `${app.globalData.supabaseUrl}/rest/v1/podcasts?select=id,title,description,audio_url,cover_url,duration,play_count,channels(name)&status=eq.published&order=play_count.desc,created_at.desc&limit=10`,
        method: 'GET',
        header: {
          'apikey': app.globalData.supabaseAnonKey,
          'Authorization': `Bearer ${app.globalData.supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            const podcasts = res.data.map(podcast => ({
              id: podcast.id,
              title: podcast.title,
              description: podcast.description,
              audio_url: podcast.audio_url,
              cover_url: podcast.cover_url,
              duration: podcast.duration,
              play_count: podcast.play_count,
              channel: podcast.channels?.name || '达芬Qi官方'
            }))
            resolve({ success: true, data: podcasts })
          } else {
            resolve({ success: false, error: '加载最热榜失败' })
          }
        },
        fail: () => resolve({ success: false, error: '网络错误' })
      })
    })
  },

  // 加载最新榜 - 按发布时间排序  
  async loadNewRankings() {
    return new Promise((resolve) => {
      wx.request({
        url: `${app.globalData.supabaseUrl}/rest/v1/podcasts?select=id,title,description,audio_url,cover_url,duration,created_at,channels(name)&status=eq.published&order=created_at.desc&limit=10`,
        method: 'GET', 
        header: {
          'apikey': app.globalData.supabaseAnonKey,
          'Authorization': `Bearer ${app.globalData.supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            const podcasts = res.data.map(podcast => ({
              id: podcast.id,
              title: podcast.title,
              description: podcast.description,
              audio_url: podcast.audio_url,
              cover_url: podcast.cover_url,
              duration: podcast.duration,
              created_at: podcast.created_at,
              channel: podcast.channels?.name || '达芬Qi官方'
            }))
            resolve({ success: true, data: podcasts })
          } else {
            resolve({ success: false, error: '加载最新榜失败' })
          }
        },
        fail: () => resolve({ success: false, error: '网络错误' })
      })
    })
  },

  // 加载综述榜 - 按收藏量排序
  async loadReviewRankings() {
    return new Promise((resolve) => {
      wx.request({
        url: `${app.globalData.supabaseUrl}/rest/v1/podcasts?select=id,title,description,audio_url,cover_url,duration,favorite_count,channels(name)&status=eq.published&order=favorite_count.desc,like_count.desc,created_at.desc&limit=10`,
        method: 'GET',
        header: {
          'apikey': app.globalData.supabaseAnonKey,
          'Authorization': `Bearer ${app.globalData.supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            const podcasts = res.data.map(podcast => ({
              id: podcast.id,
              title: podcast.title,
              description: podcast.description,
              audio_url: podcast.audio_url,
              cover_url: podcast.cover_url,
              duration: podcast.duration,
              favorite_count: podcast.favorite_count,
              channel: podcast.channels?.name || '达芬Qi官方'
            }))
            resolve({ success: true, data: podcasts })
          } else {
            resolve({ success: false, error: '加载综述榜失败' })
          }
        },
        fail: () => resolve({ success: false, error: '网络错误' })
      })
    })
  },

  // 初始化推荐论文
  initRecommendedPapers: function() {
    const papers = [
      {
        id: 'paper_001',
        title: '论文标题',
        team: '主要团队 研究机构',
        abstract: 'Abstract: As robots are becoming skilled at performing complex tasks, the next step……'
      },
      {
        id: 'paper_002',
        title: '论文标题',
        team: '主要团队 研究机构',
        abstract: 'Abstract: The criteria for consideration of translational and clinical research……'
      }
    ]
    
    this.setData({
      recommendedPapers: papers
    })
  },

  // 初始化分类数据
  initCategories: function() {
    const categories = [
      {
        id: 'cs_ai',
        name: 'cs.AI',
        icon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/CS-AI-Logo.png'
      },
      {
        id: 'cs_cl',
        name: 'cs.CL',
        icon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/CS-CL-Logo.png'
      },
      {
        id: 'cs_cv',
        name: 'cs.CV',
        icon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/CS-CV-Logo.png'
      },
      {
        id: 'cs_lg',
        name: 'cs.LG',
        icon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/CS-LG-Logo.png'
      },
      {
        id: 'cs_ma',
        name: 'cs.MA',
        icon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/CS-MA-Logo.png'
      },
      {
        id: 'cs_ro',
        name: 'cs.RO',
        icon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/CS-RO-Logo.png'
      },
      {
        id: 'cs_sd',
        name: 'cs.SD',
        icon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/CS-SD-Logo.png'
      }
    ]
    
    this.setData({
      categories: categories
    })
  },

  // 初始化精选播客
  initFeaturedPodcasts: function() {
    const podcasts = [
      {
        id: 'featured_001',
        channel: '频道名称',
        title: '播客标题 播客标题 播客标题 播客标题',
        recommendation: '编辑推荐语 编辑推荐语 编辑推荐语 编辑推荐语 编辑推荐语'
      },
      {
        id: 'featured_002',
        channel: '频道名称',
        title: '播客标题 播客标题 播客标题 播客标题',
        recommendation: '编辑推荐语 编辑推荐语 编辑推荐语 编辑推荐语 编辑推荐语'
      }
    ]
    
    this.setData({
      featuredPodcasts: podcasts
    })
  },

  // 页面进入动画
  enterAnimation: function() {
    const query = this.createSelectorQuery()
    query.select('.container').boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        // 可以在这里添加进入动画逻辑
      }
    })
  },

  // 切换标签页
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab
    console.log('切换到标签页:', tab)
    
    this.setData({
      currentTab: tab
    })
  },

  // 搜索输入
  onSearchInput: function(e) {
    const value = e.detail.value
    this.setData({
      searchValue: value
    })
    
    // 可以在这里添加搜索逻辑
    if (value.trim()) {
      console.log('搜索:', value)
      // 执行搜索
      this.performSearch(value)
    }
  },

  // 跳转到搜索界面
  goToSearch: function() {
    console.log('跳转到搜索界面')
    wx.navigateTo({
      url: '/pages/search/search',
      success: function() {
        console.log('成功跳转到搜索界面')
      },
      fail: function(err) {
        console.error('跳转搜索界面失败:', err)
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 执行搜索（保留原有方法以防其他地方使用）
  performSearch: function(keyword) {
    // 现在跳转到搜索界面，并传递搜索关键词
    wx.navigateTo({
      url: `/pages/search/search?query=${encodeURIComponent(keyword)}`
    })
  },

  // 播放播客
  playPodcast: function(e) {
    const item = e.currentTarget.dataset.item
    console.log('播放播客:', item)
    
    if (!item || !item.id) {
      wx.showToast({
        title: '播客数据错误',
        icon: 'none'
      })
      return
    }

    // 更新全局播放状态
    const app = getApp()
    app.globalData.currentPodcast = {
      id: item.id,
      title: item.title,
      description: item.description,
      audio_url: item.audio_url,
      cover_url: item.cover_url || 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/default-cover.png',
      duration: item.duration,
      channel: item.channel,
      play_count: item.play_count || 0,
      favorite_count: item.favorite_count || 0,
      created_at: item.created_at
    }
    
    // 设置播放状态
    app.globalData.isPlaying = false // 先设为false，让browse页面来控制播放
    app.globalData.currentProgress = 0
    
    // 添加到历史记录
    app.addToHistory(app.globalData.currentPodcast)
    
    // 跳转到漫游页面
    wx.switchTab({
      url: '/pages/browse/browse',
      success: () => {
        console.log('成功跳转到漫游页面')
      },
      fail: (error) => {
        console.error('跳转漫游页面失败:', error)
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        })
      }
    })
  },

  // 阅读论文
  readPaper: function(e) {
    const item = e.currentTarget.dataset.item
    console.log('阅读论文:', item)
    
    wx.showToast({
      title: '论文详情页开发中',
      icon: 'none',
      duration: 1500
    })
  },

  // 选择分类
  selectCategory: function(e) {
    const category = e.currentTarget.dataset.category
    console.log('选择分类:', category)
    
    wx.showToast({
      title: `进入${category.name}分类`,
      icon: 'none',
      duration: 1500
    })
  },

  // 查看更多排行榜
  viewMoreRankings: function(e) {
    const type = e.currentTarget.dataset.type || 'hot'
    console.log('查看完整榜单, 默认显示:', type)
    
    wx.navigateTo({
      url: `/pages/ranking/ranking?defaultTab=${type}`,
      success: () => {
        console.log('成功跳转到榜单详情页')
      },
      fail: (error) => {
        console.error('跳转榜单详情页失败:', error)
        wx.showToast({
          title: '跳转失败',
          icon: 'none',
          duration: 1500
        })
      }
    })
  },

  // 刷新精选内容
  refreshFeatured: function() {
    console.log('刷新精选内容')
    
    wx.showLoading({
      title: '刷新中...'
    })
    
    // 模拟刷新
    setTimeout(() => {
      wx.hideLoading()
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      })
      
      // 重新初始化精选播客数据
      this.initFeaturedPodcasts()
    }, 1000)
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
        // 向右滑动 - 去漫游页面
        console.log('向右滑动到漫游页面')
        wx.switchTab({
          url: '/pages/browse/browse'
        })
      } else {
        // 向左滑动 - 去我的页面
        console.log('向左滑动到我的页面')
        wx.switchTab({
          url: '/pages/profile/profile'
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

  // 下拉刷新
  onPullDownRefresh: function() {
    console.log('下拉刷新')
    
    // 重新加载数据
    this.initPageData()
    
    // 延迟停止刷新
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 上拉加载更多
  onReachBottom: function() {
    console.log('上拉加载更多')
    
    wx.showToast({
      title: '没有更多内容了',
      icon: 'none',
      duration: 1500
    })
  },

  // 分享功能
  onShareAppMessage: function() {
    return {
      title: '达芬Qi说 - 发现精彩的学术内容',
      path: '/pages/category/category',
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
  }
})