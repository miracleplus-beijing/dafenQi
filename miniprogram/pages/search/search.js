// 搜索页面
const apiService = require('../../services/api.service.js');

Page({
  data: {
    searchQuery: '', // 搜索关键词
    searchResults: [], // 搜索结果
    podcastResults: [], // 播客结果
    channelResults: [], // 频道结果
    loading: false, // 加载状态
    hasSearched: false, // 是否已搜索
    inputFocused: true, // 输入框聚焦状态
    searchHistory: [], // 搜索历史
    searchTimer: null, // 搜索防抖定时器
  },

  onLoad(options) {
    console.log('搜索页面加载');
    // 获取搜索历史
    this.loadSearchHistory();

    // 如果有传入的搜索关键词，直接搜索
    if (options.query) {
      this.setData({
        searchQuery: options.query,
        inputFocused: true,
      });
      this.performSearch(options.query);
    }
  },

  onShow() {
    // 页面显示时聚焦输入框
    this.setData({
      inputFocused: true,
    });
  },

  // 搜索输入处理
  onSearchInput(e) {
    const query = e.detail.value;
    this.setData({
      searchQuery: query,
    });

    // 清除之前的定时器
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }

    // 如果输入为空，清空结果
    if (!query.trim()) {
      this.setData({
        searchResults: [],
        podcastResults: [],
        channelResults: [],
        hasSearched: false,
      });
      return;
    }

    // 设置防抖搜索（300ms延迟）
    const timer = setTimeout(() => {
      this.performSearch(query.trim());
    }, 300);

    this.setData({
      searchTimer: timer,
    });
  },

  // 搜索确认（回车）
  onSearchConfirm(e) {
    const query = e.detail.value.trim();
    if (query) {
      // 清除防抖定时器，立即搜索
      if (this.data.searchTimer) {
        clearTimeout(this.data.searchTimer);
        this.setData({ searchTimer: null });
      }
      this.performSearch(query);
    }
  },

  // 执行搜索
  async performSearch(query) {
    if (!query || query.length < 1) return;

    console.log('执行搜索:', query);
    this.setData({
      loading: true,
      hasSearched: true,
    });

    try {
      // 并行搜索播客和频道
      const [podcastResult, channelResult] = await Promise.all([
        this.searchPodcasts(query),
        this.searchChannels(query),
      ]);

      // 处理播客结果（限制前3条）
      const podcastResults = podcastResult.success
        ? podcastResult.data.slice(0, 3).map(podcast => ({
            ...podcast,
            highlightedTitle: this.highlightText(podcast.title, query),
            highlightedChannelName: this.highlightText(
              podcast.channel_name || '奇绩信号 Alpha Sight',
              query
            ),
          }))
        : [];

      // 处理频道结果（限制后2条）
      const channelResults = channelResult.success
        ? channelResult.data.slice(0, 2).map(channel => ({
            ...channel,
            highlightedName: this.highlightText(channel.name, query),
          }))
        : [];

      // 合并所有结果
      const allResults = [...podcastResults, ...channelResults];

      this.setData({
        searchResults: allResults,
        podcastResults: podcastResults,
        channelResults: channelResults,
        loading: false,
      });

      // 保存搜索历史
      this.saveSearchHistory(query);
    } catch (error) {
      console.error('搜索失败:', error);
      this.setData({
        loading: false,
        searchResults: [],
        podcastResults: [],
        channelResults: [],
      });
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none',
        duration: 2000,
      });
    }
  },

  // 搜索播客
  async searchPodcasts(query) {
    try {
      const result = await apiService.search.podcastsWithChannel(query, {
        limit: 5,
      });
      return result;
    } catch (error) {
      console.error('搜索播客失败:', error);
      return { success: false, data: [] };
    }
  },

  // 搜索频道
  async searchChannels(query) {
    try {
      const result = await apiService.search.channels(query, { limit: 3 });
      return result;
    } catch (error) {
      console.error('搜索频道失败:', error);
      return { success: false, data: [] };
    }
  },

  // 高亮搜索关键词
  highlightText(text, query) {
    if (!text || !query) return text;

    const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  },

  // 转义正则表达式特殊字符
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  // 清空搜索
  onClearSearch() {
    this.setData({
      searchQuery: '',
      searchResults: [],
      podcastResults: [],
      channelResults: [],
      hasSearched: false,
      inputFocused: true,
    });
  },

  // 取消搜索
  onCancel() {
    wx.navigateBack();
  },

  // 点击播客条目
  onPodcastTap(e) {
    const podcast = e.currentTarget.dataset.podcast;
    console.log('点击播客:', podcast);

    // 跳转到漫游界面并播放该播客
    wx.redirectTo({
      url: `/pages/browse/browse?podcastId=${podcast.id}&autoPlay=true`,
    });
  },

  // 点击频道条目
  onChannelTap(e) {
    const channel = e.currentTarget.dataset.channel;
    console.log('点击频道:', channel);

    // 跳转到频道详情页（这里先用分类页面代替）
    wx.navigateTo({
      url: `/pages/category/category?channelId=${channel.id}&channelName=${encodeURIComponent(channel.name)}`,
    });
  },

  // 搜索历史相关方法
  loadSearchHistory() {
    try {
      const history = wx.getStorageSync('searchHistory') || [];
      this.setData({
        searchHistory: history.slice(0, 10), // 最多显示10条历史
      });
    } catch (error) {
      console.error('加载搜索历史失败:', error);
    }
  },

  saveSearchHistory(query) {
    try {
      let history = wx.getStorageSync('searchHistory') || [];

      // 移除重复项
      history = history.filter(item => item !== query);

      // 添加到开头
      history.unshift(query);

      // 限制最多保存20条
      history = history.slice(0, 20);

      wx.setStorageSync('searchHistory', history);

      // 更新显示的历史（最多10条）
      this.setData({
        searchHistory: history.slice(0, 10),
      });
    } catch (error) {
      console.error('保存搜索历史失败:', error);
    }
  },

  // 点击搜索历史
  onHistoryTap(e) {
    const query = e.currentTarget.dataset.query;
    this.setData({
      searchQuery: query,
      inputFocused: true,
    });
    this.performSearch(query);
  },

  // 清空搜索历史
  onClearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清空搜索历史吗？',
      success: res => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('searchHistory');
            this.setData({
              searchHistory: [],
            });
            wx.showToast({
              title: '已清空',
              icon: 'success',
              duration: 1500,
            });
          } catch (error) {
            console.error('清空搜索历史失败:', error);
            wx.showToast({
              title: '清空失败',
              icon: 'none',
              duration: 2000,
            });
          }
        }
      },
    });
  },

  onUnload() {
    // 页面卸载时清除定时器
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }
  },
});
