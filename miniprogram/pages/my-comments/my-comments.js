// 我的评论页面逻辑
const commentService = require('../../services/comment.service.js');
const authService = require('../../services/auth.service.js');

Page({
    data: {
        // Tab状态
        activeTab: 'comments',

        // 用户信息
        userInfo: null,

        // 评论列表
        commentList: [],

        // 加载状态
        loading: false,
        showLoginPrompt: false,
    },

    onLoad: function (options) {
        console.log('我的评论页面加载', options);
    },

    onShow: async function () {
        console.log('我的评论页面显示');

        // 检查登录状态
        if (!authService.checkLoginStatus()) {
            this.setData({
                showLoginPrompt: true,
                commentList: [],
            });
            return;
        }

        // 已登录，获取用户信息并加载评论
        const currentUser = await authService.getCurrentUser();
        if (!currentUser || !currentUser.id) {
            this.setData({
                showLoginPrompt: true,
                commentList: [],
            });
            return;
        }

        this.setData({
            userInfo: currentUser,
            showLoginPrompt: false,
        });

        // 加载评论列表
        this.loadMyComments();
    },

    // =============== 数据加载 ===============

    async loadMyComments() {
        if (!this.data.userInfo || !this.data.userInfo.id) {
            console.warn('用户信息缺失，无法加载评论');
            return;
        }

        this.setData({ loading: true });

        try {
            const result = await commentService.getUserComments(this.data.userInfo.id);

            if (result.success && result.data) {
                // 格式化数据
                const commentList = result.data.map(comment => ({
                    ...comment,
                    created_at_formatted: this.formatCommentTime(comment.created_at),
                }));

                this.setData({
                    commentList: commentList,
                    loading: false,
                });

                console.log(`成功加载 ${commentList.length} 条评论`);
            } else {
                this.setData({
                    commentList: [],
                    loading: false,
                });
                console.error('加载评论失败:', result.error);
            }
        } catch (error) {
            console.error('加载评论异常:', error);
            this.setData({
                commentList: [],
                loading: false,
            });
            wx.showToast({
                title: '加载失败，请重试',
                icon: 'none',
                duration: 2000,
            });
        }
    },

    // =============== Tab切换 ===============

    switchTab(e) {
        const tab = e.currentTarget.dataset.tab;
        this.setData({
            activeTab: tab,
        });

        console.log('切换到Tab:', tab);
    },

    // =============== 评论点击 ===============

    handleCommentTap(e) {
        const { podcastId, commentId } = e.currentTarget.dataset;

        console.log('点击评论:', { podcastId, commentId });

        if (!podcastId) {
            wx.showToast({
                title: '播客信息不完整',
                icon: 'none',
                duration: 1500,
            });
            return;
        }

        // 跳转到首页播放该博客
        wx.switchTab({
            url: '/pages/browse/browse',
            success: () => {
                const app = getApp();
                console.log(`准备播放博客 ${podcastId}`);
            },
            fail: (error) => {
                console.error('跳转失败:', error);
                wx.showToast({
                    title: '跳转失败',
                    icon: 'none',
                    duration: 1500,
                });
            },
        });
    },

    // =============== 格式化函数 ===============

    formatCommentTime(timestamp) {
        if (!timestamp) return '';

        const now = new Date();
        const commentTime = new Date(timestamp);
        const diff = now - commentTime;

        // 计算时间差
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        // 根据时间差返回相对时间
        if (seconds < 60) {
            return '刚刚';
        } else if (minutes < 60) {
            return `${minutes}分钟前`;
        } else if (hours < 24) {
            return `${hours}小时前`;
        } else if (days < 30) {
            return `${days}天前`;
        } else if (months < 12) {
            return `${months}个月前`;
        } else {
            return `${years}年前`;
        }
    },

    // =============== 登录相关 ===============

    goToLogin() {
        wx.navigateTo({
            url: '/pages/login/login',
        });
    },

    // =============== 下拉刷新 ===============

    onPullDownRefresh() {
        console.log('下拉刷新评论列表');
        this.loadMyComments().finally(() => {
            wx.stopPullDownRefresh();
        });
    },

    // =============== 分享功能 ===============

    onShareAppMessage() {
        return {
            title: '查看我在奇绩前沿信号的评论',
            path: '/pages/browse/browse',
            imageUrl: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/share-cover.jpg',
        };
    },

    onShareTimeline() {
        return {
            title: '我在奇绩前沿信号发表了评论',
            query: 'share=timeline',
            imageUrl: 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/share-cover.jpg',
        };
    },
});
