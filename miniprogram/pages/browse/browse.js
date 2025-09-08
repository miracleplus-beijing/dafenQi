// 漫游页面逻辑
const app = getApp()
const audioPreloader = require('../../services/audio-preloader.service.js')
const insightService = require('../../services/insight.service.js')
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
    
    // 自定义音频加载状态
    audioLoadingVisible: false,
    audioLoadingText: '加载播客...',
    
    // 分页和去重
    currentPage: 1,
    hasMoreData: true,
    loadedPodcastIds: [], // 已加载的播客ID数组
    
    // 音频相关
    audioContext: null,
    currentAudio: null,
    audioPosition: 0, // 当前播放位置（秒）
    audioDuration: 0,  // 音频总时长（秒）
    audioLoading: false, // 音频是否正在加载
    
    // 时间显示
    currentTimeFormatted: '0:00',
    totalTimeFormatted: '0:00',
    
    // 防止自动滑动的标志
    lastUserInteraction: 0,
    allowSwiperChange: false,
    isDraggingThumb: false,
    
    // 自动播放控制
    autoPlayOnSwipe: true, // 控制下滑后是否自动播放
    userGestureActive: false, // 是否有用户手势正在进行
    
    // 进度条拖拽优化
    progressBarRect: null, // 缓存进度条位置信息
    bufferProgress: 0, // 预加载进度（百分比）
    lastThrottleTime: 0, // 节流时间戳
    throttleInterval: 16, // 约60fps的节流间隔
    
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
      shareGrayIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/share-gray.svg',
      insightIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/insight.svg',
      rewindIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/backward-15s.svg',
      forwardIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/forward-30s.svg',
      loadingIcon: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/loading.svg',
      shareCover: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/share-cover.jpg'
    },
    
    // 认知提取相关状态
    insightVisible: false, // 弹窗显示状态
    insightFullScreen: false, // 全屏模式
    insightLoading: false, // 加载状态
    insightError: '', // 错误信息
    currentInsightData: null, // 当前显示的insight数据
    
    // 拖拽手势相关（用于全屏切换）
    insightTouchStartY: 0, // 手势开始位置
    insightTouchMoveY: 0, // 手势移动位置
    insightTouchStartTime: 0, // 手势开始时间
    
    // 内容手势相关（用于关闭手势）
    contentTouchStartY: 0, // 内容区手势开始位置
    contentTouchMoveY: 0, // 内容区手势移动位置
    contentTouchStartTime: 0 // 内容区手势开始时间
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
    
    // 预缓存进度条位置信息
    setTimeout(() => {
      this.updateProgressBarRect()
    }, 100) // 等待DOM渲染完成
    
    // 检查是否首次访问，显示自动播放提示
    this.checkAutoPlayFirstTime()
    
    // 延迟检查全局播客状态，确保数据加载完成
    setTimeout(() => {
      this.checkGlobalPodcastState()
    }, 200)
  },

  // 检查全局播客状态
  checkGlobalPodcastState: function() {
    const globalData = app.globalData
    
    // 如果有指定的播客需要播放
    if (globalData.currentPodcast && globalData.currentPodcast.id) {
      console.log('检测到全局播客状态，准备播放:', globalData.currentPodcast.title)
      console.log('全局播客数据:', globalData.currentPodcast)
      
      // 查找该播客在当前列表中的位置
      const targetPodcastId = globalData.currentPodcast.id
      const currentList = this.data.podcastList
      console.log('当前播客列表长度:', currentList.length)
      const targetIndex = currentList.findIndex(podcast => podcast.id === targetPodcastId)
      
      if (targetIndex >= 0) {
        // 播客在当前列表中，直接切换到该播客
        console.log('播客在当前列表中，切换到索引:', targetIndex)
        this.setData({
          currentIndex: targetIndex
        })
        // 自动播放
        setTimeout(() => {
          this.startAutoPlay()
        }, 500)
      } else {
        // 播客不在当前列表中，将其插入到列表开头
        console.log('播客不在当前列表中，插入到列表开头')
        
        // 确保播客数据格式正确
        const formattedPodcast = {
          ...globalData.currentPodcast,
          isFavorited: false,
          isLiked: false,
          isThumbsUp: false,
          cover_url: globalData.currentPodcast.cover_url || 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/default-cover.png'
        }
        
        console.log('格式化的播客数据:', formattedPodcast)
        
        const finalList = [formattedPodcast, ...currentList]
        
        this.setData({
          podcastList: finalList,
          currentIndex: 0,
          loading: false
        }, () => {
          console.log('播客列表已更新，当前索引:', this.data.currentIndex)
          // 自动播放新插入的播客
          setTimeout(() => {
            this.startAutoPlay()
          }, 500)
        })
      }
      
      // 清除全局状态，避免重复处理
      globalData.currentPodcast = null
    } else {
      console.log('没有检测到全局播客状态')
    }
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
    this.cleanupPreloadedAudio()
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
      this.setData({ 
        isPlaying: true,
        audioLoading: false
      })
    })
    
    audioContext.onPause(() => {
      console.log('音频事件：暂停播放')
      this.setData({ 
        isPlaying: false,
        audioLoading: false
      })
    })
    
    audioContext.onStop(() => {
      console.log('音频事件：停止播放')
      this.setData({ 
        isPlaying: false,
        currentProgress: 0,
        audioPosition: 0,
        audioLoading: false
      })
    })
    
    audioContext.onTimeUpdate(() => {
      const currentTime = audioContext.currentTime || 0
      const duration = audioContext.duration || 0
      
      // 移除过于严格的条件判断，确保进度条能正常更新
      if (duration > 0 && !this.data.isDraggingThumb) {
        const progress = (currentTime / duration) * 100
        const progressRatio = currentTime / duration
        
        // 获取预加载进度
        const bufferProgress = this.getBufferProgress(audioContext)
        
        this.setData({
          currentProgress: Math.min(100, Math.max(0, progress)),
          audioPosition: currentTime,
          audioDuration: duration,
          currentTimeFormatted: this.formatTime(currentTime),
          totalTimeFormatted: this.formatTime(duration),
          bufferProgress: bufferProgress
        })
        
        // 触发预加载检查
        audioPreloader.onProgressUpdate(progressRatio, this.data.currentIndex)
      }
    })
    
    audioContext.onEnded(() => {
      console.log('音频播放结束')
      this.setData({ 
        isPlaying: false,
        currentProgress: 100,
        audioLoading: false
      })
    })
    
    audioContext.onError((res) => {
      console.error('音频播放错误:', res)
      this.setData({ 
        isPlaying: false,
        audioLoading: false
      })
      // 如果是自动播放导致的错误，提示更友好
      const errorMsg = this.data.autoPlayOnSwipe ? 
        '自动播放失败，请手动点击播放' : 
        '播放失败: ' + (res.errMsg || '未知错误')
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 3000
      })
    })
    
    audioContext.onCanplay(() => {
      console.log('音频可以播放')
      const duration = audioContext.duration
      if (duration > 0) {
        this.setData({
          audioDuration: duration,
          totalTimeFormatted: this.formatTime(duration),
          audioLoading: false
        })
      }
    })
    
    audioContext.onWaiting(() => {
      console.log('音频加载中')
      this.setData({ audioLoading: true })
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
          channel_name: podcast.channels ? podcast.channels.name : (podcast.channel_name || '奇绩前沿信号'),
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
            channel_name: item.channels ? item.channels.name : '奇绩前沿信号'
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
    const now = Date.now()
    this.setData({ 
      lastUserInteraction: now,
      userGestureActive: true
    })
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
    console.log('用户手势状态:', this.data.userGestureActive)
    console.log('========================')
    
    // 更严格的用户交互检查：必须是用户手势触发
    const timeSinceLastInteraction = now - this.data.lastUserInteraction
    if (timeSinceLastInteraction > 1000 || !this.data.userGestureActive) {
      console.log('BLOCKED: 非用户触发的滑动，已阻止 - 时间差:', timeSinceLastInteraction, '手势状态:', this.data.userGestureActive)
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
    
    // 更新当前索引并重置播放状态（但不清空音频源）
    this.setData({
      currentIndex,
      isPlaying: false,
      currentProgress: 0,
      audioPosition: 0,
      audioDuration: 0,
      currentTimeFormatted: '0:00',
      totalTimeFormatted: '0:00',
      userGestureActive: false // 重置手势状态
    })
    
    // 更新预加载服务的当前位置
    audioPreloader.updateCurrentIndex(currentIndex)
    
    // 加载新播客的播放进度（延迟执行，确保状态更新完成）
    setTimeout(() => {
      this.loadPlayProgress(currentIndex)
    }, 100)
    
    // 自动播放新播客（仅在启用自动播放时）
    if (this.data.autoPlayOnSwipe && podcastList[currentIndex]) {
      console.log('🎵 触发自动播放 - 当前播客:', podcastList[currentIndex].title)
      // 短暂延迟确保UI状态更新完成
      setTimeout(() => {
        this.triggerAutoPlay()
      }, 300)
    }
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
      this.startPlayback(currentPodcast)
    }
  },

  // 开始播放的统一处理函数
  startPlayback: function(currentPodcast) {
    const { audioContext } = this.data
    
    console.log('开始播放逻辑，当前音频源:', audioContext.src)
    console.log('目标音频源:', currentPodcast.audio_url)
    
    // 显示加载状态
    this.showCustomLoading('加载播客...')
    
    // 检查是否需要切换音频源
    const currentSrc = audioContext.src || ''
    const newSrc = currentPodcast.audio_url
    const isNewAudio = currentSrc !== newSrc
    
    if (isNewAudio) {
      console.log('需要切换音频源')
      this.switchAudioSource(currentPodcast, newSrc)
    } else {
      // 继续播放当前音频
      console.log('继续播放当前音频')
      this.hideCustomLoading()
      
      // 如果有保存的播放进度且还未应用，先应用进度
      if (this.savedProgress && this.savedProgress > 0) {
        console.log('应用保存的播放进度:', this.savedProgress)
        audioContext.seek(this.savedProgress)
        this.savedProgress = 0
      }
      
      audioContext.play()
    }
    
    // 添加到历史记录
    this.recordPlayStart(currentPodcast)
    
    // 触发音频预加载机制
    this.triggerPreloading()
    
    console.log('播放命令已发送，等待状态回调')
  },

  // 切换音频源的处理函数
  switchAudioSource: function(currentPodcast, newSrc) {
    const { audioContext } = this.data
    
    // 检查是否有预加载的音频
    const preloadedAudio = audioPreloader.getPreloadedAudio(newSrc)
    
    if (preloadedAudio) {
      console.log('🚀 使用预加载音频，快速切换')
      this.usePreloadedAudio(preloadedAudio)
    } else {
      console.log('📱 标准音频加载流程')
      this.loadNewAudio(audioContext, newSrc)
    }
  },

  // 使用预加载音频
  usePreloadedAudio: function(preloadedAudio) {
    const { audioContext } = this.data
    
    this.hideCustomLoading()
    
    // 停止当前音频
    audioContext.stop()
    
    // 销毁当前音频上下文，使用预加载的
    audioContext.destroy()
    
    // 使用预加载的音频上下文
    this.setData({ audioContext: preloadedAudio })
    
    // 重新绑定事件监听器
    this.rebindAudioEvents(preloadedAudio)
    
    // 如果有保存的播放进度，跳转到指定位置
    if (this.savedProgress && this.savedProgress > 0) {
      console.log('恢复预加载音频播放进度到:', this.savedProgress)
      preloadedAudio.seek(this.savedProgress)
      this.savedProgress = 0
    }
    
    // 立即播放
    preloadedAudio.play()
  },

  // 加载新音频
  loadNewAudio: function(audioContext, newSrc) {
    // 停止当前音频
    audioContext.stop()
    
    // 设置新的音频源
    audioContext.src = newSrc
    
    // 重置播放状态
    this.setData({
      audioDuration: 0,
      totalTimeFormatted: '0:00'
    })
    
    let loadingHandled = false
    
    // 添加音频加载超时处理 - 减少到6秒
    const loadingTimeout = setTimeout(() => {
      if (!loadingHandled) {
        loadingHandled = true
        this.hideCustomLoading()
        this.setData({ isPlaying: false })
        
        console.error('音频加载超时，尝试重新加载')
        this.retryAudioLoading(audioContext, newSrc)
      }
    }, 6000)
    
    // 监听首次canplay事件
    const onCanplayOnce = () => {
      if (loadingHandled) return
      loadingHandled = true
      
      clearTimeout(loadingTimeout)
      this.hideCustomLoading()
      audioContext.offCanplay(onCanplayOnce)
      
      console.log('音频加载完成，可以播放')
      
      // 如果有保存的播放进度，跳转到指定位置
      if (this.savedProgress && this.savedProgress > 0) {
        console.log('恢复播放进度到:', this.savedProgress)
        audioContext.seek(this.savedProgress)
        this.savedProgress = 0
      }
    }
    
    audioContext.onCanplay(onCanplayOnce)
    
    // 开始播放
    audioContext.play()
  },

  // 重试音频加载
  retryAudioLoading: function(audioContext, audioUrl) {
    console.log('重试加载音频:', audioUrl)
    
    wx.showModal({
      title: '加载失败',
      content: '音频加载超时，是否重试？',
      confirmText: '重试',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 重新创建音频上下文
          const newAudioContext = wx.createInnerAudioContext()
          this.setData({ audioContext: newAudioContext })
          this.rebindAudioEvents(newAudioContext)
          
          // 重新开始加载
          this.loadNewAudio(newAudioContext, audioUrl)
        }
      }
    })
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
    
    // 立即更新UI状态，即使在暂停状态下
    this.setData({
      audioPosition: newPosition,
      currentProgress: (newPosition / this.data.audioDuration) * 100,
      currentTimeFormatted: this.formatTime(newPosition)
    })
    
    console.log('后退15秒到:', newPosition)
  },

  // 处理前进30秒
  handleFastForward: function() {
    const { audioContext, audioPosition, audioDuration } = this.data
    
    if (!audioContext) return
    
    const newPosition = Math.min(audioDuration, audioPosition + 30)
    audioContext.seek(newPosition)
    
    // 立即更新UI状态，即使在暂停状态下
    this.setData({
      audioPosition: newPosition,
      currentProgress: (newPosition / audioDuration) * 100,
      currentTimeFormatted: this.formatTime(newPosition)
    })
    
    console.log('前进30秒到:', newPosition)
  },

  // 处理喜欢 - 优化响应速度
  handleLike: function() {
    const { currentIndex, podcastList } = this.data
    const currentPodcast = podcastList[currentIndex]
    const newIsLiked = !currentPodcast.isLiked
    
    // 立即更新UI状态（乐观更新）
    const updatedPodcastList = [...podcastList]
    updatedPodcastList[currentIndex] = {
      ...currentPodcast,
      isLiked: newIsLiked
    }
    
    this.setData({
      podcastList: updatedPodcastList
    })
    
    // 异步处理后台操作（无提示窗口）
    this.updateLikeStatusBackground(currentPodcast.id, newIsLiked)
  },
  
  // 后台异步更新喜欢状态
  async updateLikeStatusBackground(podcastId, isLiked) {
    try {
      setTimeout(async () => {
        // 这里可以添加实际的API调用
        console.log('喜欢状态更新:', { podcastId, isLiked })
      }, 0)
    } catch (error) {
      console.error('喜欢操作失败:', error)
    }
  },

  // 处理点赞 - 优化响应速度
  handleThumbsUp: function() {
    const { currentIndex, podcastList } = this.data
    const currentPodcast = podcastList[currentIndex]
    const newIsThumbsUp = !currentPodcast.isThumbsUp
    
    // 立即更新UI状态（乐观更新）
    const updatedPodcastList = [...podcastList]
    updatedPodcastList[currentIndex] = {
      ...currentPodcast,
      isThumbsUp: newIsThumbsUp
    }
    
    this.setData({
      podcastList: updatedPodcastList
    })
    
    // 异步处理后台操作，不阻塞用户交互
    this.updateLikeStatus(currentPodcast.id, newIsThumbsUp)
  },
  
  // 异步更新点赞状态
  async updateLikeStatus(podcastId, isLiked) {
    try {
      const audioService = require('../../services/audio.service.js')
      
      // 使用 setTimeout 确保不阻塞主线程
      setTimeout(async () => {
        try {
          // 这里可以添加实际的API调用
          // await audioService.toggleLike(userId, podcastId, isLiked)
          console.log('点赞状态更新:', { podcastId, isLiked })
        } catch (error) {
          console.error('点赞更新失败:', error)
          // 失败时回滚UI状态
          this.rollbackLikeState(podcastId)
        }
      }, 0)
    } catch (error) {
      console.error('点赞操作失败:', error)
    }
  },
  
  // 回滚点赞状态
  rollbackLikeState(podcastId) {
    const { podcastList } = this.data
    const index = podcastList.findIndex(p => p.id === podcastId)
    if (index !== -1) {
      const updatedPodcastList = [...podcastList]
      updatedPodcastList[index] = {
        ...updatedPodcastList[index],
        isThumbsUp: !updatedPodcastList[index].isThumbsUp
      }
      this.setData({ podcastList: updatedPodcastList })
    }
  },

  // 处理收藏 - 优化响应速度
  handleFavorite() {
    const { currentIndex, podcastList } = this.data
    const currentPodcast = podcastList[currentIndex]
    const newIsFavorited = !currentPodcast.isFavorited
    
    // 立即更新UI状态（乐观更新）
    const updatedPodcastList = [...podcastList]
    updatedPodcastList[currentIndex] = {
      ...currentPodcast,
      isFavorited: newIsFavorited
    }
    
    this.setData({
      podcastList: updatedPodcastList
    })
    
    // 异步处理后台操作，不阻塞用户交互（无提示窗口）
    this.updateFavoriteStatus(currentPodcast.id, newIsFavorited)
  },
  
  // 异步更新收藏状态
  async updateFavoriteStatus(podcastId, isFavorited) {
    try {
      setTimeout(async () => {
        try {
          const audioService = require('../../services/audio.service.js')
          
          if (isFavorited) {
            await audioService.addToFavorites('default-user-id', podcastId)
          } else {
            await audioService.removeFromFavorites('default-user-id', podcastId)
          }
          
          console.log('收藏状态更新成功:', { podcastId, isFavorited })
          
        } catch (error) {
          console.error('收藏操作失败:', error)
          // 失败时回滚UI状态（无提示窗口）
          this.rollbackFavoriteState(podcastId)
        }
      }, 0)
    } catch (error) {
      console.error('收藏状态更新异常:', error)
    }
  },
  
  // 回滚收藏状态
  rollbackFavoriteState(podcastId) {
    const { podcastList } = this.data
    const index = podcastList.findIndex(p => p.id === podcastId)
    if (index !== -1) {
      const updatedPodcastList = [...podcastList]
      updatedPodcastList[index] = {
        ...updatedPodcastList[index],
        isFavorited: !updatedPodcastList[index].isFavorited
      }
      this.setData({ podcastList: updatedPodcastList })
    }
  },

  // 处理认知提取
  handleInsight: function() {
    console.log('点击认知提取按钮')
    
    const { currentIndex, podcastList } = this.data
    const currentPodcast = podcastList[currentIndex]
    
    if (!currentPodcast) {
      wx.showToast({
        title: '播客数据无效',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    // 显示弹窗并开始加载数据
    this.setData({
      insightVisible: true,
      insightLoading: true,
      insightError: '',
      insightFullScreen: false
    })
    
    // 模拟加载数据（后续替换为真实API调用）
    this.loadInsightData(currentPodcast.id)
  },
  
  // 加载insight数据（真实API调用）
  async loadInsightData(podcastId) {
    try {
      console.log('加载Insight数据:', podcastId)
      
      // 调用insight服务获取真实数据
      const result = await insightService.getMainInsightByPodcastId(podcastId)
      
      if (result.success && result.data) {
        this.setData({
          insightLoading: false,
          currentInsightData: result.data,
          insightError: ''
        })
        
        console.log('Insight数据加载完成:', result.data)
      } else {
        throw new Error(result.error || '加载认知提取数据失败')
      }
    } catch (error) {
      console.error('加载Insight数据失败:', error)
      
      this.setData({
        insightLoading: false,
        insightError: error.message || '加载失败，请重试',
        currentInsightData: null
      })
    }
  },
  
  // 关闭认知提取弹窗
  handleInsightClose: function(e) {
    console.log('关闭认知提取弹窗被触发')
    
    // 检查是否是有效的关闭操作
    if (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.action === 'close') {
      console.log('确认为关闭按钮操作')
    } else if (e && e.target && e.target.dataset && e.target.dataset.action === 'close') {
      console.log('确认为关闭按钮操作 (通过target)')
    } else {
      console.log('关闭操作来源:', e.type || 'unknown')
    }
    
    // 强制停止任何正在进行的拖拽操作
    this.stopAllDragOperations()
    
    // 立即设置关闭状态，确保蒙版和容器同时消失
    this.setData({
      insightVisible: false,
      insightFullScreen: false,
      currentInsightData: null,
      insightLoading: false,
      insightError: '',
      // 重置所有手势相关状态
      insightTouchStartY: 0,
      insightTouchMoveY: 0,
      insightTouchStartTime: 0,
      contentTouchStartY: 0,
      contentTouchMoveY: 0,
      contentTouchStartTime: 0
    })
    
    console.log('弹窗已关闭')
  },
  
  // 停止所有拖拽操作
  stopAllDragOperations: function() {
    this.closeButtonTouching = false
    this.isDragging = false
    
    // 清除所有可能的定时器
    if (this.dragTimeout) {
      clearTimeout(this.dragTimeout)
      this.dragTimeout = null
    }
  },
  
  // 处理关闭按钮的触摸开始事件（阻止拖拽手势干扰）
  handleCloseButtonTouchStart: function(e) {
    console.log('关闭按钮触摸开始，阻止拖拽事件传播')
    e.stopPropagation() // 阻止事件冒泡到父级的拖拽处理
    // 立即标记这是关闭按钮操作，防止拖拽手势干扰
    this.closeButtonTouching = true
    
    // 200ms后清除标记（足够处理tap事件）
    setTimeout(() => {
      this.closeButtonTouching = false
    }, 200)
  },
  
  // 防止滚动穿透
  preventScroll: function(e) {
    return false
  },
  
  // 处理拖拽手势开始（拖拽指示条区域）
  handleDragStart: function(e) {
    // 检查触摸点是否在关闭按钮区域
    const touch = e.touches[0]
    const touchX = touch.clientX
    const touchY = touch.clientY
    
    // 获取关闭按钮的位置信息来判断是否点击在关闭按钮上
    // 如果点击在右上角区域，可能是关闭按钮，忽略拖拽
    const windowWidth = wx.getSystemInfoSync().windowWidth
    if (touchX > windowWidth - 100 && touchY < 150) {
      console.log('触摸点可能在关闭按钮区域，忽略拖拽手势')
      return
    }
    
    // 如果正在触摸关闭按钮，忽略拖拽手势
    if (this.closeButtonTouching) {
      console.log('忽略拖拽手势 - 正在操作关闭按钮')
      return
    }
    
    this.setData({
      insightTouchStartY: touch.clientY,
      insightTouchStartTime: Date.now()
    })
    console.log('拖拽手势开始:', touch.clientY)
  },
  
  // 处理拖拽手势移动（拖拽指示条区域）
  handleDragMove: function(e) {
    // 如果正在触摸关闭按钮，忽略拖拽手势
    if (this.closeButtonTouching) {
      return
    }
    
    const touch = e.touches[0]
    const { insightTouchStartY, insightFullScreen } = this.data
    const moveY = touch.clientY - insightTouchStartY
    
    this.setData({
      insightTouchMoveY: moveY
    })
    
    // 在非全屏状态下，如果上划超过50px，则进入全屏模式
    if (!insightFullScreen && moveY < -50) {
      this.setData({
        insightFullScreen: true
      })
      console.log('进入全屏模式')
    }
    // 在全屏状态下，如果下划超过80px，则退出全屏模式
    else if (insightFullScreen && moveY > 80) {
      this.setData({
        insightFullScreen: false
      })
      console.log('退出全屏模式')
    }
  },
  
  // 处理拖拽手势结束（拖拽指示条区域）
  handleDragEnd: function(e) {
    // 如果正在触摸关闭按钮，忽略拖拽手势
    if (this.closeButtonTouching) {
      return
    }
    
    const { insightTouchMoveY, insightTouchStartTime } = this.data
    const touchDuration = Date.now() - insightTouchStartTime
    
    console.log('拖拽手势结束:', {
      moveY: insightTouchMoveY,
      duration: touchDuration
    })
    
    // 重置手势数据
    this.setData({
      insightTouchStartY: 0,
      insightTouchMoveY: 0,
      insightTouchStartTime: 0
    })
  },
  
  // 处理内容区域手势开始（用于关闭手势）
  handleContentTouchStart: function(e) {
    const touch = e.touches[0]
    this.setData({
      contentTouchStartY: touch.clientY,
      contentTouchStartTime: Date.now()
    })
  },
  
  // 处理内容区域手势移动
  handleContentTouchMove: function(e) {
    const touch = e.touches[0]
    const contentMoveY = touch.clientY - (this.data.contentTouchStartY || 0)
    
    this.setData({
      contentTouchMoveY: contentMoveY
    })
  },
  
  // 处理内容区域手势结束（只在非全屏模式下允许关闭）
  handleContentTouchEnd: function(e) {
    const { contentTouchMoveY, contentTouchStartTime, insightFullScreen } = this.data
    const touchDuration = Date.now() - (contentTouchStartTime || 0)
    
    console.log('内容手势结束:', {
      moveY: contentTouchMoveY,
      duration: touchDuration,
      fullScreen: insightFullScreen
    })
    
    // 只在非全屏模式下，且下划超过120px且手势时间较短时才关闭
    if (!insightFullScreen && (contentTouchMoveY || 0) > 120 && touchDuration < 800) {
      console.log('通过内容区域下划关闭弹窗')
      this.handleInsightClose()
    }
    
    // 重置手势数据
    this.setData({
      contentTouchStartY: 0,
      contentTouchMoveY: 0,
      contentTouchStartTime: 0
    })
  },
  
  // 处理insight点赞
  async handleInsightLike() {
    const { currentInsightData } = this.data
    if (!currentInsightData || currentInsightData.id === 'default') {
      wx.showToast({
        title: '无法点赞默认内容',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    try {
      // 乐观更新UI - 切换点赞状态和图标
      const newIsLiked = !(currentInsightData.isLiked || false)
      const newLikeCount = newIsLiked ? 
        (currentInsightData.like_count || 0) + 1 : 
        Math.max(0, (currentInsightData.like_count || 0) - 1)
      
      this.setData({
        'currentInsightData.isLiked': newIsLiked,
        'currentInsightData.like_count': newLikeCount
      })
      
      // 调用API更新点赞数
      const result = await insightService.incrementLikeCount(currentInsightData.id)
      
      if (result.success) {
        // 使用API返回的实际点赞数更新UI
        this.setData({
          'currentInsightData.like_count': result.data.like_count
        })
        
        wx.showToast({
          title: newIsLiked ? '点赞成功' : '取消点赞',
          icon: 'success',
          duration: 1500
        })
        
        console.log('Insight点赞成功:', result.data.like_count)
      } else {
        // API调用失败，回滚UI状态
        this.setData({
          'currentInsightData.isLiked': currentInsightData.isLiked || false,
          'currentInsightData.like_count': currentInsightData.like_count
        })
        
        wx.showToast({
          title: result.error || '点赞失败',
          icon: 'none',
          duration: 1500
        })
      }
    } catch (error) {
      // 异常情况，回滚UI状态
      this.setData({
        'currentInsightData.isLiked': currentInsightData.isLiked || false,
        'currentInsightData.like_count': currentInsightData.like_count
      })
      
      console.error('点赞操作失败:', error)
      wx.showToast({
        title: '点赞失败，请重试',
        icon: 'none',
        duration: 1500
      })
    }
  },
  
  // 处理insight收藏
  handleInsightBookmark: function() {
    wx.showToast({
      title: '收藏成功',
      icon: 'success',
      duration: 1500
    })
    
    console.log('Insight收藏')
  },
  
  // 处理insight分享
  handleInsightShare: function() {
    const { currentInsightData } = this.data
    if (!currentInsightData) return
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    console.log('Insight分享:', currentInsightData.title)
  },
  
  // 处理insight重试
  handleInsightRetry: function() {
    console.log('重试加载Insight')
    
    const { currentIndex, podcastList } = this.data
    const currentPodcast = podcastList[currentIndex]
    
    if (!currentPodcast) return
    
    this.setData({
      insightLoading: true,
      insightError: ''
    })
    
    this.loadInsightData(currentPodcast.id)
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
        // 更新UI显示的播放进度，但不立即seek音频
        this.setData({
          audioPosition: progress.position,
          currentProgress: (progress.position / (this.data.audioDuration || 1)) * 100,
          currentTimeFormatted: this.formatTime(progress.position)
        })
        
        // 保存进度信息，供播放时使用
        this.savedProgress = progress.position
        
        // 在自动播放场景下，跳过询问直接使用保存的进度
        if (!this.data.autoPlayOnSwipe) {
          wx.showModal({
            title: '继续播放',
            content: `检测到上次播放进度，是否从 ${Math.floor(progress.position / 60)}:${Math.floor(progress.position % 60).toString().padStart(2, '0')} 继续播放？`,
            success: (res) => {
              if (!res.confirm) {
                // 用户选择从头开始播放，重置进度
                this.setData({
                  audioPosition: 0,
                  currentProgress: 0,
                  currentTimeFormatted: '0:00'
                })
                this.savedProgress = 0
              }
            }
          })
        }
      } else {
        // 没有保存的进度，重置状态
        this.setData({
          audioPosition: 0,
          currentProgress: 0,
          currentTimeFormatted: '0:00'
        })
        this.savedProgress = 0
      }
    } catch (error) {
      console.error('加载播放进度失败:', error)
      this.savedProgress = 0
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

  // 处理进度条拖拽开始
  handleThumbTouchStart: function(e) {
    console.log('进度条拖拽开始')
    this.setData({ isDraggingThumb: true })
    
    // 立即同步获取进度条位置信息
    this.updateProgressBarRect()
  },

  // 处理进度条拖拽移动 - 高性能版本
  handleThumbMove: function(e) {
    if (!this.data.isDraggingThumb) return
    
    const { audioContext, audioDuration } = this.data
    if (!audioContext || !audioDuration) return
    
    // 节流优化：限制更新频率到60fps
    const now = Date.now()
    if (now - this.lastThrottleTime < this.throttleInterval) {
      return
    }
    this.lastThrottleTime = now
    
    // 使用缓存的位置信息或实时计算
    const rect = this.progressBarRect || this.getProgressBarRectSync()
    if (!rect) return
    
    const touchX = e.touches[0].clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (touchX / rect.width) * 100))
    const seekTime = (percentage / 100) * audioDuration
    
    // 使用更高效的局部更新
    this.updateProgressUI(percentage, seekTime)
  },

  // 处理进度条拖拽结束
  handleThumbEnd: function(e) {
    console.log('进度条拖拽结束')
    this.setData({ isDraggingThumb: false })
    
    // 清理缓存的位置信息
    this.progressBarRect = null
    
    const { audioContext, audioPosition } = this.data
    if (audioContext) {
      audioContext.seek(audioPosition)
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
  },

  // 触发预加载机制
  triggerPreloading() {
    const { podcastList, currentIndex } = this.data
    
    if (podcastList.length > 0) {
      console.log('🚀 触发音频预加载机制')
      audioPreloader.initialize(podcastList, currentIndex)
      
      // 获取预加载统计信息
      const stats = audioPreloader.getStats()
      console.log('预加载统计:', stats)
    }
  },

  // 清理预加载资源
  cleanupPreloadedAudio() {
    console.log('🧹 清理预加载音频资源')
    audioPreloader.cleanExpiredCache()
    audioPreloader.cleanDistantPreloads(this.data.currentIndex)
  },

  // 获取音频缓冲进度
  getBufferProgress(audioContext) {
    if (!audioContext || !audioContext.duration) return 0
    
    try {
      const currentTime = audioContext.currentTime || 0
      const duration = audioContext.duration || 0
      const audioUrl = audioContext.src || ''
      
      if (duration === 0) return 0
      
      // 使用预加载服务获取真实的缓冲进度，传入audioContext以获取buffered属性
      return audioPreloader.getBufferProgress(audioUrl, currentTime, duration, audioContext)
      
    } catch (error) {
      console.error('获取缓冲进度失败:', error)
      return 0
    }
  },

  // 更新进度条位置信息 - 异步版本
  updateProgressBarRect() {
    const query = this.createSelectorQuery()
    query.select('.progress-bar').boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        this.progressBarRect = res[0]
      }
    })
  },

  // 同步获取进度条位置信息 - 应急方案
  getProgressBarRectSync() {
    // 如果没有缓存的位置信息，使用估算值
    if (!this.progressBarRect) {
      // 基于屏幕宽度和padding的估算
      const screenWidth = wx.getSystemInfoSync().screenWidth
      const paddingHorizontal = 32 // 16px * 2
      return {
        left: paddingHorizontal,
        width: screenWidth - paddingHorizontal,
        top: 0,
        height: 6
      }
    }
    return this.progressBarRect
  },

  // 高效的进度UI更新方法
  updateProgressUI(percentage, seekTime) {
    // 批量更新相关状态，减少setData调用次数
    const updateData = {
      currentProgress: percentage,
      audioPosition: seekTime,
      currentTimeFormatted: this.formatTime(seekTime)
    }
    
    // 使用更高效的局部更新
    this.setData(updateData)
  },

  // 自定义loading控制方法
  showCustomLoading(text = '加载播客...') {
    this.setData({
      audioLoadingVisible: true,
      audioLoadingText: text
    })
  },

  hideCustomLoading() {
    this.setData({
      audioLoadingVisible: false
    })
  },

  // 触发自动播放（滑动后自动播放）
  triggerAutoPlay: function() {
    const { audioContext, podcastList, currentIndex } = this.data
    
    if (!audioContext || !podcastList.length || currentIndex < 0) {
      console.log('自动播放条件不满足:', { audioContext: !!audioContext, podcastList: podcastList.length, currentIndex })
      return
    }
    
    const currentPodcast = podcastList[currentIndex]
    if (!currentPodcast || !currentPodcast.audio_url) {
      console.log('当前播客数据无效，无法自动播放')
      return
    }
    
    console.log('🎵 开始自动播放:', currentPodcast.title)
    
    // 显示加载状态
    this.showCustomLoading('自动播放中...')
    
    // 检查是否需要切换音频源
    const currentSrc = audioContext.src || ''
    const newSrc = currentPodcast.audio_url
    const isNewAudio = currentSrc !== newSrc
    
    if (isNewAudio) {
      console.log('设置新音频源进行自动播放')
      
      // 检查是否有预加载的音频
      const audioPreloader = require('../../services/audio-preloader.service.js')
      const preloadedAudio = audioPreloader.getPreloadedAudio(newSrc)
      
      if (preloadedAudio) {
        console.log('🚀 使用预加载音频进行自动播放')
        this.hideCustomLoading()
        
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
        console.log('📱 标准音频加载流程进行自动播放')
        
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
        
        // 添加音频加载超时处理
        const loadingTimeout = setTimeout(() => {
          this.hideCustomLoading()
          this.setData({ isPlaying: false })
          console.log('自动播放音频加载超时')
          // 自动播放失败时，给用户友好提示
          wx.showToast({
            title: '播放超时，请手动重试',
            icon: 'none',
            duration: 2000
          })
        }, 8000) // 8秒超时
        
        // 监听首次canplay事件来隐藏loading
        const onCanplayOnce = () => {
          clearTimeout(loadingTimeout)
          this.hideCustomLoading()
          audioContext.offCanplay(onCanplayOnce)
        }
        audioContext.onCanplay(onCanplayOnce)
        
        // 开始播放
        audioContext.play()
      }
    } else {
      // 继续播放当前音频
      this.hideCustomLoading()
      audioContext.play()
    }
    
    // 添加到历史记录
    this.recordPlayStart(currentPodcast)
    
    // 触发音频预加载机制
    this.triggerPreloading()
    
    console.log('自动播放命令已发送，等待状态回调')
  },

  // 检查是否首次使用自动播放功能
  checkAutoPlayFirstTime: function() {
    try {
      const hasSeenAutoPlayTip = wx.getStorageSync('hasSeenAutoPlayTip')
      if (!hasSeenAutoPlayTip) {
        // 首次访问，显示自动播放功能说明
        setTimeout(() => {
          wx.showModal({
            title: '✨ 新功能提示',
            content: '现在支持下滑自动播放！滑动到下一个播客时会自动开始播放。您可以在设置中关闭此功能。',
            confirmText: '我知道了',
            cancelText: '关闭自动播放',
            success: (res) => {
              if (!res.confirm) {
                // 用户选择关闭自动播放
                this.setData({ autoPlayOnSwipe: false })
                wx.setStorageSync('autoPlayOnSwipe', false)
              }
              // 标记用户已看过提示
              wx.setStorageSync('hasSeenAutoPlayTip', true)
            }
          })
        }, 1000) // 页面加载1秒后显示
      } else {
        // 不是首次访问，从存储中读取用户设置
        const autoPlaySetting = wx.getStorageSync('autoPlayOnSwipe')
        if (autoPlaySetting !== '') {
          this.setData({ autoPlayOnSwipe: autoPlaySetting })
        }
      }
    } catch (error) {
      console.error('检查自动播放首次使用失败:', error)
    }
  }
})