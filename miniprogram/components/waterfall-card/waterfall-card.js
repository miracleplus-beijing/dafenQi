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
    getFormattedDuration: function() {
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
    getFormattedPlayCount: function() {
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
    getFormattedLikeCount: function() {
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
    getFormattedTime: function() {
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

    // 卡片点击
    handleCardTap: function (e) {
      // 安全检查 podcast 对象
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') {
        console.warn('waterfall-card: podcast 对象不存在，无法执行点击操作');
        return;
      }

      if (this.properties.batchMode) {
        // 批量模式下切换选择状态
        this.triggerEvent('select', {
          podcast: podcast,
          selected: !this.properties.isSelected,
        });
      } else {
        // 普通模式下触发预览
        this.triggerEvent('preview', {
          podcast: podcast,
        });
      }
    },

    // 长按卡片
    handleCardLongPress: function () {
      // 安全检查 podcast 对象
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') {
        console.warn('waterfall-card: podcast 对象不存在，无法执行长按操作');
        return;
      }

      if (!this.properties.batchMode) {
        // 非批量模式下长按进入批量模式
        this.triggerEvent('longpress', {
          podcast: podcast,
        });
      }
    },

    // 播放按钮点击
    handlePlayTap: function (e) {
      // 阻止事件冒泡
      e.stopPropagation();

      // 安全检查 podcast 对象
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') {
        console.warn('waterfall-card: podcast 对象不存在，无法执行播放操作');
        return;
      }

      this.triggerEvent('play', {
        podcast: podcast,
      });
    },

    // 收藏按钮点击
    handleFavoriteTap: function (e) {
      // 阻止事件冒泡
      e.stopPropagation();

      // 安全检查 podcast 对象
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') {
        console.warn('waterfall-card: podcast 对象不存在，无法执行收藏操作');
        return;
      }

      this.triggerEvent('favorite', {
        podcast: podcast,
        favorited: !podcast.isFavorited,
      });
    },

    // 更多操作点击
    handleMoreTap: function (e) {
      // 阻止事件冒泡
      e.stopPropagation();

      // 安全检查 podcast 对象
      const podcast = this.properties.podcast;
      if (!podcast || typeof podcast !== 'object') {
        console.warn('waterfall-card: podcast 对象不存在，无法执行更多操作');
        return;
      }

      this.triggerEvent('more', {
        podcast: podcast,
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