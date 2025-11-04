// API 使用示例
const apiService = require('../services/api.service.js');

// ========== 认证相关示例 ==========

// 1. 微信登录
async function loginExample() {
  try {
    const result = await apiService.auth.loginWithWechat();
    if (result.success) {
      console.log('登录成功:', result.user);
      // 更新页面状态
      // this.setData({ isLoggedIn: true, userInfo: result.user })
    } else {
      console.error('登录失败:', result.error);
      wx.showToast({
        title: '登录失败',
        icon: 'none',
      });
    }
  } catch (error) {
    console.error('登录异常:', error);
  }
}

// 2. 检查登录状态
async function checkAuthExample() {
  const authStatus = await apiService.auth.checkAuthStatus();
  if (authStatus.isAuthenticated) {
    console.log('用户已登录:', authStatus.user);
    return authStatus.user;
  } else {
    console.log('用户未登录');
    return null;
  }
}

// 3. 登出
async function logoutExample() {
  const result = await apiService.auth.logout();
  if (result.success) {
    console.log('登出成功');
    // 跳转到登录页面
    // wx.redirectTo({ url: '/pages/login/login' })
  }
}

// ========== 文件存储示例 ==========

// 1. 上传用户头像
async function uploadAvatarExample() {
  try {
    // 选择并上传头像
    const result = await apiService.storage.selectAndUploadImage(
      apiService.storage.buckets.USER_AVATARS,
      {
        count: 1,
        compress: true,
        quality: 80,
      }
    );

    if (result.success) {
      console.log('头像上传成功:', result.publicUrl);

      // 更新用户资料
      const updateResult = await apiService.auth.updateUserProfile({
        avatar_url: result.publicUrl,
      });

      if (updateResult.success) {
        wx.showToast({
          title: '头像更新成功',
          icon: 'success',
        });
      }
    } else {
      wx.showToast({
        title: '上传失败',
        icon: 'none',
      });
    }
  } catch (error) {
    console.error('上传头像失败:', error);
  }
}

// 2. 批量上传本地 SVG 图标
async function uploadSVGsExample() {
  try {
    wx.showLoading({
      title: '正在上传图标...',
    });

    const results = await apiService.storage.batchUploadLocalSVGs();

    wx.hideLoading();

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    wx.showToast({
      title: `上传完成 ${successCount}/${totalCount}`,
      icon: successCount === totalCount ? 'success' : 'none',
    });

    console.log('SVG 上传结果:', results);
  } catch (error) {
    wx.hideLoading();
    console.error('批量上传失败:', error);
  }
}

// ========== 播客相关示例 ==========

// 1. 获取播客列表
async function getPodcastListExample() {
  try {
    const result = await apiService.podcast.getList({
      page: 1,
      limit: 20,
      sortBy: 'created_at',
    });

    if (result.success) {
      console.log('播客列表:', result.data);
      // 更新页面数据
      // this.setData({ podcastList: result.data })
      return result.data;
    } else {
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  } catch (error) {
    console.error('获取播客列表失败:', error);
  }
}

// 2. 获取推荐播客
async function getRecommendedPodcastsExample() {
  const result = await apiService.podcast.getRecommended(10);
  if (result.success) {
    return result.data;
  }
  return [];
}

// 3. 搜索播客
async function searchPodcastsExample(query) {
  if (!query.trim()) return [];

  try {
    const result = await apiService.search.podcasts(query, {
      page: 1,
      limit: 20,
    });

    if (result.success) {
      console.log('搜索结果:', result.data);
      return result.data;
    }
  } catch (error) {
    console.error('搜索失败:', error);
  }

  return [];
}

// ========== 用户数据示例 ==========

// 1. 添加收藏
async function addFavoriteExample(podcastId) {
  try {
    const userInfo = await checkAuthExample();
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }

    const result = await apiService.user.addFavorite(userInfo.id, podcastId);
    if (result.success) {
      wx.showToast({
        title: '已收藏',
        icon: 'success',
      });

      // 更新本地状态
      const app = getApp();
      app.addToFavorites({ id: podcastId });

      return true;
    } else {
      wx.showToast({
        title: '收藏失败',
        icon: 'none',
      });
    }
  } catch (error) {
    console.error('添加收藏失败:', error);
  }

  return false;
}

// 2. 获取用户收藏列表
async function getFavoritesExample() {
  try {
    const userInfo = await checkAuthExample();
    if (!userInfo) return [];

    const result = await apiService.user.getFavorites(userInfo.id);
    if (result.success) {
      console.log('收藏列表:', result.data);
      return result.data;
    }
  } catch (error) {
    console.error('获取收藏失败:', error);
  }

  return [];
}

// 3. 记录播放历史
async function recordPlayHistoryExample(podcastId, playPosition = 0) {
  try {
    const userInfo = await checkAuthExample();
    if (!userInfo) return;

    // 记录播放历史
    await apiService.user.addHistory(userInfo.id, podcastId, playPosition);

    // 记录播放统计
    await apiService.stats.recordPlay(podcastId, userInfo.id);

    console.log('播放记录已保存');
  } catch (error) {
    console.error('记录播放历史失败:', error);
  }
}

// ========== 页面中的使用示例 ==========

// 在页面的 onLoad 中使用
const pageExample = {
  data: {
    podcastList: [],
    userInfo: null,
    isLoggedIn: false,
  },

  async onLoad() {
    // 检查登录状态
    const userInfo = await checkAuthExample();
    this.setData({
      userInfo,
      isLoggedIn: !!userInfo,
    });

    // 加载播客列表
    await this.loadPodcasts();
  },

  async loadPodcasts() {
    wx.showLoading({ title: '加载中...' });

    try {
      const podcasts = await getPodcastListExample();
      this.setData({
        podcastList: podcasts || [],
      });
    } finally {
      wx.hideLoading();
    }
  },

  async handleLogin() {
    const result = await loginExample();
    if (result) {
      this.setData({
        userInfo: result,
        isLoggedIn: true,
      });
    }
  },

  async handleFavorite(e) {
    const podcastId = e.currentTarget.dataset.id;
    await addFavoriteExample(podcastId);
  },

  async handlePlay(e) {
    const podcastId = e.currentTarget.dataset.id;
    await recordPlayHistoryExample(podcastId);

    // 开始播放逻辑
    // ...
  },
};

module.exports = {
  loginExample,
  checkAuthExample,
  logoutExample,
  uploadAvatarExample,
  uploadSVGsExample,
  getPodcastListExample,
  getRecommendedPodcastsExample,
  searchPodcastsExample,
  addFavoriteExample,
  getFavoritesExample,
  recordPlayHistoryExample,
  pageExample,
};
