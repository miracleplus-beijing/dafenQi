/**
 * 学术分类卡片组件
 * 可复用的分类显示组件，支持图标、渐变色、点击事件
 */
Component({
  properties: {
    // 分类数据
    category: {
      type: Object,
      value: {},
      observer: function (newVal) {
        this.updateCategoryStyle();
      },
    },

    // 卡片索引（用于渐变色选择）
    index: {
      type: Number,
      value: 0,
    },

    // 是否显示加载状态
    loading: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    cardStyle: '',
    gradientClass: '',
  },

  methods: {
    // 更新卡片样式
    updateCategoryStyle() {
      const { category, index } = this.data;
      if (!category || !category.color) return;

      // 动态生成渐变样式
      const gradient = `linear-gradient(135deg, ${category.color[0]} 0%, ${category.color[1]} 100%)`;
      this.setData({
        cardStyle: `background: ${gradient}`,
        gradientClass: `gradient-${(index % 7) + 1}`,
      });
    },

    // 处理卡片点击
    onCategoryTap() {
      const { category } = this.data;
      if (this.data.loading) return;

      this.triggerEvent('select', {
        category: category,
      });
    },

    // 处理卡片长按
    onCategoryLongPress() {
      const { category } = this.data;
      this.triggerEvent('longpress', {
        category: category,
      });
    },
  },

  lifetimes: {
    attached() {
      this.updateCategoryStyle();
    },
  },
});
