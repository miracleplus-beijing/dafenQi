Component({
  /**
   * 组件的属性列表
   */
  properties: {
    searchValue: {
      type: String,
      value: '',
    },
    filterOptions: {
      type: Object,
      value: {
        category: '',
        timeRange: '',
        sortType: 'latest',
      },
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    currentActiveTab: '', // 当前展开的tab: 'category', 'time', 'sort', 'batch'

    categoryOptions: [
      { label: '全部', value: '' },
      { label: 'AI', value: 'CS.AI' },
      { label: '计算机视觉', value: 'CS.CV' },
      { label: '自然语言', value: 'CS.CL' },
      { label: '机器学习', value: 'CS.ML' },
      { label: '人机交互', value: 'CS.HC' },
      { label: '软件工程', value: 'CS.SE' },
    ],

    timeOptions: [
      { label: '全部', value: '' },
      { label: '今天', value: 'today' },
      { label: '本周', value: 'week' },
      { label: '本月', value: 'month' },
      { label: '半年内', value: 'half_year' },
    ],

    sortOptions: [
      { label: '最新', value: 'latest' },
      { label: '最热', value: 'popular' },
      { label: '时长', value: 'duration' },
      { label: '播放量', value: 'play_count' },
    ],
  },

  /**
   * 组件的计算属性
   */
  computed: {
    hasActiveFilters() {
      const { filterOptions } = this.properties;
      return filterOptions.category || filterOptions.timeRange || filterOptions.sortType !== 'latest';
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 搜索相关
    handleSearchChange: function (e) {
      this.triggerEvent('searchchange', {
        value: e.detail.value,
      });
    },

    handleSearchSubmit: function (e) {
      this.triggerEvent('searchsubmit', {
        value: e.detail.value,
      });
    },

    handleSearchClear: function () {
      this.triggerEvent('searchclear');
    },

    // Tab展开/收起
    toggleFilterTab: function (e) {
      const tab = e.currentTarget.dataset.tab;
      const currentTab = this.data.currentActiveTab;

      // 如果点击的是当前展开的tab，则收起；否则切换到新tab
      const newTab = currentTab === tab ? '' : tab;

      this.setData({
        currentActiveTab: newTab
      });
    },

    // 关闭下拉面板
    closeDropdown: function () {
      this.setData({
        currentActiveTab: ''
      });
    },

    // 选项选择
    handleOptionSelect: function (e) {
      const { type, value } = e.currentTarget.dataset;

      // 触发筛选变更事件
      this.triggerEvent('filterchange', {
        type: type,
        value: value,
      });

      // 选择完成后收起面板
      this.setData({
        currentActiveTab: ''
      });
    },

    // 清除筛选
    clearFilters: function () {
      this.triggerEvent('clearfilters');
    },

    // 获取选项显示标签的辅助方法
    getCategoryLabel: function (value) {
      const option = this.data.categoryOptions.find(item => item.value === value);
      return option ? option.label : '';
    },

    getTimeLabel: function (value) {
      const option = this.data.timeOptions.find(item => item.value === value);
      return option ? option.label : '';
    },

    getSortLabel: function (value) {
      const option = this.data.sortOptions.find(item => item.value === value);
      return option ? option.label : '';
    },
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function () {
      console.log('瀑布流头部组件已加载');
    },

    detached: function () {
      console.log('瀑布流头部组件已卸载');
    },
  },
});