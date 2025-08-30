/**
 * 图标管理器
 * 用于管理和获取Supabase Storage中的SVG图标
 */

class IconManager {
  constructor() {
    this.baseUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/icons/'
    this.iconCache = new Map()
    
    // 图标映射表
    this.iconMap = {
      // 导航类图标
      'nav-browse': 'nav-browse.svg',
      'nav-category': 'nav-category.svg', 
      'nav-profile': 'nav-profile.svg',
      
      // 播放控制类图标
      'player-play-large': 'player-play-large.svg',
      'player-play-small': 'player-play-small.svg',
      'player-pause': 'player-pause.svg',
      'player-forward-30s': 'player-forward-30s.svg',
      'player-backward-15s': 'player-backward-15s.svg',
      'player-progress-bar': 'player-progress-bar.svg',
      
      // 交互类图标
      'action-like-active': 'action-like-active.svg',
      'action-like-inactive': 'action-like-inactive.svg',
      'action-favorite-active': 'action-favorite-active.svg',
      'action-favorite-inactive': 'action-favorite-inactive.svg',
      'action-share': 'action-share.svg',
      'action-comment': 'action-comment.svg',
      
      // 界面控制类图标
      'ui-back': 'ui-back.svg',
      'ui-search': 'ui-search.svg',
      'ui-settings': 'ui-settings.svg',
      'ui-arrow-right': 'ui-arrow-right.svg',
      'ui-refresh': 'ui-refresh.svg',
      'ui-expand': 'ui-expand.svg',
      'ui-list': 'ui-list.svg',
      'ui-loading': 'ui-loading.svg',
      
      // 功能页面类图标
      'feature-history': 'feature-history.svg',
      'feature-feedback': 'feature-feedback.svg',
      
      // 认证相关图标
      'auth-agreement-checked': 'auth-agreement-checked.svg',
      'auth-agreement-unchecked': 'auth-agreement-unchecked.svg'
    }
  }

  /**
   * 获取图标URL
   * @param {string} iconName - 图标名称
   * @returns {string} 图标URL
   */
  getIconUrl(iconName) {
    const fileName = this.iconMap[iconName]
    if (!fileName) {
      console.warn(`图标 ${iconName} 不存在`)
      return ''
    }
    return this.baseUrl + fileName
  }

  /**
   * 获取图标的完整信息（从本地缓存或Supabase获取）
   * @param {string} iconName - 图标名称
   * @returns {Promise<Object>} 图标信息
   */
  async getIconInfo(iconName) {
    // 检查缓存
    if (this.iconCache.has(iconName)) {
      return this.iconCache.get(iconName)
    }

    try {
      // 从Supabase获取图标信息
      const response = await this.fetchIconFromSupabase(iconName)
      if (response) {
        this.iconCache.set(iconName, response)
        return response
      }
    } catch (error) {
      console.error(`获取图标 ${iconName} 失败:`, error)
    }

    // 回退到基础URL
    return {
      name: iconName,
      url: this.getIconUrl(iconName),
      metadata: {}
    }
  }

  /**
   * 从Supabase获取图标信息
   * @param {string} iconName - 图标名称
   * @returns {Promise<Object>} 图标信息
   */
  async fetchIconFromSupabase(iconName) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://gxvfcafgnhzjiauukssj.supabase.co/rest/v1/static_assets',
        method: 'GET',
        header: {
          'apikey': getApp().globalData.supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        data: {
          select: '*',
          name: `eq.${iconName}`
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.length > 0) {
            resolve(res.data[0])
          } else {
            resolve(null)
          }
        },
        fail: reject
      })
    })
  }

  /**
   * 预加载常用图标
   * @param {Array<string>} iconNames - 图标名称数组
   */
  async preloadIcons(iconNames = []) {
    const defaultIcons = [
      'nav-browse', 'nav-category', 'nav-profile',
      'action-like-active', 'action-like-inactive',
      'action-favorite-active', 'action-favorite-inactive',
      'player-play-large', 'player-pause',
      'ui-back', 'ui-search'
    ]
    
    const iconsToLoad = iconNames.length > 0 ? iconNames : defaultIcons
    
    const promises = iconsToLoad.map(iconName => this.getIconInfo(iconName))
    
    try {
      await Promise.all(promises)
      console.log('图标预加载完成')
    } catch (error) {
      console.error('图标预加载失败:', error)
    }
  }

  /**
   * 获取本地图标路径（用于离线场景）
   * @param {string} iconName - 图标名称
   * @returns {string} 本地图标路径
   */
  getLocalIconPath(iconName) {
    // 本地图标映射（备用方案）
    const localIconMap = {
      'nav-browse': '/images/icons/漫游.svg',
      'nav-category': '/images/icons/分类.svg',
      'nav-profile': '/images/icons/我的.svg',
      'action-like-active': '/images/icons/点赞-已选择.svg',
      'action-like-inactive': '/images/icons/点赞-未选择.svg',
      'action-favorite-active': '/images/icons/收藏-已选择.svg',
      'action-favorite-inactive': '/images/icons/收藏-未选择.svg',
      'player-play-large': '/images/icons/播放-大.svg',
      'player-pause': '/images/icons/暂停.svg',
      'ui-back': '/images/icons/返回.svg',
      'ui-search': '/images/icons/搜索.svg'
    }
    
    return localIconMap[iconName] || ''
  }

  /**
   * 智能获取图标路径（优先云端，回退本地）
   * @param {string} iconName - 图标名称
   * @param {boolean} forceLocal - 强制使用本地图标
   * @returns {string} 图标路径
   */
  getIconPath(iconName, forceLocal = false) {
    if (forceLocal) {
      return this.getLocalIconPath(iconName)
    }
    
    // 检查网络状态
    const networkType = wx.getNetworkTypeSync()
    if (networkType.networkType === 'none') {
      return this.getLocalIconPath(iconName)
    }
    
    return this.getIconUrl(iconName)
  }

  /**
   * 获取分类的所有图标
   * @param {string} category - 图标分类
   * @returns {Array<string>} 图标名称数组
   */
  getIconsByCategory(category) {
    const categoryMap = {
      'navigation': ['nav-browse', 'nav-category', 'nav-profile'],
      'player': ['player-play-large', 'player-play-small', 'player-pause', 'player-forward-30s', 'player-backward-15s'],
      'interaction': ['action-like-active', 'action-like-inactive', 'action-favorite-active', 'action-favorite-inactive', 'action-share', 'action-comment'],
      'ui': ['ui-back', 'ui-search', 'ui-settings', 'ui-arrow-right', 'ui-refresh', 'ui-expand', 'ui-list', 'ui-loading'],
      'feature': ['feature-history', 'feature-feedback'],
      'auth': ['auth-agreement-checked', 'auth-agreement-unchecked']
    }
    
    return categoryMap[category] || []
  }
}

// 创建全局实例
const iconManager = new IconManager()

// 导出
module.exports = iconManager