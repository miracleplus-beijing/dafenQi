/**
 * 图标配置文件
 * 统一管理应用中的所有图标，使用 TDesign 图标库
 * 替换硬编码的 CDN 图片 URL，提供语义化的图标映射
 */

class IconConfig {
  constructor() {
    // 学术分类图标映射 (使用TDesign支持的图标名称)
    this.academicIcons = {
      cs_ai: 'cpu', // 人工智能 (智能/自动化相关)
      cs_cl: 'translate', // 计算语言学 (翻译相关)
      cs_cv: 'camera', // 计算机视觉
      cs_lg: 'chart-line', // 机器学习 (图表相关)
      cs_ne: 'chart-scatter', // 神经与演化 (网络/连接相关)
      cs_ro: 'control-platform', // 机器人学 (控制平台相关)
      stat_ml: 'chart-pie', // 统计机器学习
    };

    // 导航图标映射 (修正为TDesign支持的图标)
    this.navigationIcons = {
      browse: 'browse', // 漫游/浏览
      category: 'view-module', // 分类
      profile: 'user', // 个人中心
      search: 'search', // 搜索
      back: 'chevron-left', // 返回
      forward: 'chevron-right', // 前进
      home: 'home', // 首页
      more: 'ellipsis', // 更多
    };

    // 播放控制图标映射 (确保TDesign兼容性)
    this.playbackIcons = {
      play: 'play-circle', // 播放
      pause: 'pause-circle', // 暂停
      stop: 'stop-circle', // 停止
      'play-large': 'play', // 大播放按钮 (简化为play)
      previous: 'skip-previous', // 上一个
      next: 'skip-next', // 下一个
      rewind: 'rewind', // 后退 (修正为rewind)
      forward: 'fast-forward', // 快进 (修正为fast-forward)
      volume: 'sound', // 音量
      'volume-mute': 'sound-off', // 静音
      speed: 'time', // 播放速度
      loop: 'refresh', // 循环播放
    };

    // 交互图标映射 (修正TDesign兼容的图标名称)
    this.interactionIcons = {
      favorite: 'heart', // 收藏（未选中）
      'favorite-active': 'heart-filled', // 收藏（已选中）
      like: 'thumb-up', // 点赞（未选中）
      'like-active': 'thumb-up', // 点赞（已选中）- 修正为同名
      comment: 'chat', // 评论
      share: 'share', // 分享
      download: 'download', // 下载
      add: 'add', // 添加
      remove: 'remove', // 移除
      star: 'star', // 星标
      'star-active': 'star-filled', // 星标（已选中）
    };

    // 状态图标映射
    this.statusIcons = {
      loading: 'loading', // 加载中
      success: 'check-circle', // 成功
      error: 'error-circle', // 错误
      warning: 'info-circle', // 警告
      info: 'help-circle', // 信息
      close: 'close', // 关闭
      check: 'check', // 确认
      refresh: 'refresh', // 刷新
    };

    // 排行榜图标映射 (使用更通用的TDesign图标)
    this.rankingIcons = {
      hot: 'fire', // 热门
      new: 'time', // 最新
      review: 'star', // 综述/评分
      trending: 'arrow-up', // 趋势 (修正为arrow-up)
      popular: 'thumb-up', // 流行
      crown: 'medal', // 排行榜冠军 (修正为medal)
    };

    // 用户相关图标映射 (修正为TDesign兼容图标)
    this.userIcons = {
      avatar: 'user', // 用户头像 (简化为user)
      profile: 'user', // 个人资料
      settings: 'setting', // 设置
      history: 'time', // 历史记录
      favorites: 'heart', // 我的收藏
      comments: 'chat', // 我的评论
      feedback: 'mail', // 意见反馈
      logout: 'poweroff', // 退出登录 (修正为poweroff)
      edit: 'edit', // 编辑
      camera: 'camera', // 相机/拍照
    };

    // 学术相关图标映射 (修正为TDesign通用图标)
    this.academicMetaIcons = {
      paper: 'file-text', // 论文
      author: 'user', // 作者 (修正为user)
      institution: 'location', // 机构
      keyword: 'tag', // 关键词
      citation: 'quote', // 引用
      doi: 'link', // DOI链接
      arxiv: 'folder', // ArXiv (修正为folder)
      journal: 'books', // 期刊
      conference: 'calendar', // 会议
    };

    // 系统功能图标映射 (修正为TDesign兼容图标)
    this.systemIcons = {
      menu: 'view-list', // 菜单
      filter: 'filter', // 筛选
      sort: 'sort', // 排序 (简化为sort)
      grid: 'view-module', // 网格视图
      list: 'view-list', // 列表视图
      expand: 'chevron-down', // 展开
      collapse: 'chevron-up', // 收起
      external: 'link', // 外部链接 (修正为link)
      copy: 'file-copy', // 复制
      qrcode: 'qrcode', // 二维码
    };

    // 合并所有图标映射
    this.allIcons = {
      ...this.academicIcons,
      ...this.navigationIcons,
      ...this.playbackIcons,
      ...this.interactionIcons,
      ...this.statusIcons,
      ...this.rankingIcons,
      ...this.userIcons,
      ...this.academicMetaIcons,
      ...this.systemIcons,
    };
  }

  /**
   * 获取图标名称
   * @param {string} key - 语义化的图标键名
   * @param {string} category - 图标分类（可选，用于冲突解决）
   * @returns {string} TDesign 图标名称
   */
  getIcon(key, category = null) {
    // 如果指定了分类，优先从该分类查找
    if (category && this[`${category}Icons`]) {
      const categoryIcons = this[`${category}Icons`];
      if (categoryIcons[key]) {
        return categoryIcons[key];
      }
    }

    // 从全部图标中查找
    if (this.allIcons[key]) {
      return this.allIcons[key];
    }

    // 如果找不到，返回默认图标并给出警告
    console.warn(
      `图标配置未找到: ${key}${category ? ` (分类: ${category})` : ''}，使用默认图标`
    );
    return 'help-circle';
  }

  /**
   * 获取学术分类图标
   * @param {string} categoryId - 学术分类ID
   * @returns {string} TDesign 图标名称
   */
  getAcademicIcon(categoryId) {
    return this.getIcon(categoryId, 'academic') || 'robot';
  }

  /**
   * 获取导航图标
   * @param {string} navKey - 导航键名
   * @returns {string} TDesign 图标名称
   */
  getNavigationIcon(navKey) {
    return this.getIcon(navKey, 'navigation') || 'help-circle';
  }

  /**
   * 获取播放控制图标
   * @param {string} actionKey - 播放动作键名
   * @returns {string} TDesign 图标名称
   */
  getPlaybackIcon(actionKey) {
    return this.getIcon(actionKey, 'playback') || 'play-circle';
  }

  /**
   * 获取交互状态图标
   * @param {string} interactionKey - 交互键名
   * @param {boolean} isActive - 是否为激活状态
   * @returns {string} TDesign 图标名称
   */
  getInteractionIcon(interactionKey, isActive = false) {
    const key = isActive ? `${interactionKey}-active` : interactionKey;
    return this.getIcon(key, 'interaction') || 'help-circle';
  }

  /**
   * 获取排行榜图标
   * @param {string} rankingType - 排行榜类型
   * @returns {string} TDesign 图标名称
   */
  getRankingIcon(rankingType) {
    return this.getIcon(rankingType, 'ranking') || 'star';
  }

  /**
   * 获取用户相关图标
   * @param {string} userActionKey - 用户动作键名
   * @returns {string} TDesign 图标名称
   */
  getCurrentUserIcon(userActionKey) {
    return this.getIcon(userActionKey, 'user') || 'user';
  }

  /**
   * 获取系统功能图标
   * @param {string} systemKey - 系统功能键名
   * @returns {string} TDesign 图标名称
   */
  getSystemIcon(systemKey) {
    return this.getIcon(systemKey, 'system') || 'help-circle';
  }

  /**
   * 批量获取图标映射
   * @param {Array<string>} keys - 图标键名数组
   * @param {string} category - 图标分类（可选）
   * @returns {Object} 键值对映射对象
   */
  getBatchIcons(keys, category = null) {
    const result = {};
    keys.forEach(key => {
      result[key] = this.getIcon(key, category);
    });
    return result;
  }

  /**
   * 获取所有可用的图标映射
   * @returns {Object} 完整的图标映射对象
   */
  getAllIconMappings() {
    return {
      academic: this.academicIcons,
      navigation: this.navigationIcons,
      playback: this.playbackIcons,
      interaction: this.interactionIcons,
      status: this.statusIcons,
      ranking: this.rankingIcons,
      user: this.userIcons,
      academicMeta: this.academicMetaIcons,
      system: this.systemIcons,
    };
  }

  /**
   * 验证图标是否存在
   * @param {string} key - 图标键名
   * @param {string} category - 图标分类（可选）
   * @returns {boolean} 是否存在该图标
   */
  hasIcon(key, category = null) {
    if (category && this[`${category}Icons`]) {
      return !!this[`${category}Icons`][key];
    }
    return !!this.allIcons[key];
  }

  /**
   * 获取图标配置统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const categories = Object.keys(this.getAllIconMappings());
    const stats = {
      totalCategories: categories.length,
      totalIcons: Object.keys(this.allIcons).length,
      categoryStats: {},
    };

    categories.forEach(category => {
      const categoryIcons = this[`${category}Icons`];
      stats.categoryStats[category] = Object.keys(categoryIcons).length;
    });

    return stats;
  }
}

// 创建单例实例
const iconConfig = new IconConfig();

module.exports = iconConfig;
