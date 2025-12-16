// 分类页面逻辑 - 现代化重构版本
const categoryService = require('../../services/category.service.js');
const iconConfig = require('../../config/icon-config.js');

/**
 * 性能优化工具函数
 */
// 防抖函数 - 用于搜索输入等场景
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// 节流函数 - 用于触摸事件等场景
function throttle(fn, delay = 100) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

Page({
  data: {
    // 搜索相关
    searchValue: '',
    searchFocused: false,

    // 学术分类数据
    academicCategories: [],

    // 精选推荐内容 - 带占位数据
    featuredContent: [
      {
        id: 'placeholder-1',
        podcast: {
          id: 'p1',
          title: '深度学习最新进展：Transformer架构的演进',
          cover_url:
            'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/podcast_cover/default_cover.png',
          duration: 45,
          channels: { name: 'AI前沿' },
        },
        recommendationText: '探讨Transformer架构在各领域的应用与创新',
      },
      {
        id: 'placeholder-2',
        podcast: {
          id: 'p2',
          title: '量子计算与机器学习的交叉研究',
          cover_url:
            'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/podcast_cover/default_cover.png',
          duration: 38,
          channels: { name: '量子科技' },
        },
        recommendationText: '量子算法如何加速机器学习训练过程',
      },
      {
        id: 'placeholder-3',
        podcast: {
          id: 'p3',
          title: '大语言模型的伦理与社会影响',
          cover_url:
            'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/podcast_cover/default_cover.png',
          duration: 52,
          channels: { name: 'AI伦理' },
        },
        recommendationText: 'ChatGPT等大模型带来的机遇与挑战',
      },
    ],

    // 排行榜数据 - 带占位数据
    rankings: {
      hot: [
        {
          id: 'h1',
          title: 'GPT-4技术解析：多模态大模型的突破',
          play_count: 15200,
        },
        {
          id: 'h2',
          title: '扩散模型原理与应用：从DALL-E到Stable Diffusion',
          play_count: 12800,
        },
        { id: 'h3', title: '强化学习在游戏AI中的最新进展', play_count: 10500 },
      ],
      new: [
        { id: 'n1', title: '2024年CVPR最佳论文解读', play_count: 8900 },
        { id: 'n2', title: '神经网络压缩技术综述', play_count: 7600 },
        { id: 'n3', title: '联邦学习的隐私保护机制', play_count: 6800 },
      ],
      review: [
        { id: 'r1', title: '深度学习十年回顾与展望', play_count: 18500 },
        { id: 'r2', title: '计算机视觉领域综述', play_count: 14200 },
        { id: 'r3', title: '自然语言处理发展历程', play_count: 12900 },
      ],
    },

    // 当前选中的排行榜tab
    currentRankingTab: 'hot',

    // 加载状态
    loading: {
      categories: false,
      featured: false,
      rankings: false,
    },

    // UI 状态
    showSwipeIndicator: false,
    swipeDirection: '',

    // 触摸相关
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,

    // 图标配置
    icons: {
      search: iconConfig.getNavigationIcon('search'),
      hot: iconConfig.getRankingIcon('hot'),
      new: iconConfig.getRankingIcon('new'),
      review: iconConfig.getRankingIcon('review'),
      more: iconConfig.getNavigationIcon('more'),
    },

    // 性能优化配置
    lazyLoadEnabled: true, // 图片懒加载开关
  },

  onLoad: function (options) {
    console.log('分类页面加载', options);

    // 并行初始化页面数据
    this.initializePageData();
  },

  onShow: function () {
    console.log('分类页面显示');
    try {
      const app = getApp();
      app.globalData.activeTabIndex = 1;
    } catch (_) {}

    // 页面进入动画
    this.enterAnimation();
  },

  onHide: function () {
    console.log('分类页面隐藏');
  },

  onUnload: function () {
    console.log('分类页面卸载');
  },

  // 初始化页面数据（现代化方式）
  async initializePageData() {
    try {
      // 设置加载状态
      this.setData({
        'loading.categories': true,
        'loading.featured': true,
        'loading.rankings': true,
      });

      // 并行加载所有数据
      const [categoriesResult, featuredResult, rankingsResult] =
        await Promise.allSettled([
          this.loadAcademicCategories(),
          this.loadFeaturedContent(),
          this.loadRankingsData(),
        ]);

      // 处理加载结果
      this.handleDataLoadResults({
        categories: categoriesResult,
        featured: featuredResult,
        rankings: rankingsResult,
      });
    } catch (error) {
      console.error('页面数据初始化失败:', error);
      this.handleInitializationError(error);
    }
  },

  // 加载学术分类数据
  async loadAcademicCategories() {
    try {
      const categories = categoryService.getAcademicCategories();

      // 为每个分类添加图标信息
      const categoriesWithIcons = categories.map(category => ({
        ...category,
        iconName: iconConfig.getAcademicIcon(category.id),
      }));

      this.setData({
        academicCategories: categoriesWithIcons,
        'loading.categories': false,
      });

      return { success: true, data: categoriesWithIcons };
    } catch (error) {
      console.error('加载学术分类失败:', error);
      this.setData({ 'loading.categories': false });
      return { success: false, error: error.message };
    }
  },

  // 加载精选推荐内容
  async loadFeaturedContent() {
    try {
      const result = await categoryService.getFeaturedContent(6);

      console.log(result);

      if (result.success) {
        this.setData({
          featuredContent: result.data,
          'loading.featured': false,
        });
      } else {
        console.warn('精选内容加载失败:', result.error);
        this.setData({
          featuredContent: [],
          'loading.featured': false,
        });
      }

      return result;
    } catch (error) {
      console.error('精选内容加载异常:', error);
      this.setData({
        featuredContent: [],
        'loading.featured': false,
      });
      return { success: false, error: error.message };
    }
  },

  // 加载排行榜数据（简化版本）
  async loadRankingsData() {
    try {
      const result = await categoryService.getAllRankings(5); // 每个榜单只显示5个

      if (result.success) {
        this.setData({
          'rankings.hot': result.data.hot || [],
          'rankings.new': result.data.new || [],
          'rankings.review': result.data.review || [],
          'loading.rankings': false,
        });
      } else {
        console.warn('排行榜数据加载失败:', result.errors);
        this.setData({
          'rankings.hot': [],
          'rankings.new': [],
          'rankings.review': [],
          'loading.rankings': false,
        });
      }

      return result;
    } catch (error) {
      console.error('排行榜数据加载异常:', error);
      this.setData({
        'rankings.hot': [],
        'rankings.new': [],
        'rankings.review': [],
        'loading.rankings': false,
      });
      return { success: false, error: error.message };
    }
  },

  // 处理数据加载结果
  handleDataLoadResults(results) {
    // 记录加载结果统计
    const stats = {
      success: 0,
      failed: 0,
      total: Object.keys(results).length,
    };

    Object.entries(results).forEach(([key, result]) => {
      if (result.status === 'fulfilled' && result.value.success) {
        stats.success++;
        console.log(`${key} 数据加载成功`);
      } else {
        stats.failed++;
        console.warn(
          `${key} 数据加载失败:`,
          result.reason || result.value?.error
        );
      }
    });

    console.log('数据加载统计:', stats);

    // 如果所有数据都加载失败，显示错误提示
    if (stats.failed === stats.total) {
      this.showDataLoadError();
    }
  },

  // 处理初始化错误
  handleInitializationError(error) {
    console.error('页面初始化失败:', error);
    wx.showToast({
      title: '数据加载失败',
      icon: 'none',
      duration: 2000,
    });
  },

  // 显示数据加载错误
  showDataLoadError() {
    wx.showModal({
      title: '数据加载失败',
      content: '网络连接异常，请检查网络后重试',
      confirmText: '重试',
      cancelText: '取消',
      success: res => {
        if (res.confirm) {
          this.initializePageData();
        }
      },
    });
  },

  // 页面进入动画
  enterAnimation: function () {
    const query = this.createSelectorQuery();
    query.select('.container').boundingClientRect();
    query.exec(res => {
      if (res[0]) {
        // 可以在这里添加进入动画逻辑
        console.log('页面进入动画完成');
      }
    });
  },

  // 搜索输入处理 - 使用防抖优化
  onSearchInput: debounce(function (e) {
    const value = e.detail.value;
    this.setData({
      searchValue: value,
    });

    // 实时搜索（防抖处理）
    if (value.trim()) {
      console.log('搜索:', value);
      this.performSearch(value);
    }
  }, 500),

  // 搜索获得焦点
  onSearchFocus: function () {
    this.setData({ searchFocused: true });
  },

  // 搜索失去焦点
  onSearchBlur: function () {
    this.setData({ searchFocused: false });
  },

  // 跳转到搜索页面
  goToSearch: function () {
    console.log('跳转到搜索页面');
    wx.navigateTo({
      url: '/pages/search/search',
      success: () => {
        console.log('成功跳转到搜索页面');
      },
      fail: err => {
        console.error('跳转搜索页面失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none',
          duration: 2000,
        });
      },
    });
  },

  // 执行搜索
  performSearch: function (keyword) {
    wx.navigateTo({
      url: `/pages/search/search?query=${encodeURIComponent(keyword)}`,
    });
  },

  // 选择学术分类
  selectCategory: function (e) {
    const category = e.currentTarget.dataset.category;
    console.log('选择学术分类:', category);

    // 触觉反馈 - 轻微震动
    wx.vibrateShort({
      type: 'light',
    });

    // 跳转到分类详情页
    wx.navigateTo({
      url: `/pages/category-detail/category-detail?id=${category.id}&name=${encodeURIComponent(
        category.displayName
      )}`,
      success: () => {
        console.log('成功跳转到分类详情页');
      },
      fail: error => {
        console.error('跳转分类详情页失败:', error);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none',
          duration: 1500,
        });
      },
    });
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

    // 触觉反馈 - 中等震动
    wx.vibrateShort({
      type: 'medium',
    });

    // 更新全局播放状态，使用新的setCurrentPodcast方法
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

    // 使用新的方法设置当前播客，会自动记录播放历史
    app.setCurrentPodcast(podcastData);

    // 设置播放状态
    app.globalData.isPlaying = false; // 先设为false，让browse页面来控制播放
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

  // 切换排行榜tab
  onRankingTabChange: function (e) {
    // 兼容 TDesign 事件和原生 dataset 事件
    const value = e.detail?.value || e.currentTarget.dataset.value;
    console.log('切换排行榜tab:', value);

    // 触觉反馈
    wx.vibrateShort({
      type: 'light',
    });

    this.setData({
      currentRankingTab: value,
    });
  },

  // 查看完整榜单
  viewFullRanking: function () {
    console.log('查看完整榜单:', this.data.currentRankingTab);

    // 触觉反馈
    wx.vibrateShort({
      type: 'light',
    });

    wx.navigateTo({
      url: `/pages/ranking/ranking?defaultTab=${this.data.currentRankingTab}`,
      success: () => {
        console.log('成功跳转到榜单详情页');
      },
      fail: error => {
        console.error('跳转榜单详情页失败:', error);
        wx.showToast({
          title: '跳转失败',
          icon: 'none',
          duration: 1500,
        });
      },
    });
  },

  // 刷新内容
  refreshContent: function () {
    console.log('刷新页面内容');

    // 触觉反馈 - 轻微震动
    wx.vibrateShort({
      type: 'light',
    });

    wx.showLoading({
      title: '刷新中...',
    });

    // 清除缓存并重新加载
    categoryService.clearCache();

    setTimeout(() => {
      this.initializePageData();
      wx.hideLoading();
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500,
      });
    }, 1000);
  },

  // 触摸开始
  touchStart: function (e) {
    const touch = e.touches[0];
    this.setData({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isDragging: false,
    });
  },

  // 触摸移动 - 使用节流优化
  touchMove: throttle(function (e) {
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.data.startX;
    const deltaY = touch.clientY - this.data.startY;

    this.setData({
      currentX: touch.clientX,
      currentY: touch.clientY,
    });

    // 检查是否是水平滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      this.setData({
        isDragging: true,
        showSwipeIndicator: true,
      });

      if (deltaX > 50) {
        this.setData({
          swipeDirection: 'right',
        });
      } else if (deltaX < -50) {
        this.setData({
          swipeDirection: 'left',
        });
      } else {
        this.setData({
          swipeDirection: '',
        });
      }
    }
  }, 16), // 60fps 约 16ms

  // 触摸结束
  touchEnd: function (e) {
    if (!this.data.isDragging) {
      this.resetSwipeState();
      return;
    }

    const deltaX = this.data.currentX - this.data.startX;
    const threshold = 100;

    this.setData({
      showSwipeIndicator: false,
      swipeDirection: '',
    });

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // 向右滑动 - 去漫游页面
        console.log('向右滑动到漫游页面');
        wx.switchTab({
          url: '/pages/browse/browse',
        });
      } else {
        // 向左滑动 - 去我的页面
        console.log('向左滑动到我的页面');
        wx.switchTab({
          url: '/pages/profile/profile',
        });
      }
    }

    this.resetSwipeState();
  },

  // 重置滑动状态
  resetSwipeState: function () {
    this.setData({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isDragging: false,
      showSwipeIndicator: false,
      swipeDirection: '',
    });
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    console.log('下拉刷新');

    // 清除缓存并重新加载数据
    categoryService.clearCache();
    this.initializePageData();

    // 延迟停止刷新
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 上拉加载更多
  onReachBottom: function () {

    wx.showToast({
      title: '没有更多内容了',
      icon: 'none',
      duration: 1500,
    });
  },

  // 分享功能
  onShareAppMessage: function () {
    return {
      title: '奇绩信号 Alpha Sight - 发现精彩的学术内容',
      path: '/pages/category/category',
      imageUrl:
        'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/share-cover.jpg',
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '推荐一个很棒的学术播客平台',
      query: 'share=timeline',
      imageUrl:
        'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/share-cover.jpg',
    };
  },
});
