// 榜单详情页面逻辑
const app = getApp()

Page({
  data: {
    // 当前选中的标签页
    currentTab: 'hot',
    
    // 搜索相关
    searchValue: '',
    
    // 三个榜单数据
    hotRankings: [],
    newRankings: [],
    reviewRankings: [],
  },

  onLoad: function (options) {
    console.log('榜单详情页面加载', options)
    
    // 获取默认标签页
    const defaultTab = options.defaultTab || 'hot'
    this.setData({
      currentTab: defaultTab
    })
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: '完整榜单'
    })
    
    // 加载所有榜单数据
    this.loadAllRankingData()
  },

  onShow: function () {
    console.log('榜单详情页面显示')
  },

  // 加载所有榜单数据
  async loadAllRankingData() {
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
      console.error('加载榜单数据失败:', error)
      // 如果出错，使用空数组
      this.setData({
        hotRankings: [],
        newRankings: [],
        reviewRankings: []
      })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 切换标签页
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab
    console.log('切换到标签页:', tab)
    
    this.setData({
      currentTab: tab
    })
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

  // 搜索输入
  onSearchInput: function(e) {
    const value = e.detail.value
    this.setData({
      searchValue: value
    })
    
    if (value.trim()) {
      console.log('搜索:', value)
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

  // 下拉刷新
  onPullDownRefresh: function() {
    console.log('下拉刷新')
    
    // 重新加载数据
    this.loadAllRankingData()
    
    // 延迟停止刷新
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 分享功能
  onShareAppMessage: function() {
    return {
      title: `达芬Qi说 - 完整榜单`,
      path: `/pages/ranking/ranking?defaultTab=${this.data.currentTab}`,
      imageUrl: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/share-cover.jpg'
    }
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: `推荐一个很棒的学术播客榜单`,
      query: `defaultTab=${this.data.currentTab}&share=timeline`,
      imageUrl: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/share-cover.jpg'
    }
  }
})