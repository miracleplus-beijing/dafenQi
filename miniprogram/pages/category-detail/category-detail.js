// 分类详情页面
const categoryService = require('../../services/category.service.js');
const iconConfig = require('../../config/icon-config.js');

/**
 * 防抖函数
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

Page({
  data: {
    // 分类信息
    category: {
      id: '',
      name: '',
      displayName: '',
      color: ['#e0f2fe', '#0ea5e9'],
    },
    categoryId: '',
    categoryName: '',

    // 播客列表
    podcasts: [],
    currentPage: 1,
    pageSize: 20,
    hasMoreData: true,
    loading: true,
    loadingMore: false,

    // 排序方式
    sortBy: 'created_at', // created_at | play_count | favorite_count
    sortByOptions: [
      { label: '最新', value: 'created_at' },
      { label: '最热', value: 'play_count' },
      { label: '最受欢迎', value: 'favorite_count' },
    ],

    // UI状态
    showSortMenu: false,

    // 图标
    icons: {
      back: iconConfig.getNavigationIcon('back'),
      search: iconConfig.getNavigationIcon('search'),
      more: iconConfig.getNavigationIcon('more'),
      filter: iconConfig.getNavigationIcon('filter'),
    },
  },

  onLoad: function (options) {
    console.log('分类详情页加载', options);

    if (!options.id) {
      wx.showToast({
        title: '分类ID缺失',
        icon: 'none',
        duration: 2000,
      });
      wx.navigateBack();
      return;
    }

    const categoryId = options.id;
    const categoryName = decodeURIComponent(options.name || '分类详情');

    this.setData({
      categoryId: categoryId,
      categoryName: categoryName,
    });

    // 初始化分类信息和加载播客数据
    this.initializePageData();
  },

  onShow: function () {
    console.log('分类详情页显示');
    try {
      const app = getApp();
      // 不设置 activeTabIndex，因为这不是 tabBar 页面
    } catch (_) {}
  },

  onHide: function () {
    console.log('分类详情页隐藏');
  },

  onUnload: function () {
    console.log('分类详情页卸载');
  },

  // 初始化页面数据
  async initializePageData() {
    try {
      this.setData({
        loading: true,
        currentPage: 1,
        podcasts: [],
        hasMoreData: true,
      });

      // 获取分类信息和播客数据
      const [categoryResult, podcastsResult] = await Promise.all([
        this.loadCategoryInfo(),
        this.loadPodcasts(1),
      ]);

      if (!categoryResult.success || !podcastsResult.success) {
        throw new Error('加载数据失败');
      }
    } catch (error) {
      console.error('页面初始化失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
        duration: 2000,
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载分类信息
  async loadCategoryInfo() {
    try {
      const { categoryId } = this.data;
      const categories = categoryService.getAcademicCategories();
      const category = categories.find(c => c.id === categoryId);

      if (!category) {
        throw new Error(`未找到分类: ${categoryId}`);
      }

      this.setData({
        category: {
          ...category,
          color: category.color || ['#e0f2fe', '#0ea5e9'],
          iconName: iconConfig.getAcademicIcon(category.id),
        },
      });

      return { success: true, data: category };
    } catch (error) {
      console.error('加载分类信息失败:', error);
      return { success: false, error: error.message };
    }
  },

  // 加载播客列表
  async loadPodcasts(page = 1) {
    try {
      const { categoryId, pageSize, sortBy } = this.data;

      if (page === 1) {
        this.setData({ loading: true });
      } else {
        this.setData({ loadingMore: true });
      }

      const result = await categoryService.getPodcastsByCategory(
        categoryId,
        {
          page: page,
          limit: pageSize,
          sortBy: sortBy,
        }
      );

      if (!result.success) {
        throw new Error(result.error || '加载播客失败');
      }

      const newPodcasts =
        page === 1
          ? result.data
          : [...this.data.podcasts, ...result.data];

      const hasMore = result.data.length >= pageSize;

      this.setData({
        podcasts: newPodcasts,
        currentPage: page,
        hasMoreData: hasMore,
        loading: false,
        loadingMore: false,
      });

      return { success: true, data: result.data };
    } catch (error) {
      console.error('加载播客列表失败:', error);
      this.setData({
        loading: false,
        loadingMore: false,
      });

      if (page === 1) {
        wx.showToast({
          title: '加载播客失败',
          icon: 'none',
          duration: 2000,
        });
      }

      return { success: false, error: error.message };
    }
  },

  // 播放播客
  playPodcast: function (e) {
    const item = e.currentTarget.dataset.item;
    console.log('播放播客:', item);

    if (!item || !item.id) {
      wx.showToast({
        title: '播客数据错误',
        icon: 'none',
      });
      return;
    }

    // 触觉反馈
    wx.vibrateShort({ type: 'medium' });

    // 更新全局播放状态
    const app = getApp();
    const podcastData = {
      id: item.id,
      title: item.title,
      description: item.description,
      audio_url: item.audio_url,
      cover_url:
        item.cover_url ||
        'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/podcast_cover/default_cover.png',
      duration: item.duration,
      channel: item.channel,
      play_count: item.play_count || 0,
      favorite_count: item.favorite_count || 0,
      created_at: item.created_at,
    };

    app.setCurrentPodcast(podcastData);
    app.globalData.isPlaying = false;
    app.globalData.currentProgress = 0;

    // 跳转到漫游页面
    wx.switchTab({
      url: '/pages/browse/browse',
      success: () => {
        console.log('成功跳转到漫游页面');
      },
      fail: error => {
        console.error('跳转漫游页面失败:', error);
        wx.showToast({
          title: '跳转失败',
          icon: 'none',
        });
      },
    });
  },

  // 切换排序方式
  onSortChange: function (e) {
    const sortBy = e.currentTarget.dataset.value;
    console.log('切换排序方式:', sortBy);

    wx.vibrateShort({ type: 'light' });

    this.setData({
      sortBy: sortBy,
      showSortMenu: false,
    });

    // 重新加载播客列表
    this.loadPodcasts(1);
  },

  // 打开/关闭排序菜单
  toggleSortMenu: function () {
    this.setData({
      showSortMenu: !this.data.showSortMenu,
    });

    wx.vibrateShort({ type: 'light' });
  },

  // 关闭排序菜单
  closeSortMenu: function () {
    if (this.data.showSortMenu) {
      this.setData({ showSortMenu: false });
    }
  },

  // 阻止事件冒泡
  stopPropagation: function (e) {
    // 仅阻止冒泡——不作任何处理
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    console.log('下拉刷新');

    this.initializePageData();

    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 上拉加载更多
  onReachBottom: function () {
    console.log('上拉加载更多');

    if (!this.data.hasMoreData || this.data.loadingMore) {
      return;
    }

    const nextPage = this.data.currentPage + 1;
    this.loadPodcasts(nextPage);
  },

  // 返回上一页
  goBack: function () {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({
          url: '/pages/category/category',
        });
      },
    });
  },

  // 分享功能
  onShareAppMessage: function () {
    const { category } = this.data;
    return {
      title: `奇绩信号 Alpha Sight - ${category?.displayName || '分类详情'}`,
      path: `/pages/category-detail/category-detail?id=${this.data.categoryId}&name=${encodeURIComponent(this.data.categoryName)}`,
      imageUrl:
        'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/share-cover.jpg',
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    const { category } = this.data;
    return {
      title: `推荐${category?.displayName || '分类详情'} - 奇绩信号 Alpha Sight`,
      query: 'share=timeline',
      imageUrl:
        'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/share-cover.jpg',
    };
  },
});
