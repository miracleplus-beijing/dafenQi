// 收藏页面逻辑
const app = getApp()
const apiService = require('../../services/api.service.js')
const authService = require('../../services/auth.service.js')

Page({
  data: {
    // 标签页状态
    currentTab: 'episodes', // 'episodes' | 'comments'

    // 数据
    favoriteList: [],
    commentsData: [],

    showActionModal: false,
    showLoginPrompt: false, // 显示登录提示
    selectedItem: null,

    // 加载状态
    loading: false,
    error: null,
    userInfo: null
  },

  onLoad: function (options) {
    console.log('收藏页面加载')
  },

  onShow: function () {
    console.log('收藏页面显示')

    // 检查用户登录状态
    if (!authService.checkLoginStatus()) {
      // 未登录用户，显示登录提示
      this.setData({
        favoriteList: [],
        showLoginPrompt: true
      })
      return
    }

    // 已登录用户，正常加载收藏列表
    this.setData({
      showLoginPrompt: false
    })

    console.log(authService.getCurrentUser())
    this.setData ({
      userInfo: authService.getCurrentUser()
    })

    this.loadFavoriteList()

  },
    async removeFromFavorites(e) {
        const id = e.currentTarget.dataset.id || this.data.selectedItem?.id

        if (!id) return

        try {
            const result = await wx.showModal({
                title: '取消收藏',
                content: '确定要取消收藏这个内容吗？',
                confirmText: '确定',
                cancelText: '取消'
            })

            if (result.confirm) {
                // 显示加载提示
                wx.showLoading({
                    title: '正在取消收藏...',
                    mask: true
                })

                // 直接调用API删除收藏
                const removeResult = await apiService.user.removeFavorite(
                  this.data.userInfo.id,
                    id
                )

                wx.hideLoading()

                if (removeResult.success) {
                    // 关闭弹窗
                    this.hideActionModal()

                    wx.showToast({
                        title: '已取消收藏',
                        icon: 'success'
                    })

                    // 重新加载收藏列表
                    this.loadFavoriteList()
                } else {
                    wx.showToast({
                        title: removeResult.error || '操作失败',
                        icon: 'none',
                        duration: 2000
                    })
                }
            }
        } catch (error) {
            wx.hideLoading()
            console.error('取消收藏失败:', error)
            wx.showToast({
                title: '操作失败，请重试',
                icon: 'none',
                duration: 2000
            })
        }
    },
  // =============== 数据加载 ===============

  async loadFavoriteList() {
    this.setData({ loading: true })

    try {
      // 直接从数据库获取收藏列表，不使用本地缓存
      console.log(this.data.userInfo)
      console.log(this.data.loading)
        const result = await apiService.user.getFavorites(this.data.userInfo.id)

        if (result.success && result.data) {
          // 处理从数据库获取的收藏数据
          const favoriteList = result.data.map(item => {
            const podcast = item.podcast || {}
            return {
              id: item.podcast_id,
              title: podcast.title || '未知标题',
              cover_url: podcast.cover_url,
              channel: podcast.channel_name,
              hosts: this.formatHosts(podcast.hosts || podcast.channel_name),
              duration: podcast.duration,
              publish_date: podcast.publish_date,
              play_count: podcast.play_count,
              comment_count: podcast.comment_count,
              favoriteTime: new Date(item.created_at).getTime(),
              // 格式化数据
              durationText: this.formatDuration(podcast.duration),
              publishDateText: this.formatPublishDate(podcast.publish_date),
              favoriteTimeText: this.formatTime(new Date(item.created_at).getTime()),
              playCountText: this.formatPlayCount(podcast.play_count),
              commentCountText: this.formatCommentCount(podcast.comment_count)
            }
          })

          this.setData({
            favoriteList: favoriteList,
            loading: false,
            error: null
          })
        } else {
          this.setData({
            favoriteList: [],
            loading: false,
            error: null
          })
        }


    } catch (error) {
      console.error('加载收藏列表失败:', error)
      this.setData({
        loading: false,
        error: '加载失败，请重试'
      })
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // =============== 标签页切换 ===============

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })

    if (tab === 'comments') {
      // 如果切换到评论标签，加载评论数据
      this.loadCommentsData()
    }
  },

  async loadCommentsData() {
    // 暂时显示空状态，后续可扩展
    this.setData({
      commentsData: []
    })
  },





  // =============== 播放功能 ===============

  playFavoriteItem(e) {
    const item = e.currentTarget.dataset.item
    console.log('播放收藏项目:', item)

    // 确保播客数据完整性
    if (!item || !item.id) {
      wx.showToast({
        title: '播客信息不完整',
        icon: 'none',
        duration: 1500
      })
      return
    }

    // 更新全局播放状态，确保数据结构与browse页面兼容
    app.globalData.currentPodcast = {
      id: item.id,
      title: item.title || '未知播客',
      cover_url: item.cover_url,
      audio_url: item.audio_url,
      duration: item.duration || 0,
      channel_name: item.hosts || item.channel || '未知频道',
      // 添加browse页面期望的字段
      description: item.description || '',
      play_count: item.play_count || 0,
      like_count: item.like_count || 0,
      favorite_count: item.favorite_count || 0,
      created_at: item.created_at || new Date().toISOString()
    }
    app.globalData.isPlaying = true

    // 添加到播放历史（使用统一的数据结构）
    const historyItem = {
      id: item.id,
      title: item.title,
      cover_url: item.cover_url,
      channel: item.hosts || item.channel,
      favoriteTime: Date.now()
    }
    app.addToHistory(historyItem)

    // 跳转到首页进行播放
    wx.switchTab({
      url: '/pages/browse/browse',
      success: () => {
        wx.showToast({
          title: '开始播放',
          icon: 'success',
          duration: 1500
        })
      },
      fail: (error) => {
        console.error('跳转到播放页面失败:', error)
        wx.showToast({
          title: '播放失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // =============== 更多操作 ===============

  showMoreActions(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      showActionModal: true,
      selectedItem: item
    })
  },

  hideActionModal() {
    this.setData({
      showActionModal: false,
      selectedItem: null
    })
  },

  stopPropagation() {
    // 阻止事件冒泡，防止弹窗关闭
  },

  shareItem() {
    const item = this.data.selectedItem
    if (!item) return

    // 分享功能（可以后续扩展）
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })

    this.hideActionModal()

    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    })
  },

  // =============== 数据格式化函数 ===============

  formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })
  },

  formatDuration(seconds) {
    if (!seconds) return '未知时长'

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) {
      return `${minutes}分钟`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return `${hours}小时${remainingMinutes}分钟`
    }
  },

  formatPublishDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })
  },

  formatHosts(hosts) {
    if (Array.isArray(hosts)) {
      return hosts.join(' / ')
    } else if (typeof hosts === 'string') {
      return hosts
    } else {
      return '未知主播'
    }
  },

  formatPlayCount(count) {
    if (!count) return '0'

    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万`
    } else {
      return count.toString()
    }
  },

  formatCommentCount(count) {
    if (!count) return '0'
    return count.toString()
  },

  // =============== 错误处理 ===============

  onError(error) {
    console.error('页面错误:', error)
    this.setData({
      error: '发生错误，请重试'
    })
  },


  // =============== 登录相关 ===============

  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // =============== 下拉刷新 ===============

  onPullDownRefresh() {
    console.log('下拉刷新收藏列表')
    this.loadFavoriteList().finally(() => {
      wx.stopPullDownRefresh()
    })
  }
})