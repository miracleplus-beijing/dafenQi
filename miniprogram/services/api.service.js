// API 服务集合
const authService = require('./auth.service.js')
const storageService = require('./storage.service.js')
const requestUtil = require('../utils/request.js')

class ApiService {
  constructor() {
    this.auth = authService
    this.storage = storageService
    this.request = requestUtil
  }

  // 播客相关 API
  podcast = {
    // 获取播客列表
    getList: async (params = {}) => {
      try {
        const {
          page = 1,
          limit = 20,
          category = '',
          search = '',
          sortBy = 'created_at'
        } = params

        const result = await requestUtil.get('/rest/v1/podcasts', {
          page,
          limit,
          category,
          search,
          order: sortBy
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('获取播客列表失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 获取播客详情
    getDetail: async (podcastId) => {
      try {
        const result = await requestUtil.get(`/rest/v1/podcasts?id=eq.${podcastId}&select=*`)
        
        return {
          success: true,
          data: result[0] || null
        }
      } catch (error) {
        console.error('获取播客详情失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 获取推荐播客
    getRecommended: async (limit = 10) => {
      try {
        const result = await requestUtil.get('/rest/v1/podcasts', {
          limit,
          order: 'play_count.desc,created_at.desc'
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('获取推荐播客失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    }
  }

  // 用户相关 API
  user = {
    // 获取用户收藏
    getFavorites: async (userId) => {
      try {
        const result = await requestUtil.get('/rest/v1/user_favorites', {
          user_id: `eq.${userId}`,
          select: '*, podcast:podcast_id(*)',
          order: 'created_at.desc'
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('获取用户收藏失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 添加收藏
    addFavorite: async (userId, podcastId) => {
      try {
        const result = await requestUtil.post('/rest/v1/user_favorites', {
          user_id: userId,
          podcast_id: podcastId
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('添加收藏失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 移除收藏
    removeFavorite: async (userId, podcastId) => {
      try {
        await requestUtil.delete('/rest/v1/user_favorites', {
          headers: {
            'Content-Type': 'application/json'
          },
          data: {
            user_id: `eq.${userId}`,
            podcast_id: `eq.${podcastId}`
          }
        })

        return {
          success: true
        }
      } catch (error) {
        console.error('移除收藏失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 获取播放历史
    getHistory: async (userId, limit = 50) => {
      try {
        const result = await requestUtil.get('/rest/v1/user_history', {
          user_id: `eq.${userId}`,
          select: '*, podcast:podcast_id(*)',
          order: 'played_at.desc',
          limit
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('获取播放历史失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 添加播放历史
    addHistory: async (userId, podcastId, playPosition = 0) => {
      try {
        // 先删除已存在的记录
        await requestUtil.delete('/rest/v1/user_history', {
          headers: {
            'Content-Type': 'application/json'
          },
          data: {
            user_id: `eq.${userId}`,
            podcast_id: `eq.${podcastId}`
          }
        })

        // 添加新记录
        const result = await requestUtil.post('/rest/v1/user_history', {
          user_id: userId,
          podcast_id: podcastId,
          play_position: playPosition,
          played_at: new Date().toISOString()
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('添加播放历史失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 更新播放进度
    updatePlayPosition: async (userId, podcastId, playPosition) => {
      try {
        const result = await requestUtil.patch('/rest/v1/user_history', {
          play_position: playPosition
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          data: {
            user_id: `eq.${userId}`,
            podcast_id: `eq.${podcastId}`
          }
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('更新播放进度失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    }
  }

  // 分类相关 API
  category = {
    // 获取分类列表
    getList: async () => {
      try {
        const result = await requestUtil.get('/rest/v1/categories', {
          order: 'sort_order.asc,name.asc'
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('获取分类列表失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 根据分类获取播客
    getPodcasts: async (categoryId, params = {}) => {
      try {
        const {
          page = 1,
          limit = 20,
          sortBy = 'created_at'
        } = params

        const result = await requestUtil.get('/rest/v1/podcasts', {
          category_id: `eq.${categoryId}`,
          page,
          limit,
          order: `${sortBy}.desc`
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('获取分类播客失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    }
  }

  // 搜索相关 API
  search = {
    // 搜索播客
    podcasts: async (query, params = {}) => {
      try {
        const {
          page = 1,
          limit = 20
        } = params

        const result = await requestUtil.get('/rest/v1/podcasts', {
          or: `title.ilike.%${query}%,description.ilike.%${query}%`,
          page,
          limit,
          order: 'created_at.desc'
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('搜索播客失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 获取热门搜索词
    getHotKeywords: async () => {
      try {
        // 这里可以实现热门搜索词的逻辑
        // 暂时返回模拟数据
        return {
          success: true,
          data: ['AI', '机器学习', '科技', '创业', '心理学']
        }
      } catch (error) {
        console.error('获取热门搜索词失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    }
  }

  // 统计相关 API
  stats = {
    // 记录播放统计
    recordPlay: async (podcastId, userId = null) => {
      try {
        await requestUtil.post('/rest/v1/play_stats', {
          podcast_id: podcastId,
          user_id: userId,
          played_at: new Date().toISOString()
        })

        return { success: true }
      } catch (error) {
        console.error('记录播放统计失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 获取播客统计信息
    getPodcastStats: async (podcastId) => {
      try {
        const result = await requestUtil.get('/rest/v1/podcast_stats', {
          podcast_id: `eq.${podcastId}`
        })

        return {
          success: true,
          data: result[0] || { play_count: 0, like_count: 0, favorite_count: 0 }
        }
      } catch (error) {
        console.error('获取播客统计失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    }
  }
}

// 创建单例实例
const apiService = new ApiService()

module.exports = apiService