Component({
  /**
   * 组件的属性列表
   */
  properties: {
    podcast: {
      type: Object,
      value: {},
    },
    isSelected: {
      type: Boolean,
      value: false,
    },
    batchMode: {
      type: Boolean,
      value: false,
    },
    isPlaying: {
      type: Boolean,
      value: false,
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 格式化后的显示数据
    formattedDuration: '0秒',
    formattedPlayCount: '0',
    formattedLikeCount: '0',
    formattedTime: '',
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 格式化时长
    getFormattedDuration: function () {
      // 安全检查，确保 podcast 对象存在
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') {
        return '0秒';
      }

      const duration = podcast.duration || 0;
      if (duration < 60) {
        return `${Math.floor(duration)}秒`;
      } else if (duration < 3600) {
        const minutes = Math.floor(duration / 60);
        return `${minutes}分钟`;
      } else {
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        return `${hours}小时${minutes}分钟`;
      }
    },

    // 格式化播放量
    getFormattedPlayCount: function () {
      // 安全检查，确保 podcast 对象存在
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') {
        return '0';
      }

      const count = podcast.play_count || 0;
      if (count >= 10000) {
        return `${(count / 10000).toFixed(1)}万`;
      } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
      }
      return count.toString();
    },

    // 格式化点赞数
    getFormattedLikeCount: function () {
      // 安全检查，确保 podcast 对象存在
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') {
        return '0';
      }

      const count = podcast.like_count || 0;
      if (count >= 10000) {
        return `${(count / 10000).toFixed(1)}万`;
      } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
      }
      return count.toString();
    },

    // 格式化时间
    getFormattedTime: function () {
      // 安全检查，确保 podcast 对象存在
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') {
        return '';
      }

      const createdAt = podcast.created_at;
      if (!createdAt) return '';

      const now = new Date();
      const created = new Date(createdAt);
      const diffMs = now - created;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return '今天';
      } else if (diffDays === 1) {
        return '昨天';
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks}周前`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months}月前`;
      } else {
        const years = Math.floor(diffDays / 365);
        return `${years}年前`;
      }
    },

    // 安全更新计算数据的方法
    updateComputedData: function () {
      try {
        this.setData({
          formattedDuration: this.getFormattedDuration(),
          formattedPlayCount: this.getFormattedPlayCount(),
          formattedLikeCount: this.getFormattedLikeCount(),
          formattedTime: this.getFormattedTime(),
        });
      } catch (error) {
        console.error('waterfall-card 计算属性更新失败:', error);
        // 设置默认值
        this.setData({
          formattedDuration: '0秒',
          formattedPlayCount: '0',
          formattedLikeCount: '0',
          formattedTime: '',
        });
      }
    },

   

    // 长按卡片（不再进入批量模式）
    handleCardLongPress: function () {
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') return;
      wx.showToast({ title: '长按暂无更多操作', icon: 'none', duration: 1200 });
    },

    // 播放按钮点击（内部处理）
    handlePlayTap: function (e) {
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') {
        console.warn('waterfall-card: podcast 对象不存在，无法执行播放操作');
        return;
      }
      this.internalPlay(podcast);
    },

    // 内部播放实现：向上冒泡，让父级处理实际播放（局部控制）
    internalPlay: function (podcast) {
      try {
        this.triggerEvent('play', { podcast });

      } catch (err) {
        console.error('internalPlay 事件触发失败:', err);
      }
    },

    // 收藏按钮点击（内部处理）
    handleFavoriteTap: function (e) {
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') {
        console.warn('waterfall-card: podcast 对象不存在，无法执行收藏操作');
        return;
      }

      const next = !podcast.isFavorited;
      // 本地切换收藏态；不依赖父页面
      try {
        this.setData({ 'podcast.isFavorited': next });
      } catch (err) {
        console.warn('更新收藏状态失败（本地）:', err);
      }

      try {
        const apiService = require('../../services/api.service.js');
        const auth = require('../../services/auth.service.js');
        const user = auth.getCurrentUser && auth.getCurrentUser();

        if (next) {
          apiService.user.addFavorite(user.id, podcast.id);
        } else {
          apiService.user.removeFavorite(user.id, podcast.id);
        }
      } catch (err) {
        console.warn('同步收藏状态异常:', err);
      }

      wx.showToast({
        title: next ? '已收藏' : '已取消收藏',
        icon: 'none',
        duration: 1000,
      });
    },

    // 更多操作点击（内部处理）
    handleMoreTap: function (e) {
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') return;

      const favorText = podcast.isFavorited ? '取消收藏' : '收藏';
      wx.showActionSheet({
        itemList: [favorText, '分享', '详细'],
        success: res => {
          if (res.tapIndex === 0) {
            // 收藏/取消收藏
            this.handleFavoriteTap({ stopPropagation: () => {} });
          } else if (res.tapIndex === 1) {
            // 分享
            wx.showShareMenu({
              withShareTicket: true,
              menus: ['shareAppMessage', 'shareTimeline'],
            });
          } else if (res.tapIndex === 2) {
            // 详细（预览）
            try {
              this.triggerEvent('preview', { podcast });
            } catch (err) {
              console.warn('触发预览事件失败:', err);
            }
          }
        },
      });
    },

    // 图片加载成功
    handleImageLoad: function () {
      console.log('封面图片加载成功');
    },

    // 图片加载失败
    handleImageError: function () {
      console.log('封面图片加载失败');
      // 这里可以设置默认图片
    },
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function () {
      // 安全地更新计算属性
      this.updateComputedData();
    },
  },

  /**
   * 组件属性观察器
   */
  observers: {
    'podcast.**': function (newPodcast) {
      // 当podcast数据变化时，重新计算显示数据
      if (newPodcast && typeof newPodcast === 'object') {
        this.updateComputedData();
      }
    },
  },
});
