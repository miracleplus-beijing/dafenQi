Component({
  properties: {
  },
  data: {
    // 列表与布局
    waterfallList: [],
    leftColumnList: [],
    rightColumnList: [],

    // 状态
    loading: false,
    waterfallLoading: false,
    waterfallRefreshing: false,
    hasMoreWaterfallData: true,

    // 搜索筛选
    searchKeyword: '',
    filterOptions: {
      category: '',
      timeRange: '',
      sortType: 'latest',
    },
    isSearchMode: false,

    // 预览
    showQuickPreview: false,
    quickPreviewPodcast: null,
  },

  lifetimes: {
    attached() {
      // 初次加载
      this.loadWaterfallData(false);
    }
  },

  methods: {
    // 卡片播放事件：向上抛出，交由页面局部处理
    handleCardPlay(e) {
      const { podcast } = e.detail || {};
      if (!podcast) return;
      this.triggerEvent('play', { podcast });
    },

    // 是否播放中
    isItemPlaying(id) {
      try {
        const app = getApp();
        const gp = app && app.globalData && app.globalData.globalPlayer;
        return Boolean(gp && gp.currentPodcast && gp.currentPodcast.id === id && gp.isPlaying);
      } catch (_) { return false; }
    },

    // 加载瀑布流数据
    async loadWaterfallData(loadMore = false) {
      try {
        if (this.data.waterfallLoading) return;

        if (!loadMore) {
          if (!this.data.waterfallRefreshing) {
            this.setData({ loading: true, waterfallLoading: false });
          }
        } else {
          this.setData({ waterfallLoading: true });
        }

        const batchSize = loadMore ? 10 : 20;
        const result = await this.fetchPodcastsFromDatabase(1, { limit: batchSize });

        if (result.success && result.data.length > 0) {
          const processedData = await this.processPodcastData(result.data);
          const finalWaterfallList = loadMore
            ? [...this.data.waterfallList, ...processedData]
            : processedData;

          this.setData({
            waterfallList: finalWaterfallList,
            loading: this.data.waterfallRefreshing ? this.data.loading : false,
            waterfallLoading: false,
          });

          this.throttledRedistributeData(finalWaterfallList);
        } else {
          this.setData({
            loading: this.data.waterfallRefreshing ? this.data.loading : false,
            waterfallLoading: false,
            hasMoreWaterfallData: false,
          });
        }
      } catch (error) {
        console.error('加载瀑布流数据失败:', error);
        this.setData({
          loading: this.data.waterfallRefreshing ? this.data.loading : false,
          waterfallLoading: false,
        });
      }
    },

    // 数据处理
    async processPodcastData(rawData) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const processedData = rawData.map(podcast => {
            const channelName = podcast.channels
              ? podcast.channels.name
              : podcast.channel_name || '奇绩前沿信号';
            return {
              id: podcast.id,
              title: podcast.title,
              description: podcast.description,
              audio_url: podcast.audio_url,
              cover_url: this.getPodcastCoverUrl(channelName, podcast.cover_url),
              channel_name: channelName,
              duration: podcast.duration || 0,
              play_count: podcast.play_count || 0,
              like_count: podcast.like_count || 0,
              favorite_count: podcast.favorite_count || 0,
              created_at: podcast.created_at,
              isFavorited: false,
            };
          });
          resolve(processedData);
        }, 0);
      });
    },

    // 双列分配（节流）
    throttledRedistributeData(waterfallList) {
      if (this._redistributeTimer) clearTimeout(this._redistributeTimer);
      this._redistributeTimer = setTimeout(() => {
        this.redistributeWaterfallData(waterfallList);
      }, 100);
    },

    redistributeWaterfallData(waterfallList) {
      const left = [];
      const right = [];
      waterfallList.forEach((item, index) => {
        (index % 2 === 0 ? left : right).push(item);
      });
      this.setData({ leftColumnList: left, rightColumnList: right });
    },

    // 搜索/筛选
    handleWaterfallSearchChange(e) {
      this.setData({ searchKeyword: e.detail.value });
    },
    handleWaterfallSearchSubmit(e) {
      this.performWaterfallSearch(e.detail.value);
    },
    handleWaterfallSearchClear() {
      this.setData({ searchKeyword: '', isSearchMode: false });
      this.loadWaterfallData(false);
    },
    performWaterfallSearch(keyword) {
      if (!keyword || !keyword.trim()) return;
      this.setData({ isSearchMode: true, searchKeyword: keyword });
      this.loadWaterfallData(false);
    },
    handleWaterfallFilterChange(e) {
      const { type, value } = e.detail;
      this.setData({ [`filterOptions.${type}`]: value });
      this.loadWaterfallData(false);
    },
    handleWaterfallClearFilters() {
      this.setData({
        filterOptions: { category: '', timeRange: '', sortType: 'latest' },
      });
      this.loadWaterfallData(false);
    },

    // 下拉刷新/触底
    handleWaterfallRefresh() {
      if (this.data.waterfallLoading || this.data.waterfallRefreshing) return;
      const now = Date.now();
      if (this.lastRefreshTime && now - this.lastRefreshTime < 2000) {
        this.setData({ waterfallRefreshing: false });
        return;
      }
      this.lastRefreshTime = now;
      this.setData({ waterfallRefreshing: true });
      this.refreshWaterfallData();
    },

    async refreshWaterfallData() {
      try {
        let newWaterfallList = [];
        const batchSize = 20;
        const result = await this.fetchPodcastsFromDatabase(1, { limit: batchSize });
        if (result.success && result.data.length > 0) {
          const processedData = await this.processPodcastData(result.data);
          newWaterfallList = processedData;
          this.setData({
            waterfallList: newWaterfallList,
            hasMoreWaterfallData: result.data.length === batchSize,
          });
          this.throttledRedistributeData(newWaterfallList);
          setTimeout(() => {
            this.setData({ waterfallRefreshing: false });
            wx.showToast({ title: '刷新成功', icon: 'success', duration: 1000 });
          }, 300);
        } else {
          setTimeout(() => {
            this.setData({ waterfallRefreshing: false });
            wx.showToast({ title: '暂无新内容', icon: 'none', duration: 1000 });
          }, 300);
        }
      } catch (error) {
        console.error('瀑布流刷新失败:', error);
        this.setData({ waterfallRefreshing: false });
        wx.showToast({ title: '刷新失败', icon: 'error', duration: 1000 });
      }
    },

    handleWaterfallScrollToLower() {
      if (this.data.hasMoreWaterfallData && !this.data.waterfallLoading && !this.data.waterfallRefreshing) {
        this.loadWaterfallData(true);
      }
    },

    // 预览
    showQuickPreview(podcast) {
      this.setData({ showQuickPreview: true, quickPreviewPodcast: podcast });
    },
    handleQuickPreviewTrialPlay(e) {},
    handleQuickPreviewTrialPause(e) {},
    handleQuickPreviewTrialStop(e) {},
    handleQuickPreviewFavorite(e) {
      const { podcast, favorited } = e.detail;
      this.updateWaterfallItemFavoriteState(podcast.id, favorited);
      const authService = require('../../services/auth.service.js');
      const user = authService.getCurrentUser && authService.getCurrentUser();
      if (user) this.updateFavoriteStatus(podcast.id, favorited, user.id);
    },
    handleQuickPreviewShare(e) {
      wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    },
    handleQuickPreviewAddToPlaylist(e) {
      const app = getApp();
      const { podcast } = e.detail;
      if (app && typeof app.setCurrentPodcast === 'function') {
        app.setCurrentPodcast(podcast);
      }
    },
    // 详细预览：来自卡片的“详细”动作
    handleCardDetail(e) {
      const { podcast } = e.detail || {};
      if (!podcast) return;
      this.showQuickPreview(podcast);
    },
    handleQuickPreviewPlayFull(e) {
      const { podcast } = e.detail;
      // 将完整播放与卡片播放对齐：向上抛出 'play'，由页面统一处理音频与 mini-player
      if (podcast) {
        this.triggerEvent('play', { podcast });
      }
    },
    handleQuickPreviewClose() {
      this.setData({ showQuickPreview: false, quickPreviewPodcast: null });
    },

    // 收藏状态更新（本地+后端）
    updateWaterfallItemFavoriteState(podcastId, isFavorited) {
      const { leftColumnList, rightColumnList } = this.data;
      const newLeft = leftColumnList.map(item => item.id === podcastId ? { ...item, isFavorited } : item);
      const newRight = rightColumnList.map(item => item.id === podcastId ? { ...item, isFavorited } : item);
      this.setData({ leftColumnList: newLeft, rightColumnList: newRight });
    },

    async updateFavoriteStatus(podcastId, isFavorited, userId) {
      try {
        const audioService = require('../../services/audio.service.js');
        let result;
        if (isFavorited) {
          result = await audioService.addToFavorites(userId, podcastId);
        } else {
          result = await audioService.removeFromFavorites(userId, podcastId);
        }
        if (!result.success) throw new Error(result.error || '收藏失败');
      } catch (err) {
        console.warn('同步收藏状态失败，回滚本地态:', err);
        this.updateWaterfallItemFavoriteState(podcastId, !isFavorited);
      }
    },

    // 工具：封面URL
    getPodcastCoverUrl(channelName, originalCoverUrl) {
      if (originalCoverUrl && originalCoverUrl.startsWith('https://') && !originalCoverUrl.includes('default-cover')) {
        return originalCoverUrl;
      }
      const baseUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/podcast_cover/';
      if (channelName && channelName.includes('奇绩前沿信号')) {
        return baseUrl + 'miracleplus_signal.png';
      } else if (channelName && channelName.includes('经典论文解读')) {
        return baseUrl + 'classic_paper_interpretation.png';
      } else {
        return baseUrl + 'miracleplus_signal.png';
      }
    },

    // 数据源
    async fetchPodcastsFromDatabase(page = 1, { limit = 10 } = {}) {
      try {
        const apiService = require('../../services/api.service.js');
        const result = await apiService.podcast.list({
          page,
          limit,
          order_by: 'created_at',
          order_direction: 'desc',
        });
        if (result && result.success) {
          const data = (result.data || []).map(item => {
            let audioUrl = item.audio_url;
            if (audioUrl && audioUrl.startsWith('/')) {
              audioUrl = `https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/podcast-audios${audioUrl}`;
            } else if (audioUrl && !audioUrl.startsWith('http')) {
              audioUrl = `https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/podcast-audios/${audioUrl}`;
            }
            return Object.assign({}, item, {
              audio_url: audioUrl,
              channel_name: item.channels ? item.channels.name : '奇绩前沿信号',
            });
          });
          return { success: true, data };
        }
        throw new Error((result && result.error) || '获取播客数据失败');
      } catch (error) {
        console.error('从数据库获取播客数据失败:', error);
        return { success: false, error: error.message || '网络请求失败', data: [] };
      }
    },
  }
});
