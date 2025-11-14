Component({
  options: {
    styleIsolation: 'apply-shared'
  },
  properties: {
    visible: { type: Boolean, value: false },
    commentList: { type: Array, value: [] },
    commentInputText: { type: String, value: '' },
    replyingToCommentId: { type: String, optionalTypes: [Number, null], value: null }
  },
  methods: {
    onClose() {
      this.triggerEvent('close');
    },
    onInput(e) {
      this.triggerEvent('input', { value: e.detail.value });
    },
    onSend() {
      this.triggerEvent('send');
    },
    onReply(e) {
      const id = e.currentTarget.dataset.id;
      this.triggerEvent('reply', { id });
    },
    onLike(e) {
      const id = e.currentTarget.dataset.id;
      this.triggerEvent('like', { id });
    },
    preventScroll() {}
  }
});
