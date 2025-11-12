App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    isGuestMode: false,
    currentProgress: 0,
    maxProgress: 100,
    isPlaying: false,
    currentPodcast: null,
    favoriteList: [],
    settings: {
      autoPlay: false, // 禁用自动播放
      downloadQuality: 'high',
      theme: 'light',
    },

    // 双模式状态管理
    browseMode: 'swiper', // 'swiper' | 'waterfall'

    // 全局播放器状态
    globalPlayer: {
      isVisible: false,
      isPlaying: false,
      currentPodcast: null,
      currentProgress: 0,
      maxProgress: 100,
    },

    // Supabase配置
    supabaseUrl: 'https://gxvfcafgnhzjiauukssj.supabase.co',
    supabaseAnonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmZjYWZnbmh6amlhdXVrc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY4NjAsImV4cCI6MjA3MTAwMjg2MH0.uxO5eyw0Usyd59UKz-S7bTrmOnNPg9Ld9wJ6pDMIQUA',
    apiService: require('./services/api.service.js'),
  },

  onLaunch: function () {
    console.log('达芬Qi说小程序启动');

    // 初始化隐私检查
    this.initPrivacyCheck();

    // 初始化认证服务
    this.initAuthService();

    // 检查登录状态
    this.checkLoginStatus();

    // 加载本地数据
    this.loadLocalData();
  },

  onShow: function (options) {
    console.log('小程序显示', options);
  },

  onHide: function () {
    console.log('小程序隐藏');
    // 保存数据
    this.saveLocalData();
  },

  initAuthService: function () {
    // 导入认证服务
    this.authService = require('./services/auth.service.js');
  },

  async checkLoginStatus() {
    try {
      if (this.authService) {
        const isLoggedIn = await this.authService.checkLoginStatus();
        console.log('登录状态检查结果:', isLoggedIn);
      } else {
        // 兼容旧版本检查
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo) {
          this.globalData.userInfo = userInfo;
          this.globalData.isLoggedIn = true;
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
    }
  },

  loadLocalData: function () {
    try {
      const favoriteList = wx.getStorageSync('favoriteList') || [];
      const settings =
        wx.getStorageSync('settings') || this.globalData.settings;
      const browseMode = wx.getStorageSync('browseMode') || 'swiper';

      this.globalData.favoriteList = favoriteList;
      this.globalData.settings = settings;
      this.globalData.browseMode = browseMode;
    } catch (e) {
      console.error('加载本地数据失败', e);
    }
  },

  saveLocalData: function () {
    try {
      wx.setStorageSync('favoriteList', this.globalData.favoriteList);
      wx.setStorageSync('settings', this.globalData.settings);
      wx.setStorageSync('browseMode', this.globalData.browseMode);
    } catch (e) {
      console.error('保存本地数据失败', e);
    }
  },

  // 全局方法
  login: function (userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('userInfo', userInfo);
  },

  logout: function () {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('userInfo');
  },

  addToFavorites: function (item) {
    const favorites = this.globalData.favoriteList;
    const index = favorites.findIndex(fav => fav.id === item.id);
    if (index === -1) {
      favorites.unshift(item);
      this.saveLocalData();
      return true;
    }
    return false;
  },

  removeFromFavorites: function (itemId) {
    const favorites = this.globalData.favoriteList;
    const index = favorites.findIndex(fav => fav.id === itemId);
    if (index !== -1) {
      favorites.splice(index, 1);
      this.saveLocalData();
      return true;
    }
    return false;
  },

  addToHistory: async function (item) {
    const history = this.globalData.apiService.user.getPlayHistory();
    const index = history.findIndex(h => h.id === item.id);

    // 如果已存在，先删除旧记录
    if (index !== -1) {
      history.splice(index, 1);
        await this.globalData.apiService.user.removeHistory(this.globalData.userInfo.id, item.id);
    }

    // 添加到开头
    history.unshift({
      ...item,
      playTime: new Date().getTime(),
    });
    await this.globalData.apiService.user.addHistory(this.globalData.userInfo.id, item);

    // 限制历史记录数量
    if (history.length > 100) {
      history.splice(100);
    }

    return history;
  },

  updateSettings: function (newSettings) {
    this.globalData.settings = {
      ...this.globalData.settings,
      ...newSettings,
    };
    this.saveLocalData();
  },

  // 模式切换方法
  switchBrowseMode: function () {
    const currentMode = this.globalData.browseMode;
    const newMode = currentMode === 'swiper' ? 'waterfall' : 'swiper';

    console.log(`切换浏览模式：${currentMode} -> ${newMode}`);

    this.globalData.browseMode = newMode;
    this.saveLocalData();

    // 更新tab栏图标
    this.updateTabBarIcon(newMode);

    return newMode;
  },

  // 更新tab栏图标
  updateTabBarIcon: function (mode) {
    try {
      const iconPath = mode === 'swiper'
        ? 'images/icons/browse-swiper.png'
        : 'images/icons/browse-waterfall.png';
      const selectedIconPath = mode === 'swiper'
      ? 'images/icons/browse-swiper.png'
      : 'images/icons/browse-waterfall.png';
        // ? 'images/icons/browse-swiper-active.png'
        // : 'images/icons/browse-waterfall-active.png';

      wx.setTabBarItem({
        index: 0,
        iconPath: iconPath,
        selectedIconPath: selectedIconPath,
        success: () => {
          console.log('tab栏图标更新成功');
        },
        fail: (error) => {
          console.error('tab栏图标更新失败:', error);
        }
      });
    } catch (error) {
      console.error('更新tab栏图标异常:', error);
    }
  },

  // 全局播放器控制方法
  showGlobalPlayer: function (podcastData) {
    this.globalData.globalPlayer.isVisible = true;
    this.globalData.globalPlayer.currentPodcast = podcastData;
  },

  hideGlobalPlayer: function () {
    this.globalData.globalPlayer.isVisible = false;
  },

  updateGlobalPlayerState: function (state) {
    this.globalData.globalPlayer = {
      ...this.globalData.globalPlayer,
      ...state,
    };
  },

  // 初始化全局隐私检查
  initPrivacyCheck: function () {
    // 检查基础库版本
    try {
      const appBaseInfo = wx.getAppBaseInfo();
      const SDKVersion = appBaseInfo.SDKVersion || '1.0.0';

      // 如果基础库版本过低，跳过隐私检查
      if (this.compareVersion(SDKVersion, '2.32.3') < 0) {
        console.warn('基础库版本过低，不支持隐私接口');
        return;
      }
    } catch (error) {
      console.warn('获取基础库版本失败，使用兼容模式:', error);
      // 如果新API不可用，回退到旧API
      try {
        const systemInfo = wx.getSystemInfoSync();
        const SDKVersion = systemInfo.SDKVersion || '1.0.0';
        if (this.compareVersion(SDKVersion, '2.32.3') < 0) {
          console.warn('基础库版本过低，不支持隐私接口');
          return;
        }
      } catch (fallbackError) {
        console.warn('获取系统信息失败，跳过隐私检查:', fallbackError);
        return;
      }
    }

    console.log('隐私检查初始化完成，使用微信原生授权流程');
  },

  // 版本比较函数
  compareVersion: function (version1, version2) {
    const v1 = version1.split('.');
    const v2 = version2.split('.');
    const len = Math.max(v1.length, v2.length);

    while (v1.length < len) {
      v1.push('0');
    }
    while (v2.length < len) {
      v2.push('0');
    }

    for (let i = 0; i < len; i++) {
      const num1 = parseInt(v1[i]);
      const num2 = parseInt(v2[i]);

      if (num1 > num2) {
        return 1;
      } else if (num1 < num2) {
        return -1;
      }
    }

    return 0;
  },
});
