/**
 * 精选推荐卡片组件
 * 用于显示编辑精选的播客内容，支持封面图片、播放控制等
 */
Component({
  properties: {
    // 精选内容数据
    item: {
      type: Object,
      value: {}
    },

    // 是否显示播放按钮
    showPlayButton: {
      type: Boolean,
      value: true
    },

    // 是否处于播放状态
    isPlaying: {
      type: Boolean,
      value: false
    },

    // 加载状态
    loading: {
      type: Boolean,
      value: false
    }
  },

  data: {
    imageLoaded: false,
    imageError: false,
    showPlayOverlay: false
  },

  methods: {
    // 图片加载成功
    onImageLoad() {
      this.setData({
        imageLoaded: true,
        imageError: false
      })
    },

    // 图片加载失败
    onImageError() {
      this.setData({
        imageLoaded: false,
        imageError: true
      })
    },

    // 处理卡片点击
    onCardTap() {
      if (this.data.loading) return

      this.triggerEvent('tap', {
        item: this.data.item
      })
    },

    // 处理播放按钮点击
    onPlayTap(e) {
      e.stopPropagation() // 阻止冒泡到卡片点击

      this.triggerEvent('play', {
        item: this.data.item
      })
    },

    // 显示播放覆盖层
    showPlayOverlay() {
      if (!this.data.showPlayButton) return
      this.setData({ showPlayOverlay: true })
    },

    // 隐藏播放覆盖层
    hidePlayOverlay() {
      this.setData({ showPlayOverlay: false })
    },

    // 格式化时长显示
    formatDuration(duration) {
      if (!duration || duration < 0) return '未知'

      const minutes = Math.floor(duration / 60)
      return `${minutes}分钟`
    }
  },

  observers: {
    'item.podcast.duration'(duration) {
      this.setData({
        formattedDuration: this.formatDuration(duration)
      })
    }
  },

  lifetimes: {
    attached() {
      // 初始化格式化时长
      const duration = this.data.item?.podcast?.duration
      this.setData({
        formattedDuration: this.formatDuration(duration)
      })
    }
  }
})