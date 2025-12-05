// 快速预览组件
const { authService } = require('../../services/auth.service.js');

Component({
  properties: {
    // 是否显示
    visible: {
      type: Boolean,
      value: false,
    },
    // 播客数据
    podcast: {
      type: Object,
      value: {},
    },
  },

  data: {
    // 播放状态
    isPlaying: false,
    currentProgress: 0,
    currentTime: 0,

    // 动画
    contentAnimation: null,

    // 音频上下文
    audioContext: null,

    // 试听计时器
    trialTimer: null,

    // 格式化数据
    formattedPlayCount: '',
    formattedLikeCount: '',
    formattedDuration: '',
    currentTimeFormatted: '0:00',
    remainingTimeFormatted: '0:30',
  },

  observers: {
    visible(visible) {
      if (visible) {
        this.onShow();
      } else {
        this.onHide();
      }
    },

    podcast(podcast) {
      if (podcast && podcast.id) {
        this.updateFormattedData();
      }
    },

    currentTime(currentTime) {
      this.updateTimeDisplay();
    },
  },

  methods: {
    // 更新格式化数据
    updateFormattedData() {
      const podcast = this.data.podcast;

      // 格式化播放次数
      const playCount = podcast.play_count || 0;
      let formattedPlayCount = '';
      if (playCount >= 10000) {
        formattedPlayCount = Math.floor(playCount / 10000) + '万';
      } else if (playCount >= 1000) {
        formattedPlayCount = Math.floor(playCount / 1000) + 'k';
      } else {
        formattedPlayCount = playCount.toString();
      }

      // 格式化点赞数
      const likeCount = podcast.like_count || 0;
      let formattedLikeCount = '';
      if (likeCount >= 10000) {
        formattedLikeCount = Math.floor(likeCount / 10000) + '万';
      } else if (likeCount >= 1000) {
        formattedLikeCount = Math.floor(likeCount / 1000) + 'k';
      } else {
        formattedLikeCount = likeCount.toString();
      }

      // 格式化时长
      const duration = podcast.duration || 0;
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      this.setData({
        formattedPlayCount,
        formattedLikeCount,
        formattedDuration,
      });
    },

    // 更新时间显示
    updateTimeDisplay() {
      const currentTime = this.data.currentTime;
      const trialDuration = this.data.trialDuration;

      // 当前时间
      const currentMinutes = Math.floor(currentTime / 60);
      const currentSeconds = Math.floor(currentTime % 60);
      const currentTimeFormatted = `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')}`;

      // 剩余时间
      const remaining = trialDuration - currentTime;
      const remainingMinutes = Math.floor(remaining / 60);
      const remainingSeconds = Math.floor(remaining % 60);
      const remainingTimeFormatted = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;

      this.setData({
        currentTimeFormatted,
        remainingTimeFormatted,
      });
    },
    // 组件显示
    onShow() {
      console.log('快速预览显示:', this.data.podcast.title);
      this.resetTrialState();
    },

    // 组件隐藏
    onHide() {
      console.log('快速预览隐藏');
      this.stopTrial();
    },

    // 重置试听状态
    resetTrialState() {
      this.setData({
        isPlaying: false,
        currentProgress: 0,
        currentTime: 0,
      });

      this.stopTrial();
    },

 

  


    // 停止试听
    stopTrial() {
      if (this.data.trialTimer) {
        clearInterval(this.data.trialTimer);
        this.data.trialTimer = null;
      }

      this.setData({ isPlaying: false });

      this.triggerEvent('trialstop', {
        podcast: this.data.podcast,
      });
    },

    // 处理收藏
    handleFavorite() {
      // 检查登录状态
      const loginStatus = authService.checkLoginStatus();

      if (!loginStatus) {
        // 未登录，提示用户登录
        wx.showModal({
          title: '需要登录',
          content: '收藏功能需要登录后使用，是否前往登录？',
          confirmText: '去登录',
          cancelText: '取消',
          success: res => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/login/login',
              });
            }
          },
        });
        return;
      }

      const { podcast } = this.data;
      const newIsFavorited = !podcast.isFavorited;

      // 更新本地状态（乐观更新）
      this.setData({
        'podcast.isFavorited': newIsFavorited,
      });

      // 触发收藏事件
      this.triggerEvent('favorite', {
        podcast: podcast,
        favorited: newIsFavorited,
      });

      wx.showToast({
        title: newIsFavorited ? '已添加到收藏' : '已取消收藏',
        icon: 'success',
        duration: 1000,
      });
    },

    // 处理分享
    handleShare() {
      console.log('分享播客:', this.data.podcast.title);

      this.triggerEvent('share', {
        podcast: this.data.podcast,
      });

      wx.showToast({
        title: '分享功能开发中',
        icon: 'none',
        duration: 1500,
      });
    },

    // 处理添加到播放列表
    handleAddToPlaylist() {
      console.log('添加到播放列表:', this.data.podcast.title);

      this.triggerEvent('addtoplaylist', {
        podcast: this.data.podcast,
      });

      wx.showToast({
        title: '已添加到播放列表',
        icon: 'success',
        duration: 1000,
      });
    },

    // 处理完整播放
    handlePlayFull() {
      console.log('开始完整播放:', this.data.podcast.title);


      // 触发完整播放事件
      this.triggerEvent('playfull', {
        podcast: this.data.podcast,
      });

      // 关闭预览
      this.handleClose();
    },

    // 处理关闭
    handleClose() {
      console.log('关闭快速预览');

      // 停止试听
      this.stopTrial();

      // 触发关闭事件
      this.triggerEvent('close');
    },

    // 防止滚动穿透
    preventScroll() {
      return false;
    },
  },

  lifetimes: {
    attached() {
      console.log('快速预览组件初始化');
    },

    detached() {
      console.log('快速预览组件销毁');
      this.stopTrial();
    },
  },
});
