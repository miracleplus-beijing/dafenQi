// 账户注销页面逻辑
Page({
  data: {
    reasons: [
      '不再使用该服务',
      '对服务不满意',
      '隐私担忧',
      '找到替代应用',
      '其他原因',
    ],
    selectedReason: '',
    customReason: '',
    agreed: false,
  },

  // 选择注销原因
  onReasonChange: function (e) {
    const index = e.detail.value;
    this.setData({
      selectedReason: this.data.reasons[index],
    });
  },

  // 自定义原因输入
  onCustomReasonInput: function (e) {
    this.setData({
      customReason: e.detail.value,
    });
  },

  // 同意条款
  onAgreementChange: function (e) {
    this.setData({
      agreed: e.detail.value,
    });
  },

  // 提交注销申请
  handleSubmit: function () {
    if (!this.data.selectedReason && !this.data.customReason) {
      wx.showToast({
        title: '请选择注销原因',
        icon: 'none',
      });
      return;
    }

    if (!this.data.agreed) {
      wx.showToast({
        title: '请同意注销协议',
        icon: 'none',
      });
      return;
    }

    wx.showModal({
      title: '确认注销',
      content: '注销后将无法恢复您的账户和数据，是否继续？',
      confirmText: '确认注销',
      cancelText: '取消',
      confirmColor: '#FF4444',
      success: res => {
        if (res.confirm) {
          this.submitCancellation();
        }
      },
    });
  },

  // 提交注销申请
  submitCancellation: function () {
    wx.showLoading({ title: '处理中...' });

    // 模拟提交注销申请
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '注销申请已提交',
        content:
          '您的账户注销申请已提交，我们将在7个工作日内处理您的申请。在此期间，您仍可以正常使用账户。',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        },
      });
    }, 2000);
  },
});
