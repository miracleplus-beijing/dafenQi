// 问题反馈页面逻辑

Page({
  data: {
    feedbackTypes: [
      { id: 'bug', name: '功能异常' },
      { id: 'suggestion', name: '功能建议' },
      { id: 'content', name: '内容问题' },
      { id: 'other', name: '其他问题' },
    ],
    selectedType: '',
    feedbackContent: '',
    contactInfo: '',
    isSubmitting: false,
    faqList: [
      {
        id: 1,
        question: '为什么无法播放某些内容？',
        answer: '可能是网络问题或内容暂时不可用，请检查网络连接后重试。',
        expanded: false,
      },
      {
        id: 2,
        question: '如何下载内容离线收听？',
        answer: '在播放页面点击下载按钮，选择音质后即可下载到本地。',
        expanded: false,
      },
      {
        id: 3,
        question: '收藏的内容在哪里查看？',
        answer: '在"我的"页面中点击"我的收藏"即可查看所有收藏的内容。',
        expanded: false,
      },
    ],
  },

  computed: {
    canSubmit: function () {
      return (
        this.data.selectedType &&
        this.data.feedbackContent.trim() &&
        !this.data.isSubmitting
      );
    },
  },

  onLoad: function () {
    this.setData({
      canSubmit: false,
    });
  },

  selectFeedbackType: function (e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      selectedType: type,
    });
    this.updateCanSubmit();
  },

  onContentInput: function (e) {
    this.setData({
      feedbackContent: e.detail.value,
    });
    this.updateCanSubmit();
  },

  onContactInput: function (e) {
    this.setData({
      contactInfo: e.detail.value,
    });
  },

  updateCanSubmit: function () {
    const canSubmit =
      this.data.selectedType &&
      this.data.feedbackContent.trim() &&
      !this.data.isSubmitting;
    this.setData({
      canSubmit: canSubmit,
    });
  },

  submitFeedback: function () {
    if (!this.data.canSubmit) return;

    this.setData({
      isSubmitting: true,
      canSubmit: false,
    });

    wx.showLoading({
      title: '提交中...',
    });

    // 模拟提交
    setTimeout(() => {
      wx.hideLoading();

      this.setData({
        isSubmitting: false,
        selectedType: '',
        feedbackContent: '',
        contactInfo: '',
      });

      wx.showToast({
        title: '反馈提交成功',
        icon: 'success',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            wx.navigateBack();
          }, 2000);
        },
      });
    }, 1500);
  },

  toggleFaq: function (e) {
    const index = e.currentTarget.dataset.index;
    const key = `faqList[${index}].expanded`;

    this.setData({
      [key]: !this.data.faqList[index].expanded,
    });
  },
});
