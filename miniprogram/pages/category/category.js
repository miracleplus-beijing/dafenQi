// 分类页面逻辑
const app = getApp()

Page({
  data: {
    // 当前选中的标签页
    currentTab: 'review',
    
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
  initRankingData: function() {
    const sampleRankings = [
      {
        id: 'ranking_001',
        title: '播客标题 播客标题 播客标题 播客标题',
        channel: '频道名称 频道名称 频道名称'
      },
      {
        id: 'ranking_002',
        title: '播客标题 播客标题 播客标题 播客标题',
        channel: '频道名称 频道名称 频道名称'
      },
      {
        id: 'ranking_003',
        title: '播客标题 播客标题 播客标题 播客标题',
        channel: '频道名称 频道名称 频道名称'
      }
    ]
    
    this.setData({
      hotRankings: sampleRankings,
      newRankings: sampleRankings,
      reviewRankings: sampleRankings
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
        icon: '../../images/CS.AI Logo - Artificial Intelligence.png'
      },
      {
        id: 'cs_cl',
        name: 'cs.CL',
        icon: '../../images/CS.CL Logo - Computational Linguistics.png'
      },
      {
        id: 'cs_cv',
        name: 'cs.CV',
        icon: '../../images/CS.CV Logo - Computer Vision.png'
      },
      {
        id: 'cs_lg',
        name: 'cs.LG',
        icon: '../../images/CS.LG Logo - Learning.png'
      },
      {
        id: 'cs_ma',
        name: 'cs.MA',
        icon: '../../images/CS.MA Logo - Multi-Agent Systems.png'
      },
      {
        id: 'cs_ro',
        name: 'cs.RO',
        icon: '../../images/CS.RO Logo - Robotics.png'
      },
      {
        id: 'cs_sd',
        name: 'cs.SD',
        icon: '../../images/CS.SD Logo - Sound Processing.png'
      },
      {
        id: 'cs_ni',
        name: 'cs.NI',
        icon: '../../images/CS.AI Logo - Artificial Intelligence.png'
      },
      {
        id: 'cs_gt',
        name: 'cs.GT',
        icon: '../../images/CS.CL Logo - Computational Linguistics.png'
      },
      {
        id: 'cs_dc',
        name: 'cs.DC',
        icon: '../../images/CS.CV Logo - Computer Vision.png'
      },
      {
        id: 'cs_db',
        name: 'cs.DB',
        icon: '../../images/CS.LG Logo - Learning.png'
      },
      {
        id: 'cs_se',
        name: 'cs.SE',
        icon: '../../images/CS.MA Logo - Multi-Agent Systems.png'
      },
      {
        id: 'cs_cr',
        name: 'cs.CR',
        icon: '../../images/CS.RO Logo - Robotics.png'
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
    
    // 震动反馈
    wx.vibrateShort({
      type: 'light'
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

  // 执行搜索
  performSearch: function(keyword) {
    wx.showToast({
      title: '搜索功能开发中',
      icon: 'none',
      duration: 1500
    })
  },

  // 播放播客
  playPodcast: function(e) {
    const item = e.currentTarget.dataset.item
    console.log('播放播客:', item)
    
    // 添加到历史记录
    app.addToHistory(item)
    
    // 跳转到播放页面或更新播放状态
    wx.switchTab({
      url: '/pages/browse/browse'
    })
    
    wx.vibrateShort({
      type: 'medium'
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
    
    wx.vibrateShort({
      type: 'light'
    })
  },

  // 查看更多排行榜
  viewMoreRankings: function() {
    console.log('查看完整榜单')
    
    wx.showToast({
      title: '完整榜单页面开发中',
      icon: 'none',
      duration: 1500
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
    
    wx.vibrateShort({
      type: 'medium'
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
      imageUrl: '/images/icons/share-cover.jpg'
    }
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '推荐一个很棒的学术播客平台',
      query: 'share=timeline',
      imageUrl: '/images/icons/share-cover.jpg'
    }
  }
})