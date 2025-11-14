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

        // 当前激活的底部tab索引：0=漫游 1=分类 2=我的
        activeTabIndex: 0,

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
        authService: require('./services/auth.service.js')

    },


    onLaunch: function () {
        console.log('达芬Qi说小程序启动');

        // 检查登录状态
        this.checkLoginStatus();

        // 加载本地数据
        this.loadLocalData();

        // 初始化全局播放器监听器容器（最小改动）
        this._globalPlayerListeners = [];
    },

    onShow: function (options) {
        console.log('小程序显示', options);
    },

    onHide: function () {
        console.log('小程序隐藏');
        // 保存数据
        this.saveLocalData();
    },

    // ===== 全局播放器：发布/订阅（最小改动，避免 TypeError） =====
    onGlobalPlayerChange: function (listener) {
        if (!this._globalPlayerListeners) this._globalPlayerListeners = [];
        if (typeof listener === 'function' && !this._globalPlayerListeners.includes(listener)) {
            this._globalPlayerListeners.push(listener);
        }
    },

    offGlobalPlayerChange: function (listener) {
        if (!this._globalPlayerListeners || !listener) return;
        const idx = this._globalPlayerListeners.indexOf(listener);
        if (idx !== -1) this._globalPlayerListeners.splice(idx, 1);
    },

    _emitGlobalPlayerChange: function () {
        if (!this._globalPlayerListeners || this._globalPlayerListeners.length === 0) return;
        const state = this.globalData.globalPlayer;
        this._globalPlayerListeners.slice().forEach(fn => {
            try {
                fn(state);
            } catch (e) {
                console.warn('globalPlayer listener error:', e);
            }
        });
    },


    async checkLoginStatus() {
        try {
            if (this.globalData.authService) {
                const isLoggedIn = await this.globalData.authService.checkLoginStatus();
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
            const iconPath =
                mode === 'swiper'
                    ? 'images/icons/browse-swiper.png'
                    : 'images/icons/browse-waterfall.png';
            const selectedIconPath =
                mode === 'swiper'
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
                fail: error => {
                    console.error('tab栏图标更新失败:', error);
                },
            });
        } catch (error) {
            console.error('更新tab栏图标异常:', error);
        }
    },

    // 全局播放器控制方法
    showGlobalPlayer: function (podcastData) {
        this.globalData.globalPlayer.isVisible = true;
        // 如果播客数据发生变化，使用setCurrentPodcast方法
        if (podcastData && this.globalData.globalPlayer.currentPodcast?.id !== podcastData.id) {
             this.setCurrentPodcast(podcastData);
        } else if (podcastData) {
            // 如果是相同播客，只更新globalPlayer状态
            this.globalData.globalPlayer.currentPodcast = podcastData;
        }
        // 广播更新
        this._emitGlobalPlayerChange();
    },

    hideGlobalPlayer: function () {
        this.globalData.globalPlayer.isVisible = false;
        // 广播更新
        this._emitGlobalPlayerChange();
    },

    updateGlobalPlayerState: function (state) {
        this.globalData.globalPlayer = {
            ...this.globalData.globalPlayer,
            ...state,
        };
        // 广播更新
        this._emitGlobalPlayerChange();
    },

    // 设置当前播客并自动记录播放历史
    setCurrentPodcast: async function (podcastData) {
        console.log('设置当前播客:', podcastData)
        // 检查是否真的有变化，避免重复记录
        const currentPodcastId = this.globalData.currentPodcast?.id;
        const newPodcastId = podcastData?.id;

        if (newPodcastId && newPodcastId !== currentPodcastId) {
            console.log('当前播客发生变化，准备记录播放历史', {
                from: currentPodcastId,
                to: newPodcastId
            });

            // 更新两个位置的currentPodcast状态
            this.globalData.currentPodcast = podcastData;
            this.globalData.globalPlayer.currentPodcast = podcastData;

            // 异步记录播放历史，不阻塞播放流程
            await this.recordPlayHistory(podcastData);
            // 广播更新
            this._emitGlobalPlayerChange();
        } else if (!podcastData) {
            // 如果传入null，清空当前播客
            this.globalData.currentPodcast = null;
            this.globalData.globalPlayer.currentPodcast = null;
            // 广播更新
            this._emitGlobalPlayerChange();
        }
    },


    async recordPlayHistory(podcast) {
      console.log("recordPlayHistory")
        try {
          const user = this.globalData.authService.getCurrentUser()
          if (user == null) {
            console.log('用户未登录，跳过播放历史记录');
            return;
          }
          if (!podcast || !podcast.id) return;
            console.log("记录的user:" + user)
            const userId = user.id;
            if (!userId) return; // 未登录不记录
            // 非阻塞调用
            const result = await this.globalData.apiService.user.addHistory(userId, podcast.id);
            if (result.success) {
                console.log('播放历史记录成功');
            } else {
                console.error('播放历史记录失败:', result.error);
            }
        } catch (_) {
        }
    },
   

});
