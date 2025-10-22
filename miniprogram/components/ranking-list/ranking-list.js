/**
 * 排行榜列表组件
 * 可复用的排行榜显示组件，支持不同榜单类型和样式
 */
Component({
  properties: {
    // 排行榜类型
    type: {
      type: String,
      value: 'hot'
    },

    // 排行榜标题
    title: {
      type: String,
      value: '排行榜'
    },

    // 排行榜图标
    iconName: {
      type: String,
      value: 'fire'
    },

    // 排行榜数据
    items: {
      type: Array,
      value: []
    },

    // 最大显示数量
    maxItems: {
      type: Number,
      value: 3
    },

    // 是否显示查看更多按钮
    showMoreButton: {
      type: Boolean,
      value: true
    },

    // 加载状态
    loading: {
      type: Boolean,
      value: false
    }
  },

  data: {
    iconColorClass: '',
    typeClass: ''
  },

  methods: {
    // 处理排行榜项目点击
    onItemTap(e) {
      const { item, index } = e.currentTarget.dataset
      this.triggerEvent('itemtap', {
        item: item,
        index: index,
        type: this.data.type
      })
    },

    // 处理查看更多点击
    onMoreTap() {
      this.triggerEvent('moretap', {
        type: this.data.type
      })
    },

    // 获取排名显示文本
    getRankText(index) {
      return index + 1
    },

    // 获取排名样式类
    getRankClass(index) {
      if (index === 0) return 'ranking-item__rank--first'
      if (index === 1) return 'ranking-item__rank--second'
      if (index === 2) return 'ranking-item__rank--third'
      return ''
    }
  },

  observers: {
    'type'(newType) {
      // 根据排行榜类型设置样式
      let iconColorClass = ''
      let typeClass = ''

      switch (newType) {
        case 'hot':
          iconColorClass = 'icon-hot'
          typeClass = 'ranking-list--hot'
          break
        case 'new':
          iconColorClass = 'icon-new'
          typeClass = 'ranking-list--new'
          break
        case 'review':
          iconColorClass = 'icon-review'
          typeClass = 'ranking-list--review'
          break
        default:
          iconColorClass = 'icon-default'
          typeClass = 'ranking-list--default'
      }

      this.setData({
        iconColorClass,
        typeClass
      })
    }
  },

  lifetimes: {
    attached() {
      // 初始化样式类
      this.triggerEvent('type', this.data.type)
    }
  }
})