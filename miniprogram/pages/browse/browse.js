// 漫游页面逻辑
const app = getApp();
const apiService = require('../../services/api.service.js');
const authService = require('../../services/auth.service.js');
const { getImageUrl } = require('../../config/image-urls.js');

Page({
    data: {
        // 播放状态
        isPlaying: false,
        playingPodcastId: null, // 正在播放的播客ID

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
        audioLoading: false, // 音频是否正在加载

        // 防止自动滑动的标志
        isDraggingThumb: false,

        // 自动播放控制
        autoPlayOnSwipe: true, // 控制下滑后是否自动播放

        // CDN图片URL (带本地降级)
        cdnImages: {
            loadingIcon:
                'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/loading.svg',
        },

        // 评论相关状态
        commentList: [], // 评论列表
        showCommentPopup: false, // 是否显示评论弹窗
        commentInputText: '', // 评论输入内容
        replyingToCommentId: null, // 正在回复的评论ID

        // 更多操作弹窗相关状态
        showMorePopup: false, // 是否显示更多操作弹窗

        // 播放速度相关
        playbackSpeed: 1.0, // 当前播放速度

        // 智能降级和用户体验相关
        showLoginTip: false, // 显示登录提示
        loginTipMessage: '', // 登录提示消息
        isPersonalized: true, // 是否为个性化推荐


        // 双模式状态
        browseMode: 'swiper', // 'swiper' | 'waterfall'

        justNavigatedViaTab: false,

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
            const app = getApp();
            const activeIndex = app.globalData && typeof app.globalData.activeTabIndex === 'number'
                ? app.globalData.activeTabIndex
                : null;
            if (this.data.justNavigatedViaTab || activeIndex !== 0) {
                console.log('刚通过切换进入本页，忽略本次tab点击的模式切换');
                this.setData({ justNavigatedViaTab: false });
                return;
            }
            console.log('已在漫游页，二次点击tab，切换浏览模式');
            this.switchBrowseMode();
        }
    },

    // 切换浏览模式（带动画）
    switchBrowseMode: function () {
        const app = getApp();
        const currentMode = app.globalData.browseMode;
        const newMode = currentMode === 'swiper' ? 'waterfall' : 'swiper';

        console.log('切换浏览模式:', currentMode, '->', newMode);

        // 在切换前中断音频并隐藏 mini-player（最小改动）
        try {
            const audio = this.data.audioContext;
            if (audio && typeof audio.stop === 'function') {
                audio.stop();
            }
        } catch (_) { }
        this.setData({
            'globalPlayer.isPlaying': false,
            'globalPlayer.isVisible': false,
        });

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


    // 显示友好的登录提示
    showLoginTip(message) {
        this.setData({
            showLoginTip: true,
            loginTipMessage: message,
        });

        // 3秒后自动隐藏
        setTimeout(() => {
            this.setData({ showLoginTip: false });
        }, 3000);
    },

    // 处理登录提示点击
    handleLoginTip: function () {
        wx.navigateTo({
            url: '/pages/login/login',
        });
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
                console.log('开始自动播放搜索的播客');
                this.triggerAutoPlay();
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

            // 初始化播客的播放状态
            podcast.playState = this.initPodcastPlayState(podcast);

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
                console.log('开始自动播放插入的播客');
                this.triggerAutoPlay();
            }
        } else {
            throw new Error('获取播客详情失败');
        }

    },

    onShow: function () {
        console.log('漫游页面显示');

        const app = getApp();
        app.globalData.activeTabIndex = 0;

        // 页面进入动画
        this.enterAnimation();

        // 延迟检查全局播客状态，确保数据加载完成
        setTimeout(() => {
            this.checkGlobalPodcastState();
        }, 200);

        this.setData({ justNavigatedViaTab: true });
        if (this._justNavigatedTimer) {
            clearTimeout(this._justNavigatedTimer);
        }
        this._justNavigatedTimer = setTimeout(() => {
            this.setData({ justNavigatedViaTab: false });
            this._justNavigatedTimer = null;
        }, 600);
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
                this.triggerAutoPlay();
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

                // 初始化播客的播放状态
                formattedPodcast.playState = this.initPodcastPlayState(formattedPodcast);

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
                        this.triggerAutoPlay();
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

        // 页面隐藏时保存当前播放进度
        const { playingPodcastId } = this.data;
        if (playingPodcastId) {
            this.savePlayProgress(playingPodcastId);
        }
    },

    onUnload: function () {
        console.log('漫游页面卸载');

        // 页面卸载时保存当前播放进度
        const { playingPodcastId } = this.data;
        if (playingPodcastId) {
            this.savePlayProgress(playingPodcastId);
        }

        // 清理定时器
        this.cleanupTimers();

        // 销毁音频上下文
        if (
            this.data.audioContext &&
            typeof this.data.audioContext.destroy === 'function'
        ) {
            this.data.audioContext.destroy();
        }


        if (this._justNavigatedTimer) {
            clearTimeout(this._justNavigatedTimer);
            this._justNavigatedTimer = null;
        }
        this.setData({ justNavigatedViaTab: false });
    },

    // 清理定时器和内存
    cleanupTimers: function () {
        // 清理重新分配定时器
        if (this._redistributeTimer) {
            clearTimeout(this._redistributeTimer);
            this._redistributeTimer = null;
        }

        // 清理其他定时器
        console.log('页面定时器已清理');
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

    // ========== 播客状态管理辅助方法 ==========

    // 获取当前显示的播客
    getCurrentPodcast: function () {
        const { podcastList, currentIndex } = this.data;
        return podcastList[currentIndex] || null;
    },

    // 获取正在播放的播客
    getPlayingPodcast: function () {
        const { podcastList, playingPodcastId } = this.data;
        if (!playingPodcastId) return null;
        return podcastList.find(p => p.id === playingPodcastId) || null;
    },

    // 初始化播客的播放状态
    initPodcastPlayState: function (podcast) {
        const duration = podcast.duration || 0;
        return {
            position: 0,                    // 当前播放位置（秒）
            progress: 0,                    // 播放进度（0-100）
            actualDuration: duration,       // 实际音频时长（音频加载后更新）
            currentTimeFormatted: '0:00',
            totalTimeFormatted: this.formatTime(duration),
            lastPlayTime: null              // 最后播放时间
        };
    },

    // 更新播客的播放状态
    updatePodcastPlayState: function (podcastId, updates) {
        const { podcastList } = this.data;
        const index = podcastList.findIndex(p => p.id === podcastId);

        if (index >= 0) {
            const podcast = podcastList[index];
            const updatedPlayState = { ...podcast.playState, ...updates };

            this.setData({
                [`podcastList[${index}].playState`]: updatedPlayState
            });
        }
    },

    // 初始化音频上下文
    initAudioContext: function () {
        const audioContext = wx.createInnerAudioContext({
            useWebAudioImplement: true
        });
        this.rebindAudioEvents(audioContext);
        this.setData({ audioContext });
    },

    // 重新绑定音频事件监听器
    rebindAudioEvents: function (audioContext) {
        // 音频事件监听
        audioContext.onPlay(() => {
            console.log('音频事件：开始播放');
            const { playingPodcastId } = this.data;

            this.setData({
                isPlaying: true,
                audioLoading: false,
            });

            // 更新正在播放的播客的 lastPlayTime
            if (playingPodcastId) {
                this.updatePodcastPlayState(playingPodcastId, {
                    lastPlayTime: Date.now()
                });
            }

            app.setCurrentPodcast(this.getCurrentPodcast());
        });

        audioContext.onPause(() => {
            console.log('音频事件：暂停播放');
            const { playingPodcastId } = this.data;

            this.setData({
                isPlaying: false,
                audioLoading: false,
            });

            // 暂停时保存播放进度
            if (playingPodcastId) {
                this.savePlayProgress(playingPodcastId);
            }
        });

        audioContext.onStop(() => {
            console.log('音频事件：停止播放');
            const { playingPodcastId } = this.data;

            this.setData({
                isPlaying: false,
                audioLoading: false,
            });

            // 停止时保存播放进度
            if (playingPodcastId) {
                this.savePlayProgress(playingPodcastId);
            }
        });

        audioContext.onTimeUpdate(() => {
            const currentTime = audioContext.currentTime || 0;
            const duration = audioContext.duration || 0;
            const { playingPodcastId, isDraggingThumb } = this.data;

            if (duration > 0 && !isDraggingThumb && playingPodcastId) {
                const progress = (currentTime / duration) * 100;

                // 更新正在播放的播客的播放状态
                this.updatePodcastPlayState(playingPodcastId, {
                    position: currentTime,
                    progress: Math.min(100, Math.max(0, progress)),
                    actualDuration: duration,
                    currentTimeFormatted: this.formatTime(currentTime),
                    totalTimeFormatted: this.formatTime(duration),
                });

                // 定期保存播放进度（每10秒保存一次，避免过于频繁）
                if (!this._lastSaveTime || (Date.now() - this._lastSaveTime) > 10000) {
                    this.savePlayProgress(playingPodcastId);
                    this._lastSaveTime = Date.now();
                }
            }
        });

        audioContext.onEnded(() => {
            console.log('音频播放结束');
            const { playingPodcastId } = this.data;

            this.setData({
                isPlaying: false,
                audioLoading: false,
            });

            // 更新播放进度为100%
            if (playingPodcastId) {
                this.updatePodcastPlayState(playingPodcastId, {
                    progress: 100
                });
            }
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
            this.hideCustomLoading();
            const duration = audioContext.duration;
            const { playingPodcastId } = this.data;

            if (duration > 0 && playingPodcastId) {
                // 更新实际音频时长
                this.updatePodcastPlayState(playingPodcastId, {
                    actualDuration: duration,
                    totalTimeFormatted: this.formatTime(duration),
                });
            }

            this.setData({ audioLoading: false });
        });

        audioContext.onWaiting(() => {
            console.log('音频加载中');
            this.setData({ audioLoading: true });
        });
    },

    // 加载播客数据
    async loadPodcastData(loadMore = false) {
        try {
            this.setData({ loading: true });

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
                        // 如果用户已登录，也检查数据库状态（但不等待）
                        const userId = authService?.getCurrentUser()?.id;
                        if (userId && !isFavorited) {
                            const audioService = require('../../services/audio.service.js');
                            audioService.checkIsFavorited(userId, podcast.id)
                                .then(dbFavorited => {
                                    this.updatePodcastFavoriteState(podcast.id, dbFavorited);
                                })
                                .catch(error => {
                                    console.warn('检查数据库收藏状态失败:', error);
                                });
                        }

                        const podcastData = {
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

                        // 初始化播放状态
                        podcastData.playState = this.initPodcastPlayState(podcastData);

                        return podcastData;
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
                            isPlaying: false,
                            currentIndex: 0,
                        }),
                });

                // 首次加载时，加载第一个播客的播放进度
                if (!loadMore) {
                    this.loadPlayProgress(0);


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
            this.setData({ loading: false });
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
        // console.log('用户开始触摸swiper');
        const now = Date.now();
    },


    // 处理Swiper切换
    handleSwiperChange: function (e) {
        const currentIndex = e.detail.current;
        const oldIndex = this.data.currentIndex;
        const now = Date.now();
        const { podcastList, hasMoreData } = this.data;

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
        });


        // 加载新播客的播放进度（延迟执行，确保状态更新完成）
        this.loadPlayProgress(currentIndex);

        // 自动播放新播客（仅在启用自动播放时）
        if (this.data.autoPlayOnSwipe && podcastList[currentIndex]) {
            console.log(
                '触发自动播放 - 当前播客:',
                podcastList[currentIndex].title
            );
            // 短暂延迟确保UI状态更新完成

            this.triggerAutoPlay();

        }
    },

    // 处理播放/暂停
    handlePlayPause: function () {
        const { audioContext, isPlaying } = this.data;
        const currentPodcast = this.getCurrentPodcast();

        if (!audioContext) {
            console.error('音频上下文为空');
            wx.showToast({
                title: '播放器初始化失败',
                icon: 'none',
            });
            return;
        }

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
    startPlayback: function (podcast) {
        const { audioContext, playingPodcastId } = this.data;

        console.log('准备播放:', podcast.title, '| 当前播放ID:', playingPodcastId, '| 新播客ID:', podcast.id);

        // 【关键修复】无论如何，先停止当前播放，防止多个音频同时播放
        if (audioContext) {
            try {
                // 强制停止当前音频
                if (typeof audioContext.stop === 'function') {
                    audioContext.stop();
                    console.log('已停止之前的音频');
                }
            } catch (e) {
                console.warn('停止音频失败:', e);
            }
        }

        // 设置正在播放的播客ID
        this.setData({
            playingPodcastId: podcast.id
        });

        // 检查是否需要切换音频源
        const currentSrc = audioContext.src || '';
        const newSrc = podcast.audio_url;
        const isNewAudio = currentSrc !== newSrc;

        if (isNewAudio) {
            console.log('需要切换音频源');
            this.switchAudioSource(podcast, newSrc);
        } else {
            // 继续播放当前音频（已经在上面停止了，现在重新播放）
            console.log('继续播放当前音频');
            this.hideCustomLoading();
            audioContext.play();
        }

    },

    // 切换音频源并播放
    switchAudioSource: function (podcast, newSrc) {
        const { audioContext } = this.data;

        console.log('切换音频源:', podcast.title);

        // 显示加载动画
        this.setData({
            audioLoadingVisible: true,
            audioLoadingText: '加载音频...',
            isPlaying: true, // 预设为播放状态
        });

        // 设置新音频源并播放（startPlayback 已经停止了之前的音频）
        if (audioContext) {
            audioContext.src = newSrc;
            audioContext.play();
        }
    },



    // ========== Slider 交互事件处理 ==========

    // Slider 开始拖拽
    handleSliderTouchStart: function (e) {
        console.log('Slider 拖拽开始');
        this.setData({
            isDraggingThumb: true
        });
    },

    // Slider 拖拽结束（类似 Vue 的 @change）
    handleSliderChange: function (e) {
        const { audioContext, playingPodcastId } = this.data;
        const playingPodcast = this.getPlayingPodcast();

        if (!audioContext || !playingPodcast) return;

        const percentage = e.detail.value;
        const duration = playingPodcast.playState.actualDuration;
        const seekTime = (percentage / 100) * duration;

        // 拖拽过程中更新UI (拖拽结束时才seek音频)
        this.updatePodcastPlayState(playingPodcastId, {
            progress: percentage,
            position: seekTime,
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
        const { audioContext } = this.data;
        const playingPodcast = this.getPlayingPodcast();

        if (!audioContext || !playingPodcast) return;

        const percentage = e.detail.value;
        const duration = playingPodcast.playState.actualDuration;
        const seekTime = (percentage / 100) * duration;
        audioContext.seek(seekTime);
    },

    // 处理后退15秒
    handleRewind: function () {
        const { audioContext, playingPodcastId } = this.data;
        const playingPodcast = this.getPlayingPodcast();

        if (!audioContext || !playingPodcast) return;

        const currentPosition = playingPodcast.playState.position;
        const duration = playingPodcast.playState.actualDuration;
        const newPosition = Math.max(0, currentPosition - 15);

        audioContext.seek(newPosition);

        // 立即更新UI状态，即使在暂停状态下
        this.updatePodcastPlayState(playingPodcastId, {
            position: newPosition,
            progress: (newPosition / duration) * 100,
            currentTimeFormatted: this.formatTime(newPosition),
        });

        console.log('后退15秒到:', newPosition);
    },

    // 处理前进30秒
    handleFastForward: function () {
        const { audioContext, playingPodcastId } = this.data;
        const playingPodcast = this.getPlayingPodcast();

        if (!audioContext || !playingPodcast) return;

        const currentPosition = playingPodcast.playState.position;
        const duration = playingPodcast.playState.actualDuration;
        const newPosition = Math.min(duration, currentPosition + 30);

        audioContext.seek(newPosition);

        // 立即更新UI状态，即使在暂停状态下
        this.updatePodcastPlayState(playingPodcastId, {
            position: newPosition,
            progress: (newPosition / duration) * 100,
            currentTimeFormatted: this.formatTime(newPosition),
        });

        console.log('前进30秒到:', newPosition);
    },

    // 处理收藏 - 要求用户先登录
    handleFavorite: async function () {
        const { currentIndex, podcastList } = this.data;
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
        this.setData({ showMorePopup: false });

        // 检查用户登录状态

        const loginStatus = authService.checkLoginStatus();
        console.log(loginStatus)
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

        // 异步处理数据库操作
        this.updateFavoriteStatus(
            currentPodcast.id,
            newIsFavorited,
            authService?.getCurrentUser()?.id
        ).then((res) => {
            // 给用户轻提示反馈
            wx.showToast({
                title: newIsFavorited ? '已添加到收藏' : '已取消收藏',
                icon: 'success',
                duration: 1500,
            });



            const updatedPodcastList = [...podcastList];
            updatedPodcastList[currentIndex] = {
                ...currentPodcast,
                isFavorited: newIsFavorited,
            };

            this.setData({
                podcastList: updatedPodcastList,
            });
        })
    },

    // 异步更新收藏状态到数据库（仅登录用户）
    async updateFavoriteStatus(podcastId, isFavorited, userId) {
        try {

            // 执行数据库操作
            let result;
            if (isFavorited) {
                result = await apiService.user.addFavorite(userId, podcastId);
            } else {
                result = await apiService.user.removeFavorite(userId, podcastId);
            }

            if (result) {
                console.log('收藏状态同步到数据库成功:', { podcastId, isFavorited });

            } else {

                console.error('数据库收藏操作失败:', result?.error);
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
                    title: `${error}`,
                    icon: 'none',
                    duration: 2000,
                });
            }, 500);
        }
    },

    // 回滚收藏状态（登录用户操作失败时使用）
    rollbackFavoriteState(podcastId) {
        const { podcastList } = this.data;
        const index = podcastList.findIndex(p => p.id === podcastId);

        if (index !== -1) {
            const updatedPodcastList = [...podcastList];
            updatedPodcastList[index] = {
                ...updatedPodcastList[index],
                isFavorited: !updatedPodcastList[index].isFavorited,
            };
            this.setData({ podcastList: updatedPodcastList });

        }
    },

    // 更新单个播客的收藏状态（用于同步数据库状态）
    updatePodcastFavoriteState(podcastId, isFavorited) {
        const { podcastList } = this.data;
        const index = podcastList.findIndex(p => p.id === podcastId);

        if (index !== -1) {
            const updatedPodcastList = [...podcastList];
            updatedPodcastList[index] = {
                ...updatedPodcastList[index],
                isFavorited: isFavorited,
            };
            this.setData({ podcastList: updatedPodcastList });

        }
    },

    // ========== 评论相关方法 ==========
    async loadCommentsForCurrentPodcast(podcastId) {
        console.log(apiService)
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
            this.setData({ commentList: [] });
        }
    },


    handleOpenComments() {
        console.log('打开评论弹窗')

        // 先关闭更多操作弹窗
        this.setData({
            showMorePopup: false,
            showCommentPopup: true,
        });

        // 加载当前播客的评论
        const { podcastList, currentIndex } = this.data;
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

        const userId = authService?.getCurrentUser()?.id;
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
        const commentId = (e && e.detail && e.detail.id) || (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.commentId);
        this.setData({
            replyingToCommentId: commentId,
        });
        console.log('回复评论:', commentId);
    },

    async handleLikeComment(e) {
        const commentId = (e && e.detail && e.detail.id) || (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.commentId);
        const userId = authService?.getCurrentUser()?.id;

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
                const { podcastList, currentIndex } = this.data;
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
        const { playbackSpeed, audioContext } = this.data;

        // 循环切换播放速度: 1.0x -> 1.5x -> 2.0x -> 1.0x
        let newSpeed;
        if (playbackSpeed === 1.0) {
            newSpeed = 1.5;
        } else if (playbackSpeed === 1.5) {
            newSpeed = 2.0;
        } else {
            newSpeed = 1.0;
        }

        this.setData({ playbackSpeed: newSpeed });

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
        this.setData({ showMorePopup: true });
    },

    // 关闭更多操作弹窗
    handleCloseMorePopup: function () {
        console.log('关闭更多操作弹窗');
        this.setData({ showMorePopup: false });
    },

    // 处理分享操作
    handleShare: function () {
        console.log('分享播客');
        const { currentIndex, podcastList } = this.data;
        const currentPodcast = podcastList[currentIndex];

        if (!currentPodcast) return;

        // 关闭弹窗
        this.setData({ showMorePopup: false });

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
        this.setData({ showMorePopup: false });

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


    // 保存播放进度（适配新架构：基于 playState）
    savePlayProgress: function (podcastId = null) {
        const { podcastList, playingPodcastId } = this.data;

        // 如果没有指定 podcastId，则保存当前正在播放的播客
        const targetPodcastId = podcastId || playingPodcastId;

        if (!targetPodcastId) {
            console.log('savePlayProgress: 没有需要保存进度的播客');
            return;
        }

        // 查找播客
        const podcast = podcastList.find(p => p.id === targetPodcastId);

        if (!podcast || !podcast.playState) {
            console.warn('savePlayProgress: 未找到播客或播放状态:', targetPodcastId);
            return;
        }

        // 只有播放位置大于0才保存（避免保存无意义的进度）
        if (podcast.playState.position <= 0) {
            console.log('savePlayProgress: 播放位置为0，跳过保存');
            return;
        }

        const progressKey = `podcast_progress_${podcast.id}`;
        const progressData = {
            position: podcast.playState.position,
            progress: podcast.playState.progress,
            actualDuration: podcast.playState.actualDuration,
            lastPlayTime: Date.now()
        };

        try {
            wx.setStorageSync(progressKey, progressData);
            console.log('savePlayProgress: 已保存播放进度 -', podcast.title,
                `位置: ${this.formatTime(progressData.position)} / ${this.formatTime(progressData.actualDuration)}`);
        } catch (error) {
            console.error('savePlayProgress: 保存失败:', error);
        }
    },

    // 加载播放进度（适配新架构：基于 playState）
    loadPlayProgress: function (index) {
        const { podcastList } = this.data;

        if (!podcastList.length || index < 0 || index >= podcastList.length) {
            console.warn('loadPlayProgress: 无效的播客索引:', index);
            return;
        }

        const podcast = podcastList[index];
        const progressKey = `podcast_progress_${podcast.id}`;

        try {
            const progress = wx.getStorageSync(progressKey);

            if (progress && progress.position > 0) {
                console.log('loadPlayProgress: 加载播放进度 -', podcast.title,
                    `位置: ${this.formatTime(progress.position)}`);

                // 计算进度百分比
                const duration = progress.actualDuration || podcast.playState.actualDuration || podcast.duration || 0;
                let progressPercentage = 0;
                if (duration > 0) {
                    progressPercentage = (progress.position / duration) * 100;
                }

                // 更新播客的播放状态
                this.updatePodcastPlayState(podcast.id, {
                    position: progress.position,
                    progress: Math.min(100, Math.max(0, progressPercentage)),
                    currentTimeFormatted: this.formatTime(progress.position),
                    // 如果保存的进度中有 actualDuration，也一并更新
                    ...(progress.actualDuration ? {
                        actualDuration: progress.actualDuration,
                        totalTimeFormatted: this.formatTime(progress.actualDuration)
                    } : {}),
                });

                // 如果当前正在播放这个播客，需要 seek 到对应位置
                const { audioContext, playingPodcastId, isPlaying } = this.data;
                if (audioContext && playingPodcastId === podcast.id && isPlaying) {
                    console.log('loadPlayProgress: seek 到保存的位置:', progress.position);
                    audioContext.seek(progress.position);
                }
            } else {
                console.log('loadPlayProgress: 没有保存的播放进度 -', podcast.title);
            }
        } catch (error) {
            console.error('loadPlayProgress: 加载失败:', error);
        }
    },

    // 分享功能
    onShareAppMessage: function () {
        const { currentIndex, podcastList } = this.data;
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
        const { currentIndex, podcastList } = this.data;
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

    hideCustomLoading() {
        this.setData({
            audioLoadingVisible: false,
        });
    },

    // 触发自动播放（滑动后自动播放）
    triggerAutoPlay: function () {
        const { audioContext } = this.data;
        const currentPodcast = this.getCurrentPodcast();

        if (!currentPodcast || !currentPodcast.audio_url || !audioContext) {
            console.log('自动播放条件不满足');
            return;
        }

        console.log('触发自动播放:', currentPodcast.title);

        // 【关键修复】先停止当前播放，防止多个音频同时播放
        try {
            if (audioContext && typeof audioContext.stop === 'function') {
                audioContext.stop();
                console.log('自动播放：已停止之前的音频');
            }
        } catch (e) {
            console.warn('停止音频失败:', e);
        }

        // 设置正在播放的播客ID
        this.setData({
            playingPodcastId: currentPodcast.id
        });

        // 检查是否有保存的播放进度
        let startTime = 0;
        if (currentPodcast.playState && currentPodcast.playState.position > 0) {
            startTime = currentPodcast.playState.position;
            console.log('自动播放：检测到历史进度，将从', startTime, '秒开始播放');
        }

        // 检查是否需要切换音频源
        const currentSrc = audioContext.src || '';
        const newSrc = currentPodcast.audio_url;
        const isNewAudio = currentSrc !== newSrc;

        if (isNewAudio) {
            console.log('设置新音频源进行自动播放');
            audioContext.src = newSrc;
        }

        // 设置起始播放位置（必须在 play 之前设置）
        // 注意：即使是同一个音频，stop() 后再 play() 也会重置，所以需要设置 startTime
        if (startTime > 0) {
            audioContext.startTime = startTime;
        } else {
            audioContext.startTime = 0;
        }

        // 播放音频
        this.hideCustomLoading();
        audioContext.play();

    },
});
