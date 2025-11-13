// 漫游页面逻辑
const app = getApp();
const apiService = require('../../services/api.service.js');
const audioPreloader = require('../../services/audio-preloader.service.js');
const authService = require('../../services/auth.service.js');
const {getImageUrl} = require('../../config/image-urls.js');

Page({
    data: {
        // 播放状态
        isPlaying: false,
        currentProgress: 0,
        maxProgress: 100,

        // 播客列表
        podcastList: [],
        currentIndex: 0,
        loading: true,

        // 自定义音频加载状态
        audioLoadingVisible: false,
        audioLoadingText: '加载播客...',

        // 分页和去重
        currentPage: 1,
        hasMoreData: true,
        loadedPodcastIds: [], // 已加载的播客ID数组

        // 音频相关
        audioContext: null,
        currentAudio: null,
        audioPosition: 0, // 当前播放位置（秒）
        audioDuration: 0, // 音频总时长（秒）
        audioLoading: false, // 音频是否正在加载

        // 时间显示
        currentTimeFormatted: '0:00',
        totalTimeFormatted: '0:00',

        // 防止自动滑动的标志
        lastUserInteraction: 0,
        isDraggingThumb: false,

        // 自动播放控制
        autoPlayOnSwipe: true, // 控制下滑后是否自动播放
        userGestureActive: false, // 是否有用户手势正在进行

        // CDN图片URL (带本地降级)
        cdnImages: {
            loadingIcon:
                'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/loading.svg',
        },

        // 评论相关状态
        commentList: [], // 评论列表
        floatingComment: null, // 悬浮播放条显示的评论
        showCommentPopup: false, // 是否显示评论弹窗
        commentInputText: '', // 评论输入内容
        replyingToCommentId: null, // 正在回复的评论ID
        floatingCommentTimer: null, // 评论轮换定时器

        // 更多操作弹窗相关状态
        showMorePopup: false, // 是否显示更多操作弹窗

        // 播放速度相关
        playbackSpeed: 1.0, // 当前播放速度

        // 智能降级和用户体验相关
        showLoginTip: false, // 显示登录提示
        loginTipMessage: '', // 登录提示消息
        isPersonalized: true, // 是否为个性化推荐

        // 个性化推荐相关
        personalizedRecommendations: [], // 个性化推荐列表
        recommendationsLoading: false, // 推荐加载状态
        recommendationMode: 'personalized', // 固定为个性化推荐模式

        // 双模式状态
        browseMode: 'swiper', // 'swiper' | 'waterfall'

        // 全局播放器状态
        globalPlayer: {
            isVisible: false,
            isPlaying: false,
            currentPodcast: null,
            currentProgress: 0,
        },

        // 安全区域
        safeAreaBottom: 0,
    },

    onLoad: function (options) {
        // 获取安全区域信息
        const systemInfo = wx.getSystemInfoSync();
        console.log('systemInfo: ' + systemInfo.safeArea);
        this.setData({
            safeAreaBottom: 0,
        });

        // 初始化当前模式
        const app = getApp();
        this.setData({
            browseMode: app.globalData.browseMode,
            globalPlayer: app.globalData.globalPlayer,
        });

        // 初始化音频上下文
        this.initAudioContext();

        // 获取用户个性化推荐（带智能降级）
        this.loadPersonalizedRecommendations();

        // 处理来自搜索页面的播客跳转
        if (options.podcastId) {
            console.log('接收到搜索跳转播客ID:', options.podcastId);
            this.handlePodcastFromSearch(
                options.podcastId,
                options.autoPlay === 'true'
            );
        } else {
            // 正常加载播客数据
            this.loadPodcastData();
        }

    },

    // 处理Tab栏点击
    onTabItemTap: function (item) {
        console.log('点击Tab栏:', item)
        if (item.index === 0) {
            // 点击漫游tab，切换模式
            console.log('点击漫游tab，切换浏览模式');
            this.switchBrowseMode();
        }
    },

    // 切换浏览模式（带动画）
    switchBrowseMode: function () {
        const app = getApp();
        const currentMode = app.globalData.browseMode;
        const newMode = currentMode === 'swiper' ? 'waterfall' : 'swiper';

        console.log('切换浏览模式:', currentMode, '->', newMode);

        // 设置切换动画
        this.setModeTransition(currentMode, newMode);

        // 更新全局状态
        app.globalData.browseMode = newMode;

        // 延迟切换数据，等待动画开始
        setTimeout(() => {
            this.setData({
                browseMode: newMode,
            });

            // 更新Tab栏图标
            app.updateTabBarIcon(newMode);
        }, 150); // 动画开始后150ms切换数据

        return newMode;
    },

    // 设置模式切换动画
    setModeTransition: function (oldMode, newMode) {
        // 性能优化：使用requestAnimationFrame
        wx.nextTick(() => {
            // 添加切换动画类
            const query = this.createSelectorQuery();

            if (oldMode === 'swiper') {
                query.select('.swiper-mode').boundingClientRect();
            } else {
                query.select('.waterfall-mode').boundingClientRect();
            }

            query.exec(res => {
                if (res[0]) {
                    // 触发动画逻辑
                    console.log('切换动画已启动:', oldMode, '->', newMode);
                }
            });
        });
    },

    // 处理播客数据（优化版）
    async processPodcastData(rawData) {
        return new Promise(resolve => {
            // 使用setTimeout模拟异步处理，避免阻塞主线程
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

    // 节流版本的数据重新分配
    throttledRedistributeData: function (waterfallList) {
        // 简单的节流实现
        if (this._redistributeTimer) {
            clearTimeout(this._redistributeTimer);
        }

        this._redistributeTimer = setTimeout(() => {
            this.redistributeWaterfallData(waterfallList);
        }, 100);
    },

    // 重新分配瀑布流双列数据
    redistributeWaterfallData(waterfallList) {
        const leftColumn = [];
        const rightColumn = [];

        // 简单的交替分配算法
        waterfallList.forEach((item, index) => {
            if (index % 2 === 0) {
                leftColumn.push(item);
            } else {
                rightColumn.push(item);
            }
        });

        this.setData({
            leftColumnList: leftColumn,
            rightColumnList: rightColumn,
        });

        console.log('双列数据分配完成:', {
            left: leftColumn.length,
            right: rightColumn.length,
        });
    },

    // 智能降级的个性化推荐加载
    async loadPersonalizedRecommendations() {
        const userInfo = authService.getCurrentUser();
        this.setData({recommendationsLoading: true});

        // 智能降级逻辑：优先尝试个性化推荐
        if (userInfo) {
            console.log('个性化未实现');
            // console.log('尝试加载个性化推荐');
            // const result =
            //   await apiService.recommendation.getPersonalizedRecommendations(
            //     userInfo.id,
            //     {
            //       algorithm: 'hybrid',
            //       count: 20,
            //       includeReasons: true,
            //     }
            //   );

            // if (result.success) {
            //   this.setData({
            //     personalizedRecommendations: result.data || [],
            //     recommendationsLoading: false,
            //     isPersonalized: true,
            //   });
            //   console.log('个性化推荐加载成功');
            //   return;
            // } else if (result.needLogin) {
            //   console.log('个性化推荐需要登录，降级到热门推荐');
            //   this.showLoginTip('登录后可获得个性化推荐');
            // } else {
            //   console.warn('个性化推荐加载失败，降级到热门推荐:', result.error);
            // }
        } else {
            console.log('用户未登录，直接使用热门推荐');
        }

        // 降级到热门推荐
        await this.loadPopularRecommendations();
    },

    // 热门推荐降级方案
    async loadPopularRecommendations() {
        try {
            // console.log('加载热门推荐作为降级方案');
            // console.log()
            // const result =
            //   await apiService.recommendation.getPopularRecommendations(20);

            const result = {
                success: false,
            };
            if (result.success) {
                this.setData({
                    personalizedRecommendations: result.data || [],
                    recommendationsLoading: false,
                    isPersonalized: false,
                });
                console.log('热门推荐加载成功');
            } else {
                console.warn('热门推荐加载失败，使用静态内容');
                this.showStaticContent();
            }
        } catch (error) {
            console.error('热门推荐加载异常，使用静态内容:', error);
            this.showStaticContent();
        }
    },

    // 最后的降级：显示静态内容
    showStaticContent() {
        this.setData({
            personalizedRecommendations: [],
            recommendationsLoading: false,
            isPersonalized: false,
        });
        console.log('使用静态内容作为最后降级方案');
    },

    // 显示友好的登录提示
    showLoginTip(message) {
        this.setData({
            showLoginTip: true,
            loginTipMessage: message,
        });

        // 3秒后自动隐藏
        setTimeout(() => {
            this.setData({showLoginTip: false});
        }, 3000);
    },

    // 处理登录提示点击
    handleLoginTip: function () {
        wx.navigateTo({
            url: '/pages/login/login',
        });
    },

    // 处理推荐点击
    handleRecommendationClick: async function (e) {
        const podcast = e.currentTarget.dataset.podcast;
        console.log('点击推荐播客:', podcast.title);

        // 跳转到对应的播客
        const targetIndex = this.data.podcastList.findIndex(
            item => item.id === podcast.id
        );

        if (targetIndex >= 0) {
            // 播客在当前列表中，直接跳转
            this.setData({currentIndex: targetIndex});
        } else {
            // 播客不在当前列表中，插入到当前位置
            const currentList = [...this.data.podcastList];
            const currentIndex = this.data.currentIndex;

            // 在当前位置后插入推荐播客
            currentList.splice(currentIndex + 1, 0, podcast);

            this.setData({
                podcastList: currentList,
                currentIndex: currentIndex + 1,
                loadedPodcastIds: [...this.data.loadedPodcastIds, podcast.id],
            });

            // 自动播放插入的播客
            setTimeout(() => {
                this.triggerAutoPlay();
            }, 500);
        }
        const user = authService.getCurrentUser();
        // 记录推荐点击行为，用于优化推荐算法（使用防护代码）
        try {
            // 防护检查：确保方法存在

            await apiService.recommendation.recordRecommendationClick(
                user.id,
                podcast.id,
                null, // recommendationId
                null, // position
                podcast.algorithm || 'unknown'
            );
            console.log('推荐点击行为已记录:', podcast.id);
        } catch (error) {
            console.error('记录推荐点击失败:', error);
            // 点击记录失败不影响主要功能
        }
    },

    // 处理来自搜索页面的播客
    async handlePodcastFromSearch(podcastId, shouldAutoPlay = false) {
        console.log('处理搜索跳转播客:', podcastId, '自动播放:', shouldAutoPlay);

        // 显示加载状态
        this.setData({
            loading: true,
            audioLoadingVisible: true,
            audioLoadingText: '正在加载播客...',
        });

        // 先加载正常的播客列表
        await this.loadPodcastData();

        // 查找指定的播客
        const targetIndex = this.data.podcastList.findIndex(
            podcast => podcast.id === podcastId
        );

        if (targetIndex >= 0) {
            // 播客在列表中，直接跳转
            console.log('播客在列表中，跳转到索引:', targetIndex);
            this.setData({
                currentIndex: targetIndex,
                loading: false,
                audioLoadingVisible: false,
            });

            // 如果需要自动播放
            if (shouldAutoPlay) {
                setTimeout(() => {
                    console.log('开始自动播放搜索的播客');
                    this.triggerAutoPlay();
                }, 500);
            }
        } else {
            // 播客不在列表中，需要单独获取并插入
            console.log('播客不在当前列表中，获取播客详情');
            await this.fetchAndInsertPodcast(podcastId, shouldAutoPlay);
        }
    },

    // 获取并插入特定播客到列表
    async fetchAndInsertPodcast(podcastId, shouldAutoPlay = false) {
            const apiService = require('../../services/api.service.js');
            const result = await apiService.podcast.getDetail(podcastId);

            if (result.success && result.data) {
                const podcast = result.data;
                console.log('获取到播客详情:', podcast.title);

                // 将播客插入到列表开头
                const updatedList = [podcast, ...this.data.podcastList];
                const updatedIds = [podcast.id, ...this.data.loadedPodcastIds];

                this.setData({
                    podcastList: updatedList,
                    loadedPodcastIds: updatedIds,
                    currentIndex: 0, // 设置为第一个
                    loading: false,
                    audioLoadingVisible: false,
                });

                // 如果需要自动播放
                if (shouldAutoPlay) {
                    setTimeout(() => {
                        console.log('开始自动播放插入的播客');
                        this.triggerAutoPlay();
                    }, 500);
                }
            } else {
                throw new Error('获取播客详情失败');
            }

    },

    onShow: function () {
        console.log('漫游页面显示');

        // 页面进入动画
        this.enterAnimation();

        // 延迟检查全局播客状态，确保数据加载完成
        setTimeout(() => {
            this.checkGlobalPodcastState();
        }, 200);
    },

    // 检查全局播客状态
    checkGlobalPodcastState: function () {
        const globalData = app.globalData;

        // 如果有指定的播客需要播放
        if (globalData.currentPodcast && globalData.currentPodcast.id) {
            console.log(
                '检测到全局播客状态，准备播放:',
                globalData.currentPodcast.title
            );
            console.log('全局播客数据:', globalData.currentPodcast);

            // 查找该播客在当前列表中的位置
            const targetPodcastId = globalData.currentPodcast.id;
            const currentList = this.data.podcastList;
            console.log('当前播客列表长度:', currentList.length);
            const targetIndex = currentList.findIndex(
                podcast => podcast.id === targetPodcastId
            );

            if (targetIndex >= 0) {
                // 播客在当前列表中，直接切换到该播客
                console.log('播客在当前列表中，切换到索引:', targetIndex);
                this.setData({
                    currentIndex: targetIndex,
                });
                // 自动播放
                setTimeout(() => {
                    this.triggerAutoPlay();
                }, 500);
            } else {
                // 播客不在当前列表中，将其插入到列表开头
                console.log('播客不在当前列表中，插入到列表开头');

                // 确保播客数据格式正确
                const channelName =
                    globalData.currentPodcast.channel_name || '奇绩前沿信号';
                const formattedPodcast = {
                    ...globalData.currentPodcast,
                    isFavorited: false,
                    isLiked: false,
                    isThumbsUp: false,
                    cover_url: this.getPodcastCoverUrl(
                        channelName,
                        globalData.currentPodcast.cover_url
                    ),
                    channel_name: channelName,
                };

                console.log('格式化的播客数据:', formattedPodcast);

                const finalList = [formattedPodcast, ...currentList];

                this.setData(
                    {
                        podcastList: finalList,
                        currentIndex: 0,
                        loading: false,
                    },
                    () => {
                        console.log('播客列表已更新，当前索引:', this.data.currentIndex);
                        // 自动播放新插入的播客
                        setTimeout(() => {
                            this.triggerAutoPlay();
                        }, 500);
                    }
                );
            }

            // 清除全局状态，避免重复处理（使用新方法）
            app.setCurrentPodcast(null);
        } else {
            console.log('没有检测到全局播客状态');
        }
    },

    // 页面进入动画
    enterAnimation: function () {
        const query = this.createSelectorQuery();
        query.select('.browse-container').boundingClientRect();
        query.exec(res => {
            if (res[0]) {
                // 可以在这里添加进入动画逻辑
                console.log('页面进入动画完成');
            }
        });
    },

    onHide: function () {
        console.log('漫游页面隐藏');

        // 保存播放进度
        this.savePlayProgress();
    },

    onUnload: function () {
        console.log('漫游页面卸载');

        // 保存播放进度
        this.savePlayProgress();

        // 清理定时器
        this.cleanupTimers();

        // 销毁音频上下文
        if (
            this.data.audioContext &&
            typeof this.data.audioContext.destroy === 'function'
        ) {
            this.data.audioContext.destroy();
        }

        // 清理预加载资源
        this.cleanupPreloadedAudio();
        audioPreloader.destroyAll();

    },

    // 清理定时器和内存
    cleanupTimers: function () {
        // 清理重新分配定时器
        if (this._redistributeTimer) {
            clearTimeout(this._redistributeTimer);
            this._redistributeTimer = null;
        }

        // 清理评论轮换定时器
        if (this.data.floatingCommentTimer) {
            clearInterval(this.data.floatingCommentTimer);
            this.setData({floatingCommentTimer: null});
        }

        // 清理其他定时器
        console.log('页面定时器已清理');
    },

    // 页面性能监控
    onPagePerformance: function () {
        // 简单的性能监控
        const performance = wx.getPerformance ? wx.getPerformance() : null;
        if (performance) {
            console.log('页面性能数据:', {
                navigationStart: performance.navigationStart,
                loadEventEnd: performance.loadEventEnd,
                loadTime: performance.loadEventEnd - performance.navigationStart,
            });
        }
    },

    // 获取当前用户ID
    getCurrentUserId() {
        try {
            // 如果全局状态没有，尝试从本地存储获取
            return authService.getCurrentUser().id;
        } catch (error) {
            console.info('无法获取 userId，返回 null:', error);
            return null;
        }
    },

    // 根据频道名称获取对应的封面URL
    getPodcastCoverUrl: function (channelName, originalCoverUrl) {
        // 如果已经有完整的URL，且不是默认封面，则直接使用
        if (
            originalCoverUrl &&
            originalCoverUrl.startsWith('https://') &&
            !originalCoverUrl.includes('default-cover')
        ) {
            return originalCoverUrl;
        }

        // 根据频道名称映射对应的PNG封面
        const baseUrl =
            'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/podcast_cover/';

        if (channelName && channelName.includes('奇绩前沿信号')) {
            return baseUrl + 'miracleplus_signal.png';
        } else if (channelName && channelName.includes('经典论文解读')) {
            return baseUrl + 'classic_paper_interpretation.png';
        } else {
            // 默认使用奇绩前沿信号封面
            return baseUrl + 'miracleplus_signal.png';
        }
    },

    // 初始化音频上下文
    initAudioContext: function () {
        const audioContext = wx.createInnerAudioContext();
        this.rebindAudioEvents(audioContext);
        this.setData({audioContext});
    },

    // 重新绑定音频事件监听器
    rebindAudioEvents: function (audioContext) {
        // 音频事件监听
        audioContext.onPlay(() => {
            console.log('音频事件：开始播放');
            this.setData({
                isPlaying: true,
                audioLoading: false,
            });
            app.setCurrentPodcast(this.data.podcastList[this.data.currentIndex]);
        });

        audioContext.onPause(() => {
            console.log('音频事件：暂停播放');
            this.setData({
                isPlaying: false,
                audioLoading: false,
            });
        });

        audioContext.onStop(() => {
            console.log('音频事件：停止播放');
            this.setData({
                isPlaying: false,
                currentProgress: 0,
                audioPosition: 0,
                audioLoading: false,
            });
        });

        audioContext.onTimeUpdate(() => {
            const currentTime = audioContext.currentTime || 0;
            const duration = audioContext.duration || 0;

            if (duration > 0 && !this.data.isDraggingThumb) {
                const progress = (currentTime / duration) * 100;
                const progressRatio = currentTime / duration;

                this.setData({
                    currentProgress: Math.min(100, Math.max(0, progress)),
                    audioPosition: currentTime,
                    audioDuration: duration,
                    currentTimeFormatted: this.formatTime(currentTime),
                    totalTimeFormatted: this.formatTime(duration),
                });

                // 触发预加载检查（增强版：支持分块预加载）
                audioPreloader.onProgressUpdate(
                    progressRatio,
                    this.data.currentIndex,
                    currentTime
                );
            }
        });

        audioContext.onEnded(() => {
            console.log('音频播放结束');
            this.setData({
                isPlaying: false,
                currentProgress: 100,
                audioLoading: false,
            });
        });

        audioContext.onError(res => {
            console.error('音频播放错误:', res);
            this.setData({
                isPlaying: false,
                audioLoading: false,
            });
            // 如果是自动播放导致的错误，提示更友好
            const errorMsg = this.data.autoPlayOnSwipe
                ? '自动播放失败，请手动点击播放'
                : '播放失败: ' + (res.errMsg || '未知错误');
            wx.showToast({
                title: errorMsg,
                icon: 'none',
                duration: 3000,
            });
        });

        audioContext.onCanplay(() => {
            console.log('音频可以播放');
            const duration = audioContext.duration;
            if (duration > 0) {
                this.setData({
                    audioDuration: duration,
                    totalTimeFormatted: this.formatTime(duration),
                    audioLoading: false,
                });
            }
        });

        audioContext.onWaiting(() => {
            console.log('音频加载中');
            this.setData({audioLoading: true});
        });
    },

    // 加载播客数据
    async loadPodcastData(loadMore = false) {
        try {
            this.setData({loading: true});

            const page = loadMore ? this.data.currentPage + 1 : 1;

            // 从Supabase数据库加载播客数据
            const result = await this.fetchPodcastsFromDatabase(page);

            if (result.success && result.data.length > 0) {
                // 去重处理
                const newPodcasts = result.data.filter(
                    podcast => !this.data.loadedPodcastIds.includes(podcast.id)
                );

                // 转换数据格式并检查收藏状态
                const newPodcastList = await Promise.all(
                    newPodcasts.map(async podcast => {
                        const channelName = podcast.channels
                            ? podcast.channels.name
                            : podcast.channel_name || '奇绩前沿信号';

                        // 检查收藏状态
                        let isFavorited = false;
                        try {
                            // 首先检查全局状态
                            const app = getApp();
                            const favoriteList = app.globalData.favoriteList || [];
                            isFavorited = favoriteList.some(fav => fav.id === podcast.id);

                            // 如果用户已登录，也检查数据库状态（但不等待）
                            const userId = this.getCurrentUserId();
                            if (userId && !isFavorited) {
                                const audioService = require('../../services/audio.service.js');
                                audioService
                                    .checkIsFavorited(userId, podcast.id)
                                    .then(dbFavorited => {
                                        if (dbFavorited && !isFavorited) {
                                            // 如果数据库显示已收藏但本地没有，更新本地状态
                                            console.log(
                                                '发现数据库收藏状态不同步，更新本地状态:',
                                                podcast.title
                                            );
                                            this.updatePodcastFavoriteState(podcast.id, true);
                                        }
                                    })
                                    .catch(error => {
                                        console.warn('检查数据库收藏状态失败:', error);
                                    });
                            }
                        } catch (error) {
                            console.warn('检查收藏状态失败:', error);
                        }

                        return {
                            id: podcast.id,
                            title: podcast.title,
                            description: podcast.description,
                            audio_url: podcast.audio_url,
                            cover_url: this.getPodcastCoverUrl(
                                channelName,
                                podcast.cover_url
                            ),
                            channel_name: channelName,
                            duration: podcast.duration || 0,
                            play_count: podcast.play_count || 0,
                            like_count: podcast.like_count || 0,
                            favorite_count: podcast.favorite_count || 0,
                            created_at: podcast.created_at,
                            isLiked: false,
                            isFavorited: isFavorited,
                            isThumbsUp: false,
                        };
                    })
                );

                // 更新已加载的播客ID数组
                const updatedIds = [...this.data.loadedPodcastIds];
                newPodcasts.forEach(podcast => {
                    if (!updatedIds.includes(podcast.id)) {
                        updatedIds.push(podcast.id);
                    }
                });

                console.log('新加载播客数据:', newPodcastList.length, '条 (去重后)');
                console.log('总计已加载ID数:', updatedIds.length);

                // 合并数据
                const finalPodcastList = loadMore
                    ? [...this.data.podcastList, ...newPodcastList]
                    : newPodcastList;

                this.setData({
                    podcastList: finalPodcastList,
                    loadedPodcastIds: updatedIds,
                    currentPage: page,
                    hasMoreData: newPodcastList.length > 0,
                    loading: false,
                    // 确保初始状态是重置的（仅首次加载）
                    ...(loadMore
                        ? {}
                        : {
                            audioPosition: 0,
                            currentProgress: 0,
                            audioDuration: 0,
                            isPlaying: false,
                            currentIndex: 0,
                        }),
                });

                // 首次加载时，加载第一个播客的播放进度
                if (!loadMore) {
                    // 获取第一个播客的时长信息用于初始化
                    const firstPodcast = finalPodcastList[0];
                    const initialDuration = firstPodcast?.duration || 0;

                    // 确保在加载进度前先重置所有播放状态
                    this.setData({
                        currentProgress: 0,
                        audioPosition: 0,
                        currentTimeFormatted: '0:00',
                        totalTimeFormatted:
                            initialDuration > 0 ? this.formatTime(initialDuration) : '0:00',
                        audioDuration: initialDuration,
                        isPlaying: false,
                    });

                    this.loadPlayProgress(0);

                    // 初始化音频预加载服务
                    audioPreloader.initialize(finalPodcastList, 0);
                } else {
                    // 更新预加载服务的播客列表
                    audioPreloader.podcastList = finalPodcastList;
                }
            } else {
                console.error('播客数据加载失败:', result);

                // 提供更详细的错误信息
                let errorMsg = '没有找到播客数据';
                if (result.error) {
                    errorMsg = result.error;
                } else if (result.data && result.data.length === 0) {
                    errorMsg = '数据库中暂无播客内容';
                }

                wx.showModal({
                    title: '数据加载失败',
                    content: errorMsg + '\n请检查网络连接或联系技术支持',
                    showCancel: false,
                    confirmText: '重试',
                    success: res => {
                        if (res.confirm) {
                            this.loadPodcastData();
                        }
                    },
                });

                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('加载播客数据失败:', error);
            this.setData({loading: false});
            wx.showToast({
                title: '加载失败: ' + error.message,
                icon: 'none',
            });
        }
    },

    // 从Supabase数据库获取播客数据
    async fetchPodcastsFromDatabase(page = 1) {
        try {
            const result = await apiService.podcast.list({
                page: page,
                limit: 10,
                order_by: 'created_at',
                order_direction: 'desc',
            });

            console.log('AudioService响应:', result);

            if (result.success) {
                // 处理返回的数据，修复音频URL
                const data = result.data.map(item => {
                    let audioUrl = item.audio_url;

                    // 如果是相对路径，转换为完整的Supabase Storage URL
                    if (audioUrl && audioUrl.startsWith('/')) {
                        audioUrl = `https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/podcast-audios${audioUrl}`;
                    }
                    // 如果URL不完整，添加Supabase域名
                    else if (audioUrl && !audioUrl.startsWith('http')) {
                        audioUrl = `https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/podcast-audios/${audioUrl}`;
                    }

                    return Object.assign({}, item, {
                        audio_url: audioUrl,
                        channel_name: item.channels ? item.channels.name : '奇绩前沿信号',
                    });
                });

                console.log('处理后的播客数据:', data);

                return {
                    success: true,
                    data,
                };
            } else {
                throw new Error(result.error || '获取播客数据失败');
            }
        } catch (error) {
            console.error('从数据库获取播客数据失败:', error);
            return {
                success: false,
                error: error.message || '网络请求失败',
                data: [],
            };
        }
    },

    // 处理触摸开始
    handleTouchStart: function (e) {
        console.log('用户开始触摸swiper');
        const now = Date.now();
        this.setData({
            lastUserInteraction: now,
            userGestureActive: true,
        });
    },

    // 处理触摸移动
    handleTouchMove: function (e) {
        console.log('用户正在滑动swiper');
        this.setData({lastUserInteraction: Date.now()});
    },

    // 处理Swiper切换
    handleSwiperChange: function (e) {
        const currentIndex = e.detail.current;
        const oldIndex = this.data.currentIndex;
        const now = Date.now();
        const {podcastList, hasMoreData} = this.data;

        // 更严格的用户交互检查：必须是用户手势触发
        const timeSinceLastInteraction = now - this.data.lastUserInteraction;
        if (timeSinceLastInteraction > 1000 || !this.data.userGestureActive) {
            console.log('BLOCKED: 非用户触发的滑动，已阻止');
            return;
        }

        // 如果索引没有变化，直接返回
        if (currentIndex === oldIndex) {
            console.log('索引未变化，跳过处理');
            return;
        }

        // 检查是否需要加载更多数据（接近列表末尾时）
        if (
            currentIndex >= podcastList.length - 2 &&
            hasMoreData &&
            !this.data.loading
        ) {
            console.log('接近列表末尾，加载更多数据');
            this.loadPodcastData(true); // 加载更多
        }

        // 保存上一个播客的播放进度
        this.savePlayProgress();

        // 停止当前播放
        if (this.data.audioContext) {
            this.data.audioContext.stop();
        }

        // 更新当前索引并重置播放状态（但不清空音频源）
        const currentPodcast = podcastList[currentIndex];
        const podcastDuration = currentPodcast?.duration || 0;

        this.setData({
            currentIndex,
            isPlaying: false,
            currentProgress: 0,
            audioPosition: 0,
            audioDuration: podcastDuration,
            currentTimeFormatted: '0:00',
            totalTimeFormatted:
                podcastDuration > 0 ? this.formatTime(podcastDuration) : '0:00',
            userGestureActive: false, // 重置手势状态
        });

        // 加载新播客的评论
        if (currentPodcast && currentPodcast.id) {
            this.loadFloatingComment(currentPodcast.id);
        }

        // 更新预加载服务的当前位置
        audioPreloader.updateCurrentIndex(currentIndex);

        // 加载新播客的播放进度（延迟执行，确保状态更新完成）
        setTimeout(() => {
            this.loadPlayProgress(currentIndex);
        }, 100);

        // 标题滚动现在使用纯CSS实现，无需JavaScript干预

        // 自动播放新播客（仅在启用自动播放时）
        if (this.data.autoPlayOnSwipe && podcastList[currentIndex]) {
            console.log(
                '🎵 触发自动播放 - 当前播客:',
                podcastList[currentIndex].title
            );
            // 短暂延迟确保UI状态更新完成
            setTimeout(() => {
                this.triggerAutoPlay();
            }, 300);
        }
    },

    // 处理播放/暂停
    handlePlayPause: function () {
        const {audioContext, isPlaying, podcastList, currentIndex} = this.data;

        if (!audioContext || !podcastList.length) {
            console.error('音频上下文或播客列表为空');
            wx.showToast({
                title: '播放器初始化失败',
                icon: 'none',
            });
            return;
        }

        const currentPodcast = podcastList[currentIndex];
        if (!currentPodcast || !currentPodcast.audio_url) {
            console.error('当前播客数据无效');
            wx.showToast({
                title: '播客数据无效',
                icon: 'none',
            });
            return;
        }

        if (isPlaying) {
            // 暂停播放
            console.log('用户点击暂停，执行暂停操作');
            audioContext.pause();
        } else {
            // 开始播放
            console.log('用户点击播放，执行播放操作');
            this.startPlayback(currentPodcast);
        }
    },

    // 开始播放的统一处理函数
    startPlayback: function (currentPodcast) {
        const {audioContext} = this.data;

        // 检查是否需要切换音频源
        const currentSrc = audioContext.src || '';
        const newSrc = currentPodcast.audio_url;
        const isNewAudio = currentSrc !== newSrc;

        if (isNewAudio) {
            console.log('需要切换音频源');
            this.switchAudioSource(currentPodcast, newSrc);
        } else {
            // 继续播放当前音频
            console.log('继续播放当前音频');
            this.hideCustomLoading();

            // 如果有保存的播放进度且还未应用，先应用进度
            if (this.savedProgress && this.savedProgress > 0) {
                console.log('应用保存的播放进度:', this.savedProgress);
                audioContext.seek(this.savedProgress);
                this.savedProgress = 0;
            }

            audioContext.play();
        }

        // 触发音频预加载机制
        this.triggerPreloading();
    },

    // 切换音频源的处理函数
    switchAudioSource: function (currentPodcast, newSrc) {
        const {audioContext} = this.data;

        // 检查是否有预加载的音频
        const preloadedAudio = audioPreloader.getPreloadedAudio(newSrc);

        if (preloadedAudio) {
            console.log('🚀 使用预加载音频，快速切换');
            this.usePreloadedAudio(preloadedAudio);
        } else {
            console.log('📱 标准音频加载流程');
            this.loadNewAudio(audioContext, newSrc);
        }
    },

    // 使用预加载音频
    usePreloadedAudio: function (preloadedAudio) {
        const {audioContext} = this.data;

        this.hideCustomLoading();

        // 停止当前音频
        audioContext.stop();

        // 销毁当前音频上下文，使用预加载的
        if (audioContext && typeof audioContext.destroy === 'function') {
            audioContext.destroy();
        }

        // 使用预加载的音频上下文
        this.setData({audioContext: preloadedAudio});

        // 重新绑定事件监听器
        this.rebindAudioEvents(preloadedAudio);

        // 如果有保存的播放进度，跳转到指定位置
        if (this.savedProgress && this.savedProgress > 0) {
            console.log('恢复预加载音频播放进度到:', this.savedProgress);
            preloadedAudio.seek(this.savedProgress);
            this.savedProgress = 0;
        }

        // 立即播放
        preloadedAudio.play();
    },

    // 加载新音频
    loadNewAudio: function (audioContext, newSrc) {
        // 停止当前音频
        audioContext.stop();

        // 设置新的音频源
        audioContext.src = newSrc;

        // 重置播放状态
        this.setData({
            audioDuration: 0,
            totalTimeFormatted: '0:00',
        });

        let loadingHandled = false;

        // 添加音频加载超时处理 - 减少到6秒
        const loadingTimeout = setTimeout(() => {
            if (!loadingHandled) {
                loadingHandled = true;
                this.hideCustomLoading();
                this.setData({isPlaying: false});

                console.error('音频加载超时，尝试重新加载');
                this.retryAudioLoading(audioContext, newSrc);
            }
        }, 6000);

        // 监听首次canplay事件
        const onCanplayOnce = () => {
            if (loadingHandled) return;
            loadingHandled = true;

            clearTimeout(loadingTimeout);
            this.hideCustomLoading();
            audioContext.offCanplay(onCanplayOnce);

            console.log('音频加载完成，可以播放');

            // 如果有保存的播放进度，跳转到指定位置
            if (this.savedProgress && this.savedProgress > 0) {
                console.log('恢复播放进度到:', this.savedProgress);
                audioContext.seek(this.savedProgress);
                this.savedProgress = 0;
            }
        };

        audioContext.onCanplay(onCanplayOnce);

        // 开始播放
        audioContext.play();
    },

    // 重试音频加载
    retryAudioLoading: function (audioContext, audioUrl) {
        console.log('重试加载音频:', audioUrl);

        wx.showModal({
            title: '加载失败',
            content: '音频加载超时，是否重试？',
            confirmText: '重试',
            cancelText: '取消',
            success: res => {
                if (res.confirm) {
                    // 重新创建音频上下文
                    const newAudioContext = wx.createInnerAudioContext({
                        useWebAudioImplement: false
                    });
                    this.setData({audioContext: newAudioContext});
                    this.rebindAudioEvents(newAudioContext);

                    // 重新开始加载
                    this.loadNewAudio(newAudioContext, audioUrl);
                }
            },
        });
    },

    // ========== Slider 交互事件处理 ==========

    // Slider 开始拖拽
    handleSliderTouchStart: function (e) {
        console.log('Slider 拖拽开始');
        this.setData({
            isDraggingThumb: true,
            lastUserInteraction: Date.now(),
        });
    },

    // Slider 拖拽结束（类似 Vue 的 @change）
    handleSliderChange: function (e) {
        const {audioContext, audioDuration} = this.data;

        if (!audioContext || !audioDuration) return;

        const percentage = e.detail.value;
        const seekTime = (percentage / 100) * audioDuration;

        // 拖拽结束时才真正seek音频
        // audioContext.seek(seekTime);

        this.setData({
            currentProgress: percentage,
            audioPosition: seekTime,
            currentTimeFormatted: this.formatTime(seekTime),
        });

        console.log('Slider 跳转到时间:', seekTime + '秒');
    },

    // Slider 拖拽结束
    handleSliderTouchEnd: function (e) {
        console.log('Slider 拖拽结束');
        this.setData({
            isDraggingThumb: false,
        });
        const {audioContext, audioDuration} = this.data;

        if (!audioContext || !audioDuration) return;

        const percentage = e.detail.value;
        const seekTime = (percentage / 100) * audioDuration;
        audioContext.seek(seekTime);
    },

    // 处理后退15秒
    handleRewind: function () {
        const {audioContext, audioPosition} = this.data;

        if (!audioContext) return;

        const newPosition = Math.max(0, audioPosition - 15);
        audioContext.seek(newPosition);

        // 立即更新UI状态，即使在暂停状态下
        this.setData({
            audioPosition: newPosition,
            currentProgress: (newPosition / this.data.audioDuration) * 100,
            currentTimeFormatted: this.formatTime(newPosition),
        });

        console.log('后退15秒到:', newPosition);
    },

    // 处理前进30秒
    handleFastForward: function () {
        const {audioContext, audioPosition, audioDuration} = this.data;

        if (!audioContext) return;

        const newPosition = Math.min(audioDuration, audioPosition + 30);
        audioContext.seek(newPosition);

        // 立即更新UI状态，即使在暂停状态下
        this.setData({
            audioPosition: newPosition,
            currentProgress: (newPosition / audioDuration) * 100,
            currentTimeFormatted: this.formatTime(newPosition),
        });

        console.log('前进30秒到:', newPosition);
    },

    // 处理收藏 - 要求用户先登录
    handleFavorite() {
        const {currentIndex, podcastList} = this.data;
        const currentPodcast = podcastList[currentIndex];

        if (!currentPodcast) {
            wx.showToast({
                title: '播客信息获取失败',
                icon: 'none',
                duration: 1500,
            });
            return;
        }

        // 关闭更多操作弹窗
        this.setData({showMorePopup: false});

        // 检查用户登录状态
        const loginStatus = authService.checkLoginStatus();
        if (!loginStatus) {
            // 未登录用户，引导登录
            wx.showModal({
                title: '需要登录',
                content: '收藏功能需要登录后使用，是否前往登录？',
                confirmText: '去登录',
                cancelText: '取消',
                success: res => {
                    if (res.confirm) {
                        wx.navigateTo({
                            url: '/pages/login/login',
                        });
                    }
                },
            });
            return;
        }

        const newIsFavorited = !currentPodcast.isFavorited;

        // 立即更新UI状态（乐观更新）
        const updatedPodcastList = [...podcastList];
        updatedPodcastList[currentIndex] = {
            ...currentPodcast,
            isFavorited: newIsFavorited,
        };

        this.setData({
            podcastList: updatedPodcastList,
        });

        // 立即给用户轻提示反馈
        wx.showToast({
            title: newIsFavorited ? '已添加到收藏' : '已取消收藏',
            icon: 'success',
            duration: 1500,
        });

        // 同时更新全局状态
        const app = getApp();
        if (newIsFavorited) {
            app.addToFavorites({
                id: currentPodcast.id,
                title: currentPodcast.title,
                cover_url: currentPodcast.cover_url,
                channel: currentPodcast.channel_name,
                favoriteTime: Date.now(),
            });
        } else {
            app.removeFromFavorites(currentPodcast.id);
        }

        // 异步处理数据库操作
        this.updateFavoriteStatus(
            currentPodcast.id,
            newIsFavorited,
            this.getCurrentUserId()
        );
    },

    // 异步更新收藏状态到数据库（仅登录用户）
    async updateFavoriteStatus(podcastId, isFavorited, userId) {
        try {
            const audioService = require('../../services/audio.service.js');

            // 执行数据库操作
            let result;
            if (isFavorited) {
                result = await apiService.fa(userId, podcastId);
            } else {
                result = await audioService.removeFromFavorites(userId, podcastId);
            }

            if (result.success) {
                console.log('收藏状态同步到数据库成功:', {podcastId, isFavorited});

                // 记录推荐转化行为（使用防护代码避免方法不存在错误）
                if (isFavorited) {
                    const currentPodcast = this.data.podcastList[this.data.currentIndex];
                    if (currentPodcast) {
                        try {
                            // 防护检查：确保方法存在
                            if (
                                apiService &&
                                apiService.recommendation &&
                                typeof apiService.recommendation.recordUserConversion ===
                                'function'
                            ) {
                                await apiService.recommendation.recordUserConversion(
                                    userId,
                                    podcastId,
                                    'favorite',
                                    null,
                                    currentPodcast.algorithm || 'unknown'
                                );
                                console.log('收藏转化已记录:', podcastId);
                            } else {
                                console.warn('推荐服务未完全初始化，跳过转化记录');
                            }
                        } catch (error) {
                            console.error('记录收藏转化失败:', error);
                            // 转化记录失败不影响主要功能
                        }
                    }
                }
            } else {
                // 数据库操作失败，回滚UI状态并提示用户
                console.error('数据库收藏操作失败:', result.error);
                this.rollbackFavoriteState(podcastId);

                // 延迟提示用户
                setTimeout(() => {
                    wx.showToast({
                        title: '收藏失败，请重试',
                        icon: 'none',
                        duration: 2000,
                    });
                }, 500);
            }
        } catch (error) {
            console.error('收藏状态更新异常:', error);

            // 网络或其他异常，回滚UI状态并提示用户
            this.rollbackFavoriteState(podcastId);

            setTimeout(() => {
                wx.showToast({
                    title: '网络异常，请重试',
                    icon: 'none',
                    duration: 2000,
                });
            }, 500);
        }
    },

    // 回滚收藏状态（登录用户操作失败时使用）
    rollbackFavoriteState(podcastId) {
        const {podcastList} = this.data;
        const index = podcastList.findIndex(p => p.id === podcastId);

        if (index !== -1) {
            const updatedPodcastList = [...podcastList];
            updatedPodcastList[index] = {
                ...updatedPodcastList[index],
                isFavorited: !updatedPodcastList[index].isFavorited,
            };
            this.setData({podcastList: updatedPodcastList});

            // 同时回滚全局状态
            const app = getApp();
            const podcast = updatedPodcastList[index];
            if (podcast.isFavorited) {
                app.addToFavorites({
                    id: podcast.id,
                    title: podcast.title,
                    cover_url: podcast.cover_url,
                    channel: podcast.channel_name,
                    favoriteTime: Date.now(),
                });
            } else {
                app.removeFromFavorites(podcast.id);
            }
        }
    },

    // 更新单个播客的收藏状态（用于同步数据库状态）
    updatePodcastFavoriteState(podcastId, isFavorited) {
        const {podcastList} = this.data;
        const index = podcastList.findIndex(p => p.id === podcastId);

        if (index !== -1) {
            const updatedPodcastList = [...podcastList];
            updatedPodcastList[index] = {
                ...updatedPodcastList[index],
                isFavorited: isFavorited,
            };
            this.setData({podcastList: updatedPodcastList});

            // 同时更新全局状态
            const app = getApp();
            const podcast = updatedPodcastList[index];
            if (isFavorited) {
                app.addToFavorites({
                    id: podcast.id,
                    title: podcast.title,
                    cover_url: podcast.cover_url,
                    channel: podcast.channel_name,
                    favoriteTime: Date.now(),
                });
            } else {
                app.removeFromFavorites(podcast.id);
            }
        }
    },

    // ========== 评论相关方法 ==========
    async loadCommentsForCurrentPodcast(podcastId) {
        try {
            const result = await apiService.comment.getList(podcastId);
            if (result.success) {
                this.setData({
                    commentList: result.data || [],
                });
                console.log(`成功加载${result.data.length}条评论`);
            }
        } catch (error) {
            console.error('加载评论失败:', error);
            this.setData({commentList: []});
        }
    },

    async loadFloatingComment(podcastId) {
        try {
            const commentService = require('../../services/comment.service.js');

            // 防御性检查
            if (!commentService) {
                console.warn('commentService 未初始化,使用默认评论');
                this.setDefaultFloatingComment();
                return;
            }

            if (typeof commentService.getPinnedOrPopularComment !== 'function') {
                console.warn(
                    'commentService.getPinnedOrPopularComment 方法不存在,使用默认评论'
                );
                this.setDefaultFloatingComment();
                return;
            }

            const result = await commentService.getPinnedOrPopularComment(podcastId);
            if (result.success && result.data) {
                this.setData({
                    floatingComment: result.data,
                });
                console.log('加载悬浮评论成功:', result.data.content);
            } else {
                this.setDefaultFloatingComment();
            }
        } catch (error) {
            console.error('加载悬浮评论失败:', error);
            this.setDefaultFloatingComment();
        }
    },

    setDefaultFloatingComment() {
        this.setData({
            floatingComment: {
                content: '惠人达己，守正出奇',
                user_avatar:
                    'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/default-avatar.png',
                user_nickname: '系统',
            },
        });
    },

    startFloatingCommentRotation() {
        // 清除现有定时器
        if (this.data.floatingCommentTimer) {
            clearInterval(this.data.floatingCommentTimer);
        }

        // 每5秒轮换一次评论
        const timer = setInterval(() => {
            const {podcastList, currentIndex} = this.data;
            if (podcastList[currentIndex]) {
                this.loadFloatingComment(podcastList[currentIndex].id);
            }
        }, 5000);

        this.setData({floatingCommentTimer: timer});
    },

    stopFloatingCommentRotation() {
        if (this.data.floatingCommentTimer) {
            clearInterval(this.data.floatingCommentTimer);
            this.setData({floatingCommentTimer: null});
        }
    },

    handleOpenComments() {
        console.log('打开评论弹窗');

        // 先关闭更多操作弹窗
        this.setData({
            showMorePopup: false,
            showCommentPopup: true,
        });

        // 加载当前播客的评论
        const {podcastList, currentIndex} = this.data;
        if (podcastList[currentIndex]) {
            this.loadCommentsForCurrentPodcast(podcastList[currentIndex].id);
        }
    },

    handleCloseComments() {
        console.log('关闭评论弹窗');
        this.setData({
            showCommentPopup: false,
            commentInputText: '',
            replyingToCommentId: null,
        });
    },

    handleCommentInput(e) {
        this.setData({
            commentInputText: e.detail.value,
        });
    },

    async handleSendComment() {
        const {
            commentInputText,
            replyingToCommentId,
            podcastList,
            currentIndex,
            audioContext,
        } = this.data;

        if (!commentInputText.trim()) {
            wx.showToast({
                title: '请输入评论内容',
                icon: 'none',
                duration: 1500,
            });
            return;
        }

        const userId = this.getCurrentUserId();
        if (!userId) {
            wx.showToast({
                title: '请先登录',
                icon: 'none',
                duration: 1500,
            });
            return;
        }

        const currentPodcast = podcastList[currentIndex];
        if (!currentPodcast) return;

        // 获取当前播放时间戳
        const audioTimestamp = audioContext
            ? Math.floor(audioContext.currentTime || 0)
            : 0;

        try {
            let result;
            if (replyingToCommentId) {
                // 回复评论
                result = await apiService.comment.reply(
                    userId,
                    replyingToCommentId,
                    commentInputText.trim()
                );
            } else {
                // 发表新评论
                result = await apiService.comment.create(
                    userId,
                    currentPodcast.id,
                    commentInputText.trim(),
                    audioTimestamp
                );
            }

            if (result.success) {
                wx.showToast({
                    title: '评论成功',
                    icon: 'success',
                    duration: 1500,
                });

                // 清空输入框
                this.setData({
                    commentInputText: '',
                    replyingToCommentId: null,
                });

                // 重新加载评论列表
                this.loadCommentsForCurrentPodcast(currentPodcast.id);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('发表评论失败:', error);
            wx.showToast({
                title: error.message || '评论失败',
                icon: 'none',
                duration: 2000,
            });
        }
    },

    handleReplyComment(e) {
        const commentId = e.currentTarget.dataset.commentId;
        this.setData({
            replyingToCommentId: commentId,
        });
        console.log('回复评论:', commentId);
    },

    async handleLikeComment(e) {
        const commentId = e.currentTarget.dataset.commentId;
        const userId = this.getCurrentUserId();

        if (!userId) {
            wx.showToast({
                title: '请先登录',
                icon: 'none',
                duration: 1500,
            });
            return;
        }

        try {
            const result = await apiService.comment.like(userId, commentId);
            if (result.success) {
                // 重新加载评论列表
                const {podcastList, currentIndex} = this.data;
                if (podcastList[currentIndex]) {
                    this.loadCommentsForCurrentPodcast(podcastList[currentIndex].id);
                }
            }
        } catch (error) {
            console.error('点赞评论失败:', error);
        }
    },

    // ========== 播放速度相关方法 ==========
    handleSpeedChange() {
        const {playbackSpeed, audioContext} = this.data;

        // 循环切换播放速度: 1.0x -> 1.5x -> 2.0x -> 1.0x
        let newSpeed;
        if (playbackSpeed === 1.0) {
            newSpeed = 1.5;
        } else if (playbackSpeed === 1.5) {
            newSpeed = 2.0;
        } else {
            newSpeed = 1.0;
        }

        this.setData({playbackSpeed: newSpeed});

        // 应用播放速度到音频上下文
        if (audioContext) {
            audioContext.playbackRate = newSpeed;
        }

        // 保存播放速度设置
        this.savePlaybackSpeed();

        console.log('播放速度已更改为:', newSpeed);
    },

    savePlaybackSpeed() {
        try {
            wx.setStorageSync('playbackSpeed', this.data.playbackSpeed);
        } catch (error) {
            console.error('保存播放速度失败:', error);
        }
    },

    // 处理更多操作
    handleMore: function () {
        console.log('打开更多操作弹窗');
        this.setData({showMorePopup: true});
    },

    // 关闭更多操作弹窗
    handleCloseMorePopup: function () {
        console.log('关闭更多操作弹窗');
        this.setData({showMorePopup: false});
    },

    // 处理分享操作
    handleShare: function () {
        console.log('分享播客');
        const {currentIndex, podcastList} = this.data;
        const currentPodcast = podcastList[currentIndex];

        if (!currentPodcast) return;

        // 关闭弹窗
        this.setData({showMorePopup: false});

        // 触发分享
        wx.showShareMenu({
            withShareTicket: true,
            success: () => {
                console.log('分享菜单显示成功');
            },
            fail: error => {
                console.error('分享菜单显示失败:', error);
                wx.showToast({
                    title: '分享功能暂不可用',
                    icon: 'none',
                    duration: 1500,
                });
            },
        });
    },

    // 处理下载操作
    handleDownload: function () {
        console.log('下载播客');
        // 关闭弹窗
        this.setData({showMorePopup: false});

        wx.showToast({
            title: '下载功能开发中',
            icon: 'none',
            duration: 1500,
        });
    },

    // 防止弹窗滚动穿透
    preventScroll: function (e) {
        // 阻止默认滚动行为
        return false;
    },

    // 来自瀑布流容器的本地播放事件（局部实现 mini-player 弹出与播放）
    handleWaterfallPlay: function (e) {

        console.log("确实调用了 waterfall")
        const { podcast } = e.detail || {};
        if (!podcast) return;

        // 确保音频上下文存在
        if (!this.data.audioContext) {
            if (typeof this.initAudioContext === 'function') {
                this.initAudioContext();
            }
        }

        const audio = this.data.audioContext;
        if (!audio) return;

        try {
            // 切换音源并播放
            if (typeof audio.stop === 'function') audio.stop();
            if (podcast.audio_url) {
                audio.src = podcast.audio_url;
            }
            if (typeof audio.play === 'function') audio.play();

            // 打开页面级 mini-player，并设置当前播客
            this.setData({
                isPlaying: true,
                audioLoadingVisible: false,
                'globalPlayer.isVisible': true,
                'globalPlayer.isPlaying': true,
                'globalPlayer.currentPodcast': podcast,
            });
            
        } catch (err) {
            console.warn('handleWaterfallPlay 播放失败:', err);
            wx.showToast({ title: '播放失败', icon: 'none' });
        }
    },

    // === 全局播放器控制方法 ===

    // 全局播放器播放/暂停
    handleGlobalPlayerPlayPause: function (e) {
        console.log('全局播放器播放/暂停', e.detail);
        const app = getApp();
        const newIsPlaying = !this.data.globalPlayer.isPlaying;

        // 实际控制音频
        const audio = this.data.audioContext;
        try {
            if (audio && typeof audio.play === 'function' && typeof audio.pause === 'function') {
                if (newIsPlaying) {
                    audio.play();
                } else {
                    audio.pause();
                }
            }
        } catch (err) {
            console.warn('控制音频播放/暂停失败:', err);
        }

        this.setData({ 'globalPlayer.isPlaying': newIsPlaying });

        app.updateGlobalPlayerState({
            isPlaying: newIsPlaying,
        });
    },

    // 全局播放器展开
    handleGlobalPlayerExpand: function () {
        console.log('全局播放器展开');
        // 切换回swiper模式并定位到当前播放的播客
        this.expandToSwiperMode();
    },

    // 全局播放器关闭
    handleGlobalPlayerClose: function () {
        console.log('全局播放器关闭');
        const app = getApp();

        this.setData({
            'globalPlayer.isVisible': false,
        });

        app.hideGlobalPlayer();

        // 停止播放
        if (this.data.audioContext) {
            this.data.audioContext.stop();
            this.setData({
                isPlaying: false,
                'globalPlayer.isPlaying': false,
            });
        }
    },

    // 展开到Swiper模式
    expandToSwiperMode: function () {
        const app = getApp();
        const currentPodcast = this.data.globalPlayer.currentPodcast;

        // 切换到swiper模式
        app.globalData.browseMode = 'swiper';
        this.setData({
            browseMode: 'swiper',
        });

        // 更新tab栏图标
        app.updateTabBarIcon('swiper');

        // 如果有当前播放的播客，定位到该播客
        if (currentPodcast) {
            const targetIndex = this.data.podcastList.findIndex(
                podcast => podcast.id === currentPodcast.id
            );

            if (targetIndex >= 0) {
                this.setData({
                    currentIndex: targetIndex,
                });
            }
        }

        // 隐藏全局播放器
        this.setData({
            'globalPlayer.isVisible': false,
        });
        app.hideGlobalPlayer();
    },

    // 瀑布流相关逻辑已迁移至 waterfall-container 组件

    // 处理频道点击
    handleChannelClick: function () {
        console.log('跳转到频道页面');

        wx.showToast({
            title: '频道功能开发中',
            icon: 'none',
            duration: 1500,
        });
    },

    // 播放下一个播客（仅在用户手动操作时调用）
    playNext: function () {
        // 完全禁用自动切换功能
        console.log('playNext 被调用，但已禁用自动切换');
        wx.showToast({
            title: '请手动滑动切换',
            icon: 'none',
            duration: 1000,
        });
    },

    // 保存播放进度
    savePlayProgress: function () {
        const {currentIndex, podcastList, audioPosition} = this.data;

        if (!podcastList.length || currentIndex < 0) return;

        const podcast = podcastList[currentIndex];
        const progressKey = `podcast_progress_${podcast.id}`;

        try {
            wx.setStorageSync(progressKey, {
                position: audioPosition,
                timestamp: Date.now(),
            });
        } catch (error) {
            console.error('保存播放进度失败:', error);
        }
    },

    // 加载播放进度
    loadPlayProgress: function (index) {
        const {podcastList} = this.data;

        if (!podcastList.length || index < 0 || index >= podcastList.length) return;

        const podcast = podcastList[index];
        const progressKey = `podcast_progress_${podcast.id}`;

        try {
            const progress = wx.getStorageSync(progressKey);

            if (progress && progress.position > 0) {
                // 获取当前播客的时长信息
                const currentPodcast = podcastList[index];
                const duration =
                    currentPodcast?.duration || this.data.audioDuration || 0;

                // 只有在有有效时长时才计算进度百分比，否则保持为0
                let progressPercentage = 0;
                if (duration > 0) {
                    progressPercentage = (progress.position / duration) * 100;
                }

                // 更新UI显示的播放进度，但不立即seek音频
                this.setData({
                    audioPosition: progress.position,
                    currentProgress: progressPercentage,
                    currentTimeFormatted: this.formatTime(progress.position),
                    // 如果当前播客有duration信息，同时更新audioDuration
                    ...(currentPodcast?.duration
                        ? {audioDuration: currentPodcast.duration}
                        : {}),
                });

                // 保存进度信息，供播放时使用
                this.savedProgress = progress.position;

                // 在自动播放场景下，跳过询问直接使用保存的进度
                if (!this.data.autoPlayOnSwipe) {
                    wx.showModal({
                        title: '继续播放',
                        content: `检测到上次播放进度，是否从 ${Math.floor(progress.position / 60)}:${Math.floor(
                            progress.position % 60
                        )
                            .toString()
                            .padStart(2, '0')} 继续播放？`,
                        success: res => {
                            if (!res.confirm) {
                                // 用户选择从头开始播放，重置进度
                                this.setData({
                                    audioPosition: 0,
                                    currentProgress: 0,
                                    currentTimeFormatted: '0:00',
                                });
                                this.savedProgress = 0;
                            }
                        },
                    });
                }
            } else {
                // 没有保存的进度，确保完全重置状态
                this.setData({
                    audioPosition: 0,
                    currentProgress: 0,
                    currentTimeFormatted: '0:00',
                });
                this.savedProgress = 0;
                console.log('没有保存的播放进度，重置为初始状态:', podcast.title);
            }
        } catch (error) {
            console.error('加载播放进度失败:', error);
            this.savedProgress = 0;
        }
    },

    // 分享功能
    onShareAppMessage: function () {
        const {currentIndex, podcastList} = this.data;
        const currentPodcast = podcastList[currentIndex] || {};

        return {
            title: currentPodcast.title || '达芬Qi说播客',
            path: '/pages/browse/browse',
            imageUrl:
                currentPodcast.cover_url || getImageUrl('icons/share-cover.jpg'),
        };
    },

    // 分享到朋友圈
    onShareTimeline: function () {
        const {currentIndex, podcastList} = this.data;
        const currentPodcast = podcastList[currentIndex] || {};

        return {
            title: '我在达芬Qi说听到了这个有趣的内容',
            query: 'share=timeline',
            imageUrl:
                currentPodcast.cover_url || getImageUrl('icons/share-cover.jpg'),
        };
    },

    // 格式化时间显示 (秒转为 mm:ss 或 h:mm:ss)
    formatTime: function (seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    },


    // 触发预加载机制
    triggerPreloading() {
        const {podcastList, currentIndex} = this.data;

        if (podcastList.length > 0) {
            console.log('🚀 触发音频预加载机制');
            audioPreloader.initialize(podcastList, currentIndex);

            // 获取预加载统计信息
            const stats = audioPreloader.getStats();
            console.log('预加载统计:', stats);
        }
    },

    // 清理预加载资源
    cleanupPreloadedAudio() {
        console.log('🧹 清理预加载音频资源');
        audioPreloader.cleanExpiredCache();
        audioPreloader.cleanDistantPreloads(this.data.currentIndex);
    },

    hideCustomLoading() {
        this.setData({
            audioLoadingVisible: false,
        });
    },

    // 触发自动播放（滑动后自动播放）
    triggerAutoPlay: function () {
        const {audioContext, podcastList, currentIndex} = this.data;

        if (!audioContext || !podcastList.length || currentIndex < 0) {
            console.log('自动播放条件不满足');
            return;
        }

        const currentPodcast = podcastList[currentIndex];
        if (!currentPodcast || !currentPodcast.audio_url) {
            console.log('当前播客数据无效，无法自动播放');
            return;
        }

        console.log('🎵 开始自动播放:', currentPodcast.title);


        // 检查是否需要切换音频源
        const currentSrc = audioContext.src || '';
        const newSrc = currentPodcast.audio_url;
        const isNewAudio = currentSrc !== newSrc;

        if (isNewAudio) {
            console.log('设置新音频源进行自动播放');

            // 检查是否有预加载的音频
            const audioPreloader = require('../../services/audio-preloader.service.js');
            const preloadedAudio = audioPreloader.getPreloadedAudio(newSrc);

            if (preloadedAudio) {
                console.log('🚀 使用预加载音频进行自动播放');
                this.hideCustomLoading();

                // 停止当前音频
                audioContext.stop();

                // 销毁当前音频上下文，使用预加载的
                if (audioContext && typeof audioContext.destroy === 'function') {
                    audioContext.destroy();
                }

                // 使用预加载的音频上下文
                const newAudioContext = preloadedAudio;
                this.setData({audioContext: newAudioContext});

                // 重新绑定事件监听器
                this.rebindAudioEvents(newAudioContext);

                // 立即播放
                newAudioContext.play();
            } else {
                console.log('📱 标准音频加载流程进行自动播放');

                // 停止当前音频
                audioContext.stop();

                // 设置新的音频源
                audioContext.src = newSrc;

                // 重置播放状态
                this.setData({
                    audioPosition: 0,
                    currentProgress: 0,
                    audioDuration: 0,
                    currentTimeFormatted: '0:00',
                    totalTimeFormatted: '0:00',
                });

                // 添加音频加载超时处理
                const loadingTimeout = setTimeout(() => {
                    this.hideCustomLoading();
                    this.setData({isPlaying: false});
                    console.log('自动播放音频加载超时');
                    // 自动播放失败时，给用户友好提示
                    wx.showToast({
                        title: '播放超时，请手动重试',
                        icon: 'none',
                        duration: 2000,
                    });
                }, 8000); // 8秒超时

                // 监听首次canplay事件来隐藏loading
                const onCanplayOnce = () => {
                    clearTimeout(loadingTimeout);
                    this.hideCustomLoading();
                    audioContext.offCanplay(onCanplayOnce);
                };
                audioContext.onCanplay(onCanplayOnce);

                // 开始播放
                audioContext.play();
            }
        } else {
            // 继续播放当前音频
            this.hideCustomLoading();
            audioContext.play();
        }


        // 触发音频预加载机制
        this.triggerPreloading();
    },
});
