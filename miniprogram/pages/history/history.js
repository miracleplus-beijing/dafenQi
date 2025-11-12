// 历史记录页面逻辑 - 使用API接口
const app = getApp();
const apiService = require('../../services/api.service.js');
const authService = require('../../services/auth.service.js');

Page({
  data: {
    historyList: [],
    loading: true,
    currentUser: null,
  },

  onLoad: function (options) {
    this.initPage();
  },

  onShow: function () {
    // 如果已经有用户信息，直接加载历史记录
    if (this.data.currentUser && this.data.currentUser.id) {
      this.loadHistoryList();
    } else {
      // 否则重新初始化页面
      this.initPage();
    }
  },

  onPullDownRefresh: function () {
    this.loadHistoryList();
    wx.stopPullDownRefresh();
  },

  /**
   * 初始化页面
   */
  async initPage() {
    try {
      // 检查用户登录状态
      const isLoggedIn = await authService.checkLoginStatus();
      if (!isLoggedIn) {
        this.handleNotLoggedIn();
        return;
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        this.handleNotLoggedIn();
        return;
      }

      this.setData({
        currentUser: currentUser,
      });

      // 加载历史记录
      this.loadHistoryList();
    } catch (error) {
      console.error('页面初始化失败:', error);
      this.handleNotLoggedIn();
    }
  },

  /**
   * 处理用户未登录情况
   */
  handleNotLoggedIn() {
    this.setData({
      loading: false,
      historyList: [],
      currentUser: null,
    });

    wx.showToast({
      title: '请先登录',
      icon: 'none',
      duration: 2000,
    });

    // 延迟跳转到个人页面
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/profile/profile',
      });
    }, 2000);
  },

  /**
   * 加载历史记录列表
   */
  async loadHistoryList() {
    try {
      this.setData({ loading: true });

      const currentUser = this.data.currentUser;
      if (!currentUser || !currentUser.id) {
        this.handleNotLoggedIn();
        return;
      }

      // 调用API获取历史记录
      const result = await apiService.user.getPlayHistory(currentUser.id);

      if (result.success && result.data) {
        const historyList = result.data.map(item => {
          // 处理数据格式，确保兼容性
          const podcast = item.podcasts || {};
          const channel = podcast.channels || {};
          const authors = podcast.authors || [];

          return {
            id: item.podcast_id,
            title: podcast.title || '未知播客',
            description: podcast.description || '',
            cover:
              podcast.cover_url ||
              'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/logo.png',
            audioUrl: podcast.audio_url || '',
            channel: channel.name || '未知来源',
            channelCategory: channel.category || '',
            channelDescription: channel.description || '',
            isOfficial: channel.is_official || false,
            duration: podcast.duration || 0,
            playTime: new Date(item.played_at).getTime(),
            playTimeText: this.formatTime(new Date(item.played_at).getTime()),
            durationText: this.formatDuration(podcast.duration),
            completed: item.completed || false,

            // 学术论文相关信息
            paperInfo: {
              title: podcast.paper_title || '',
              url: podcast.paper_url || '',
              authors: this.formatAuthors(authors),
              authorsCount: authors.length,
              institution: podcast.institution || '',
              publishDate: podcast.publish_date || '',
              publishDateText: this.formatPublishDate(podcast.publish_date),
              arxivId: podcast.arxiv_id || '',
              doi: podcast.doi || '',
            },

            // 统计数据
            stats: {
              playCount: podcast.play_count || 0,
              likeCount: podcast.like_count || 0,
              favoriteCount: podcast.favorite_count || 0,
              commentCount: podcast.comment_count || 0,
              shareCount: podcast.share_count || 0,
            },

            // 状态信息
            status: podcast.status || 'published',
            createdAt: podcast.created_at || '',
            updatedAt: podcast.updated_at || '',

            // 保留原始数据用于播放
            podcastData: podcast,
            historyData: item,
          };
        });

        this.setData({
          historyList: historyList,
          loading: false,
        });
      } else {
        console.error('获取历史记录失败:', result.error);
        this.setData({
          historyList: [],
          loading: false,
        });

        if (result.error) {
          wx.showToast({
            title: '加载失败',
            icon: 'error',
          });
        }
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
      this.setData({
        loading: false,
        historyList: [],
      });

      wx.showToast({
        title: '加载失败',
        icon: 'error',
      });
    }
  },

  /**
   * 格式化时间戳为相对时间
   * @param {number} timestamp 时间戳
   * @returns {string} 相对时间字符串
   */
  formatTime: function (timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 1分钟内
    if (diff < 60000) return '刚刚';
    // 1小时内
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    // 24小时内
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    // 7天内
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

    // 超过7天显示具体日期
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  /**
   * 格式化音频时长
   * @param {number} duration 时长（秒）
   * @returns {string} 格式化后的时长字符串
   */
  formatDuration: function (duration) {
    if (!duration || isNaN(duration)) return '--:--';

    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  },

  /**
   * 计算播放进度百分比
   * @param {number} playPosition 播放位置（秒）
   * @param {number} duration 总时长（秒）
   * @returns {number} 进度百分比 (0-100)
   */
  calculateProgressPercent: function (playPosition, duration) {
    if (!duration || duration <= 0 || !playPosition) return 0;
    return Math.min(Math.round((playPosition / duration) * 100), 100);
  },

  /**
   * 格式化作者列表
   * @param {Array} authors 作者数组
   * @returns {string} 格式化后的作者字符串
   */
  formatAuthors: function (authors) {
    if (!authors || !Array.isArray(authors) || authors.length === 0) {
      return '未知作者';
    }

    // 提取作者姓名
    const authorNames = authors
      .map(author => {
        if (typeof author === 'string') return author;
        return author.name || author.toString();
      })
      .filter(name => name && name.trim());

    if (authorNames.length === 0) return '未知作者';
    if (authorNames.length === 1) return authorNames[0];
    if (authorNames.length <= 3) return authorNames.join(', ');

    // 超过3个作者时显示前两个+等
    return `${authorNames.slice(0, 2).join(', ')} 等${authorNames.length}人`;
  },

  /**
   * 格式化发布日期
   * @param {string} publishDate 发布日期字符串
   * @returns {string} 格式化后的日期字符串
   */
  formatPublishDate: function (publishDate) {
    if (!publishDate) return '';

    try {
      const date = new Date(publishDate);
      if (isNaN(date.getTime())) return publishDate; // 返回原始字符串

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      return `${year}年${month}月${day}日`;
    } catch (error) {
      console.error('日期格式化失败:', error);
      return publishDate;
    }
  },

  /**
   * 格式化播放进度文本
   * @param {number} playPosition 播放位置（秒）
   * @param {number} duration 总时长（秒）
   * @returns {string} 进度文本
   */
  formatProgressText: function (playPosition, duration) {
    if (!duration || duration <= 0) return '';
    if (!playPosition || playPosition <= 0) return '未开始';

    const progress = Math.round((playPosition / duration) * 100);

    if (progress >= 95) return '已完成';
    if (progress >= 50) return `已听 ${progress}%`;
    return `听了 ${this.formatDuration(playPosition)}`;
  },

  /**
   * 播放历史记录项目
   * @param {object} e 事件对象
   */
  playHistoryItem: function (e) {
    const item = e.currentTarget.dataset.item;

    if (!item) {
      console.error('播放项目数据为空');
      return;
    }

    // 构造播客数据
    const podcastData = {
      id: item.id,
      title: item.title,
      cover_url: item.cover,
      duration: item.duration,
      ...item.podcastData,
    };

    // 设置当前播客到全局状态
    app.globalData.currentPodcast = podcastData;

    // 切换到漫游页面进行播放
    wx.switchTab({
      url: '/pages/browse/browse',
      success: () => {
        wx.showToast({
          title: '正在播放',
          icon: 'success',
          duration: 1000,
        });
      },
      fail: error => {
        console.error('跳转到漫游页面失败:', error);
        wx.showToast({
          title: '播放失败',
          icon: 'error',
        });
      },
    });
  },

  /**
   * 从历史记录中删除单个项目
   * @param {object} e 事件对象
   */
  removeFromHistory: function (e) {
    const podcastId = e.currentTarget.dataset.id;

    if (!podcastId) {
      console.error('删除项目ID为空');
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条历史记录吗？',
      confirmColor: '#FF3B30',
      success: res => {
        if (res.confirm) {
          this.performRemoveFromHistory(podcastId);
        }
      },
      fail: error => {
        console.error('显示删除确认对话框失败:', error);
      },
    });
  },

  /**
   * 执行删除历史记录操作
   * @param {string} podcastId 要删除的播客ID
   */
  async performRemoveFromHistory(podcastId) {
    try {
      const currentUser = this.data.currentUser;
      if (!currentUser || !currentUser.id) {
        wx.showToast({
          title: '用户未登录',
          icon: 'error',
        });
        return;
      }

      wx.showLoading({
        title: '删除中...',
      });

      // 调用API删除历史记录
      const result = await apiService.user.removeHistory(
        currentUser.id,
        podcastId
      );

      wx.hideLoading();

      if (result.success) {
        // 重新加载列表
        this.loadHistoryList();

        wx.showToast({
          title: '已删除',
          icon: 'success',
          duration: 1500,
        });
      } else {
        console.error('删除历史记录失败:', result.error);
        wx.showToast({
          title: '删除失败',
          icon: 'error',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('删除历史记录失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'error',
      });
    }
  },

  /**
   * 清空所有历史记录
   */
  clearAllHistory: function () {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？此操作不可恢复。',
      confirmColor: '#FF3B30',
      confirmText: '清空',
      success: res => {
        if (res.confirm) {
          this.performClearAllHistory();
        }
      },
      fail: error => {
        console.error('显示清空确认对话框失败:', error);
      },
    });
  },

  /**
   * 执行清空所有历史记录操作
   */
  async performClearAllHistory() {
    try {
      const currentUser = this.data.currentUser;
      if (!currentUser || !currentUser.id) {
        wx.showToast({
          title: '用户未登录',
          icon: 'error',
        });
        return;
      }

      wx.showLoading({
        title: '清空中...',
      });

      // 调用API清空历史记录
      const result = await apiService.user.clearHistory(currentUser.id);

      wx.hideLoading();

      if (result.success) {
        this.setData({
          historyList: [],
        });

        wx.showToast({
          title: '已清空历史记录',
          icon: 'success',
          duration: 2000,
        });
      } else {
        console.error('清空历史记录失败:', result.error);
        wx.showToast({
          title: '清空失败',
          icon: 'error',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('清空历史记录失败:', error);
      wx.showToast({
        title: '清空失败',
        icon: 'error',
      });
    }
  },
});
