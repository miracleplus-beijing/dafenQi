// 设置页面逻辑

Page({
  data: {},

  // 处理菜单项点击
  handleMenuClick: function (e) {
    const type = e.currentTarget.dataset.type;

    switch (type) {
      case 'privacy-policy':
        wx.navigateTo({
          url: '/pages/privacy-policy/privacy-policy',
        });
        break;
      case 'service-agreement':
        wx.navigateTo({
          url: '/pages/service-agreement/service-agreement',
        });
        break;
      case 'data-collection':
        wx.navigateTo({
          url: '/pages/data-collection/data-collection',
        });
        break;
      case 'personal-info':
        wx.navigateTo({
          url: '/pages/personal-info/personal-info',
        });
        break;
      case 'cancel-account':
        this.handleCancelAccount();
        break;
      default:
        console.log('未知菜单项:', type);
    }
  },

  // 处理账户注销
  handleCancelAccount: function () {
    wx.showModal({
      title: '注销账户',
      content:
        '注销账户后，您的所有数据将被永久删除且无法恢复。确定要注销账户吗？',
      confirmText: '确定注销',
      cancelText: '取消',
      confirmColor: '#FF4444',
      success: res => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/account-cancel/account-cancel',
          });
        }
      },
    });
  },

  // 处理退出登录
  handleLogout: function () {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      confirmColor: '#FF4444',
      success: async res => {
        if (res.confirm) {
          await this.performLogout();
        }
      },
    });
  },

  // 执行退出登录
  performLogout: async function () {
    const authService = require('../../services/auth.service.js');

    wx.showLoading({
      title: '退出中...',
    });

    try {
      // 使用auth service登出
      const result = await authService.logout();

      if (result.success) {
        wx.hideLoading();
        wx.showToast({
          title: '已退出登录',
          icon: 'success',
          duration: 1500,
        });

        // 延迟返回上一页或首页
        setTimeout(() => {
          wx.navigateBack({
            delta: 1,
            fail: () => {
              wx.switchTab({
                url: '/pages/profile/profile',
              });
            }
          });
        }, 1500);

      } else {
        wx.hideLoading();
        wx.showToast({
          title: '退出失败: ' + result.error,
          icon: 'none',
          duration: 1500,
        });
      }
    } catch (error) {
      console.error('退出登录失败:', error);
      wx.hideLoading();

      // 即使失败也尝试返回
      wx.navigateBack({
        delta: 1,
        fail: () => {
          wx.switchTab({
            url: '/pages/profile/profile',
          });
        }
      });
    }
  },
});
