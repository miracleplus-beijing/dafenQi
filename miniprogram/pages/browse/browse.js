// 漫游页面逻辑
const app = getApp()
const audioPreloader = require('../../services/audio-preloader.service.js')
const { getImageUrl } = require('../../config/image-urls.js')

Page({
  data: {
    // 播放状态
    isPlaying: false,
    currentProgress: 0,
    maxProgress: 100,
    
    // 播客列表
    podcastList: [],
    currentIndex: 0,
    loading: true,
    
    // 分页和去重
    currentPage: 1,
    hasMoreData: true,
    loadedPodcastIds: [], // 已加载的播客ID数组
    
    // 音频相关
    audioContext: null,
    currentAudio: null,
    audioPosition: 0, // 当前播放位置（秒）
    audioDuration: 0,  // 音频总时长（秒）
    
    // 时间显示
    currentTimeFormatted: '0:00',
    totalTimeFormatted: '0:00',
    
    // 防止自动滑动的标志
    lastUserInteraction: 0,
    allowSwiperChange: false,
    
    // CDN图片URL (带本地降级)
    cdnImages: {
      playIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/play-large.svg',
      pauseIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/pause.svg',
      favoriteIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/favorite-unselected.svg',
      favoriteActiveIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/favorite-selected.svg',
      likeIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/like-unselected.svg',
      likeActiveIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/like-selected.svg',
      thumbsUpIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/thumbs-up-unselected.svg',
      thumbsUpActiveIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/thumbs-up-selected.svg',
      shareIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/share.svg',
      commentIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/comment.svg',
      rewindIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/backward-15s.svg',
      forwardIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/forward-30s.svg',
      loadingIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/loading.svg',
      shareCover: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/share-cover.jpg'
    }
  },

  onLoad: function (options) {
    console.log('漫游页面加载', options)
    
    // 初始化音频上下文
    this.initAudioContext()
    
    // 加载播客数据
    this.loadPodcastData()
  },

  onShow: function () {
    console.log('漫游页面显示')
    
    // 页面进入动画
    this.enterAnimation()
  },
  
  // 页面进入动画
  enterAnimation: function() {
    const query = this.createSelectorQuery()
    query.select('.browse-container').boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        // 可以在这里添加进入动画逻辑
        console.log('页面进入动画完成')
      }
    })
  },

  onHide: function () {
    console.log('漫游页面隐藏')
    
    // 保存播放进度
    this.savePlayProgress()
  },

  onUnload: function () {
    console.log('漫游页面卸载')
    
    // 保存播放进度
    this.savePlayProgress()
    
    // 销毁音频上下文
    if (this.data.audioContext) {
      this.data.audioContext.destroy()
    }
    
    // 清理预加载资源
    audioPreloader.destroyAll()
  },

  // 初始化音频上下文
  initAudioContext: function() {
    const audioContext = wx.createInnerAudioContext()
    this.rebindAudioEvents(audioContext)
    this.setData({ audioContext })
  },

  // 重新绑定音频事件监听器
  rebindAudioEvents: function(audioContext) {
    // 音频事件监听
    audioContext.onPlay(() => {
      console.log('音频事件：开始播放')
      // 确保状态同步
      if (!this.data.isPlaying) {
        this.setData({ isPlaying: true })
        console.log('播放状态已同步为: true')
      }
    })
    
    audioContext.onPause(() => {
      console.log('音频事件：暂停播放')
      // 确保状态同步
      if (this.data.isPlaying) {
        this.setData({ isPlaying: false })
        console.log('播放状态已同步为: false')
      }
    })
    
    audioContext.onStop(() => {
      console.log('音频事件：停止播放')
      this.setData({ 
        isPlaying: false,
        currentProgress: 0,
        audioPosition: 0
      })
      console.log('播放状态已重置')
    })
    
    audioContext.onTimeUpdate(() => {
      const currentTime = audioContext.currentTime || 0
      const duration = audioContext.duration || 0
      
      if (duration > 0 && !isNaN(currentTime) && !isNaN(duration) && this.data.isPlaying) {
        const progress = (currentTime / duration) * 100
        const progressRatio = currentTime / duration
        
        // 每次都更新，确保progress-bar流畅
        this.setData({
          currentProgress: Math.min(100, Math.max(0, progress)),
          audioPosition: currentTime,
          audioDuration: duration,
          currentTimeFormatted: this.formatTime(currentTime),
          totalTimeFormatted: this.formatTime(duration)
        })
        
        // 触发预加载检查
        audioPreloader.onProgressUpdate(progressRatio, this.data.currentIndex)
        
        // 减少日志频率
        if (!this._lastLogTime || Date.now() - this._lastLogTime > 2000) {
          this._lastLogTime = Date.now()
          console.log('进度更新:', {
            currentTime: currentTime.toFixed(1),
            duration: duration.toFixed(1),
            progress: progress.toFixed(1) + '%'
          })
        }
      }
    })
    
    audioContext.onEnded(() => {
      console.log('音频播放结束')
      this.setData({ 
        isPlaying: false,
        currentProgress: 100
      })
    })
    
    audioContext.onError((res) => {
      console.error('音频播放错误:', res)
      this.setData({ isPlaying: false })
      wx.showToast({
        title: '播放失败: ' + (res.errMsg || '未知错误'),
        icon: 'none',
        duration: 3000
      })
    })
    
    audioContext.onCanplay(() => {
      console.log('音频可以播放')
      // 获取音频时长并更新显示
      const duration = audioContext.duration
      if (duration > 0) {
        this.setData({
          audioDuration: duration,
          totalTimeFormatted: this.formatTime(duration)
        })
      }
      
      // 确保新音频从正确的位置开始播放
      const { audioPosition } = this.data
      if (audioPosition === 0) {
        console.log('强制重置音频播放位置到0')
        audioContext.seek(0)
      }
    })
    
    audioContext.onWaiting(() => {
      console.log('音频加载中')
    })
  },

  // 加载播客数据
  async loadPodcastData(loadMore = false) {
    try {
      this.setData({ loading: true })
      
      const page = loadMore ? this.data.currentPage + 1 : 1
      
      // 从Supabase数据库加载播客数据
      const result = await this.fetchPodcastsFromDatabase(page)
      
      if (result.success && result.data.length > 0) {
        // 去重处理
        const newPodcasts = result.data.filter(podcast => 
          !this.data.loadedPodcastIds.includes(podcast.id)
        )
        
        // 转换数据格式
        const newPodcastList = newPodcasts.map(podcast => ({
          id: podcast.id,
          title: podcast.title,
          description: podcast.description,
          audio_url: podcast.audio_url,
          cover_url: podcast.cover_url || '',
          channel_name: podcast.channel_name || '奇绩前沿信号',
          duration: podcast.duration || 0,
          isLiked: false,
          isFavorited: false,
          isThumbsUp: false
        }))
        
        // 更新已加载的播客ID数组
        const updatedIds = [...this.data.loadedPodcastIds]
        newPodcasts.forEach(podcast => {
          if (!updatedIds.includes(podcast.id)) {
            updatedIds.push(podcast.id)
          }
        })
        
        console.log('新加载播客数据:', newPodcastList.length, '条 (去重后)')
        console.log('总计已加载ID数:', updatedIds.length)
        
        // 合并数据
        const finalPodcastList = loadMore 
          ? [...this.data.podcastList, ...newPodcastList]
          : newPodcastList
        
        this.setData({
          podcastList: finalPodcastList,
          loadedPodcastIds: updatedIds,
          currentPage: page,
          hasMoreData: newPodcastList.length > 0,
          loading: false,
          // 确保初始状态是重置的（仅首次加载）
          ...(loadMore ? {} : {
            audioPosition: 0,
            currentProgress: 0,
            audioDuration: 0,
            isPlaying: false,
            currentIndex: 0
          })
        })
        
        // 首次加载时，加载第一个播客的播放进度
        if (!loadMore) {
          this.loadPlayProgress(0)
          
          // 初始化音频预加载服务
          audioPreloader.initialize(finalPodcastList, 0)
        } else {
          // 更新预加载服务的播客列表
          audioPreloader.podcastList = finalPodcastList
        }
      } else {
        console.error('播客数据加载失败:', result)
        
        // 提供更详细的错误信息
        let errorMsg = '没有找到播客数据'
        if (result.error) {
          errorMsg = result.error
        } else if (result.data && result.data.length === 0) {
          errorMsg = '数据库中暂无播客内容'
        }
        
        wx.showModal({
          title: '数据加载失败',
          content: errorMsg + '\n请检查网络连接或联系技术支持',
          showCancel: false,
          confirmText: '重试',
          success: (res) => {
            if (res.confirm) {
              this.loadPodcastData()
            }
          }
        })
        
        throw new Error(errorMsg)
      }
      
    } catch (error) {
      console.error('加载播客数据失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败: ' + error.message,
        icon: 'none'
      })
    }
  },

  // 从Supabase数据库获取播客数据
  async fetchPodcastsFromDatabase(page = 1) {
    try {
      // 使用AudioService获取播客数据
      const audioService = require('../../services/audio.service.js')
      const result = await audioService.getPodcastList({
        page: page,
        limit: 10,
        order_by: 'created_at',
        order_direction: 'desc'
      })
      
      console.log('AudioService响应:', result)
      
      if (result.success) {
        // 处理返回的数据，修复音频URL
        const data = result.data.map(item => {
          let audioUrl = item.audio_url
          
          // 如果是相对路径，转换为完整的Supabase Storage URL
          if (audioUrl && audioUrl.startsWith('/')) {
            audioUrl = `https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/podcast-audios${audioUrl}`
          }
          // 如果URL不完整，添加Supabase域名
          else if (audioUrl && !audioUrl.startsWith('http')) {
            audioUrl = `https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/podcast-audios/${audioUrl}`
          }
          
          return Object.assign({}, item, {
            audio_url: audioUrl,
            channel_name: '奇绩前沿信号'
          })
        })
        
        console.log('处理后的播客数据:', data)
        
        return {
          success: true,
          data
        }
      } else {
        throw new Error(result.error || '获取播客数据失败')
      }
    } catch (error) {
      console.error('从数据库获取播客数据失败:', error)
      return {
        success: false,
        error: error.message || '网络请求失败',
        data: []
      }
    }
  },

  // 处理触摸开始
  handleTouchStart: function(e) {
    console.log('用户开始触摸swiper')
    this.setData({ lastUserInteraction: Date.now() })
  },

  // 处理触摸移动
  handleTouchMove: function(e) {
    console.log('用户正在滑动swiper')
    this.setData({ lastUserInteraction: Date.now() })
  },

  // 处理Swiper切换
  handleSwiperChange: function(e) {
    const currentIndex = e.detail.current
    const oldIndex = this.data.currentIndex
    const now = Date.now()
    const { podcastList, hasMoreData } = this.data
    
    console.log('=== SWIPER CHANGE DEBUG ===')
    console.log('触发时间:', new Date().toISOString())
    console.log('旧索引:', oldIndex)
    console.log('新索引:', currentIndex)
    console.log('播客总数:', podcastList.length)
    console.log('还有更多数据:', hasMoreData)
    console.log('上次用户交互:', this.data.lastUserInteraction)
    console.log('时间差:', now - this.data.lastUserInteraction)
    console.log('========================')
    
    // 严格检查：只有在用户最近有交互时才允许切换
    const timeSinceLastInteraction = now - this.data.lastUserInteraction
    if (timeSinceLastInteraction > 1000) {  // 1秒内必须有用户交互
      console.log('BLOCKED: 非用户触发的滑动，已阻止')
      return
    }
    
    // 如果索引没有变化，直接返回
    if (currentIndex === oldIndex) {
      console.log('索引未变化，跳过处理')
      return
    }
    
    // 检查是否需要加载更多数据（接近列表末尾时）
    if (currentIndex >= podcastList.length - 2 && hasMoreData && !this.data.loading) {
      console.log('接近列表末尾，加载更多数据')
      this.loadPodcastData(true) // 加载更多
    }
    
    // 保存上一个播客的播放进度
    this.savePlayProgress()
    
    // 停止当前播放
    if (this.data.audioContext) {
      this.data.audioContext.stop()
    }
    
    // 重置音频状态
    if (this.data.audioContext) {
      this.data.audioContext.src = ''
    }
    
    // 更新当前索引并重置所有播放状态
    this.setData({
      currentIndex,
      isPlaying: false,
      currentProgress: 0,
      audioPosition: 0,
      audioDuration: 0,
      currentTimeFormatted: '0:00',
      totalTimeFormatted: '0:00'
    })
    
    // 更新预加载服务的当前位置
    audioPreloader.updateCurrentIndex(currentIndex)
    
    // 加载新播客的播放进度
    this.loadPlayProgress(currentIndex)
  },

  // 处理播放/暂停
  handlePlayPause: function() {
    const { audioContext, isPlaying, podcastList, currentIndex } = this.data
    
    console.log('播放按钮点击，当前状态:', { isPlaying, currentIndex })
    
    if (!audioContext || !podcastList.length) {
      console.error('音频上下文或播客列表为空')
      wx.showToast({
        title: '播放器初始化失败',
        icon: 'none'
      })
      return
    }
    
    const currentPodcast = podcastList[currentIndex]
    if (!currentPodcast || !currentPodcast.audio_url) {
      console.error('当前播客数据无效')
      wx.showToast({
        title: '播客数据无效',
        icon: 'none'
      })
      return
    }
    
    console.log('当前播客:', currentPodcast.title)
    console.log('音频路径:', currentPodcast.audio_url)
    
    if (isPlaying) {
      // 暂停播放
      console.log('用户点击暂停，执行暂停操作')
      audioContext.pause()
    } else {
      // 开始播放
      console.log('用户点击播放，执行播放操作')
      console.log('当前音频源:', audioContext.src)
      console.log('目标音频源:', currentPodcast.audio_url)
      
      // 检查是否需要切换音频源
      const currentSrc = audioContext.src || ''
      const newSrc = currentPodcast.audio_url
      const isNewAudio = currentSrc !== newSrc
      
      if (isNewAudio) {
        console.log('设置新音频源')
        
        // 检查是否有预加载的音频
        const preloadedAudio = audioPreloader.getPreloadedAudio(newSrc)
        
        if (preloadedAudio) {
          console.log('🚀 使用预加载音频，快速切换')
          
          // 停止当前音频
          audioContext.stop()
          
          // 销毁当前音频上下文，使用预加载的
          audioContext.destroy()
          
          // 使用预加载的音频上下文
          const newAudioContext = preloadedAudio
          this.setData({ audioContext: newAudioContext })
          
          // 重新绑定事件监听器
          this.rebindAudioEvents(newAudioContext)
          
          // 立即播放
          newAudioContext.play()
          
        } else {
          console.log('📱 标准音频加载流程')
          
          // 停止当前音频
          audioContext.stop()
          
          // 设置新的音频源
          audioContext.src = newSrc
          
          // 重置播放状态
          this.setData({
            audioPosition: 0,
            currentProgress: 0,
            audioDuration: 0,
            currentTimeFormatted: '0:00',
            totalTimeFormatted: '0:00'
          })
          
          // 开始播放
          audioContext.play()
        }
      } else {
        // 继续播放当前音频
        audioContext.play()
      }
      
      // 添加到历史记录
      this.recordPlayStart(currentPodcast)
      
      console.log('播放命令已发送，等待状态回调')
    }
  },

  // 处理progress-bar点击
  handleProgressClick: function(e) {
    const { audioContext, audioDuration } = this.data
    
    if (!audioContext || !audioDuration) return
    
    const query = this.createSelectorQuery()
    query.select('.progress-bar').boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        const rect = res[0]
        const clickX = e.detail.x - rect.left
        const percentage = (clickX / rect.width) * 100
        const seekTime = (percentage / 100) * audioDuration
        
        // 跳转到指定时间
        audioContext.seek(seekTime)
        
        this.setData({
          currentProgress: percentage,
          audioPosition: seekTime
        })
        
        console.log('跳转到时间:', seekTime + '秒')
      }
    })
  },

  // 处理后退15秒
  handleRewind: function() {
    const { audioContext, audioPosition } = this.data
    
    if (!audioContext) return
    
    const newPosition = Math.max(0, audioPosition - 15)
    audioContext.seek(newPosition)
    
    console.log('后退15秒')
  },

  // 处理前进30秒
  handleFastForward: function() {
    const { audioContext, audioPosition, audioDuration } = this.data
    
    if (!audioContext) return
    
    const newPosition = Math.min(audioDuration, audioPosition + 30)
    audioContext.seek(newPosition)
    
    console.log('前进30秒')
  },

  // 处理喜欢
  handleLike: function() {
    const { currentIndex, podcastList } = this.data
    const isLiked = !podcastList[currentIndex].isLiked
    
    podcastList[currentIndex].isLiked = isLiked
    
    this.setData({
      podcastList: podcastList
    })
    
    wx.showToast({
      title: isLiked ? '已喜欢' : '取消喜欢',
      icon: 'none',
      duration: 1500
    })
  },

  // 处理点赞
  handleThumbsUp: function() {
    const { currentIndex, podcastList } = this.data
    const isThumbsUp = !podcastList[currentIndex].isThumbsUp
    
    podcastList[currentIndex].isThumbsUp = isThumbsUp
    
    this.setData({
      podcastList: podcastList
    })
    
    wx.showToast({
      title: isThumbsUp ? '已点赞' : '取消点赞',
      icon: 'none',
      duration: 1500
    })
  },

  // 处理收藏
  async handleFavorite() {
    const { currentIndex, podcastList } = this.data
    const podcast = podcastList[currentIndex]
    const isFavorited = !podcast.isFavorited
    
    try {
      const audioService = require('../../services/audio.service.js')
      
      if (isFavorited) {
        // 添加到收藏
        const result = await audioService.addToFavorites('default-user-id', podcast.id)
        
        if (result.success) {
          podcastList[currentIndex].isFavorited = true
          this.setData({ podcastList })
          
          wx.showToast({
            title: '已收藏',
            icon: 'success',
            duration: 1500
          })
        } else {
          throw new Error(result.error || '收藏失败')
        }
      } else {
        // 从收藏中移除
        const result = await audioService.removeFromFavorites('default-user-id', podcast.id)
        
        if (result.success) {
          podcastList[currentIndex].isFavorited = false
          this.setData({ podcastList })
          
          wx.showToast({
            title: '已取消收藏',
            icon: 'none',
            duration: 1500
          })
        } else {
          throw new Error(result.error || '取消收藏失败')
        }
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      wx.showToast({
        title: '操作失败: ' + error.message,
        icon: 'none',
        duration: 2000
      })
    }
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

  // 播放下一个播客（仅在用户手动操作时调用）
  playNext: function() {
    // 完全禁用自动切换功能
    console.log('playNext 被调用，但已禁用自动切换')
    wx.showToast({
      title: '请手动滑动切换',
      icon: 'none',
      duration: 1000
    })
  },

  // 保存播放进度
  savePlayProgress: function() {
    const { currentIndex, podcastList, audioPosition } = this.data
    
    if (!podcastList.length || currentIndex < 0) return
    
    const podcast = podcastList[currentIndex]
    const progressKey = `podcast_progress_${podcast.id}`
    
    try {
      wx.setStorageSync(progressKey, {
        position: audioPosition,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('保存播放进度失败:', error)
    }
  },
  
  // 加载播放进度
  loadPlayProgress: function(index) {
    const { podcastList } = this.data
    
    if (!podcastList.length || index < 0 || index >= podcastList.length) return
    
    const podcast = podcastList[index]
    const progressKey = `podcast_progress_${podcast.id}`
    
    try {
      const progress = wx.getStorageSync(progressKey)
      
      if (progress && progress.position > 0) {
        // 如果有保存的进度，询问是否继续播放
        wx.showModal({
          title: '继续播放',
          content: `检测到上次播放进度，是否从 ${Math.floor(progress.position / 60)}:${Math.floor(progress.position % 60).toString().padStart(2, '0')} 继续播放？`,
          success: (res) => {
            if (res.confirm && this.data.audioContext) {
              // 同时更新audioPosition状态
              this.setData({
                audioPosition: progress.position
              })
              this.data.audioContext.seek(progress.position)
            } else {
              // 用户选择从头开始播放，确保audioPosition为0
              this.setData({
                audioPosition: 0
              })
            }
          }
        })
      }
    } catch (error) {
      console.error('加载播放进度失败:', error)
    }
  },

  // 分享功能
  onShareAppMessage: function() {
    const { currentIndex, podcastList } = this.data
    const currentPodcast = podcastList[currentIndex] || {}
    
    return {
      title: currentPodcast.title || '达芬Qi说播客',
      path: '/pages/browse/browse',
      imageUrl: currentPodcast.cover_url || getImageUrl('icons/share-cover.jpg')
    }
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    const { currentIndex, podcastList } = this.data
    const currentPodcast = podcastList[currentIndex] || {}
    
    return {
      title: '我在达芬Qi说听到了这个有趣的内容',
      query: 'share=timeline',
      imageUrl: currentPodcast.cover_url || getImageUrl('icons/share-cover.jpg')
    }
  },

  // 格式化时间显示 (秒转为 mm:ss 或 h:mm:ss)
  formatTime: function(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  },

  // 记录播放开始
  async recordPlayStart(podcast) {
    try {
      const audioService = require('../../services/audio.service.js')
      await audioService.recordPlayHistory('default-user-id', podcast.id, 0, 0)
      console.log('播放历史记录成功')
    } catch (error) {
      console.error('记录播放历史失败:', error)
    }
  }
})