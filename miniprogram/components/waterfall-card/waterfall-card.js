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
  data: {},

  /**
   * 组件的计算属性
   */
  computed: {
    // 格式化时长
    formattedDuration() {
      const duration = this.properties.podcast.duration || 0;
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
    formattedPlayCount() {
      const count = this.properties.podcast.play_count || 0;
      if (count >= 10000) {
        return `${(count / 10000).toFixed(1)}万`;
      } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
      }
      return count.toString();
    },

    // 格式化点赞数
    formattedLikeCount() {
      const count = this.properties.podcast.like_count || 0;
      if (count >= 10000) {
        return `${(count / 10000).toFixed(1)}万`;
      } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
      }
      return count.toString();
    },

    // 格式化时间
    formattedTime() {
      const createdAt = this.properties.podcast.created_at;
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
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 卡片点击
    handleCardTap: function (e) {
      if (this.properties.batchMode) {
        // 批量模式下切换选择状态
        this.triggerEvent('select', {
          podcast: this.properties.podcast,
          selected: !this.properties.isSelected,
        });
      } else {
        // 普通模式下触发预览
        this.triggerEvent('preview', {
          podcast: this.properties.podcast,
        });
      }
    },

    // 长按卡片
    handleCardLongPress: function () {
      if (!this.properties.batchMode) {
        // 非批量模式下长按进入批量模式
        this.triggerEvent('longpress', {
          podcast: this.properties.podcast,
        });
      }
    },

    // 播放按钮点击
    handlePlayTap: function (e) {
      // 阻止事件冒泡
      e.stopPropagation();

      this.triggerEvent('play', {
        podcast: this.properties.podcast,
      });
    },

    // 收藏按钮点击
    handleFavoriteTap: function (e) {
      // 阻止事件冒泡
      e.stopPropagation();

      this.triggerEvent('favorite', {
        podcast: this.properties.podcast,
        favorited: !this.properties.podcast.isFavorited,
      });
    },

    // 更多操作点击
    handleMoreTap: function (e) {
      // 阻止事件冒泡
      e.stopPropagation();

      this.triggerEvent('more', {
        podcast: this.properties.podcast,
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
      // 更新计算属性
      this.setData({
        formattedDuration: this.computed.formattedDuration(),
        formattedPlayCount: this.computed.formattedPlayCount(),
        formattedLikeCount: this.computed.formattedLikeCount(),
        formattedTime: this.computed.formattedTime(),
      });
    },
  },

  /**
   * 组件属性观察器
   */
  observers: {
    'podcast.**': function () {
      // 当podcast数据变化时，重新计算显示数据
      this.setData({
        formattedDuration: this.computed.formattedDuration(),
        formattedPlayCount: this.computed.formattedPlayCount(),
        formattedLikeCount: this.computed.formattedLikeCount(),
        formattedTime: this.computed.formattedTime(),
      });
    },
  },
});