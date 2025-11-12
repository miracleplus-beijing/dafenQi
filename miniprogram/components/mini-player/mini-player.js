Component({
  /**
   * 组件的属性列表
   */
  properties: {
    currentPodcast: {
      type: Object,
      value: null,
    },
    isPlaying: {
      type: Boolean,
      value: false,
    },
    currentProgress: {
      type: Number,
      value: 0,
    },
    isVisible: {
      type: Boolean,
      value: false,
    },
    safeAreaBottom: {
      type: Number,
      value: 0,
    },
  },

  /**
   * 组件的初始数据
   */
  data: {},

  /**
   * 组件的方法列表
   */
  methods: {
    // 播放/暂停
    handlePlayPause: function () {
      console.log('迷你播放器：播放/暂停');
      this.triggerEvent('playpause', {
        isPlaying: this.properties.isPlaying,
      });
    },

    // 展开到全屏
    handleExpand: function () {
      console.log('迷你播放器：展开到全屏');
      this.triggerEvent('expand');
    },

    // 关闭播放器
    handleClose: function () {
      console.log('迷你播放器：关闭');
      this.triggerEvent('close');
    },
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function () {
      console.log('迷你播放器组件已加载');
    },

    detached: function () {
      console.log('迷你播放器组件已卸载');
    },
  },
});
