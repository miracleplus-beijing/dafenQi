// API 服务集合
const authService = require('./auth.service.js')
const storageService = require('./storage.service.js')
const requestUtil = require('../utils/request.js')
const { AuthRequiredError } = require('../utils/request.js')
const recommendationService = require('./recommendation/index.js')
const commentService = require('./comment.service.js')
const insightService = require('./insight.service.js')

class ApiService {
  constructor() {
    this.auth = authService
    this.storage = storageService
    this.request = requestUtil
    this.recommendation = recommendationService
    this.comment = commentService
    this.insight = insightService
  }

  // 统一错误处理
  handleApiError(error, context) {
    if (error.name === 'AuthRequiredError' || error.needLogin) {
      return {
        success: false,
        error: error.message,
        needLogin: true,
        context: context
      }
    }

    return {
      success: false,
      error: error.message,
      needLogin: false
    }
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
          select: 'id,title,description,cover_url,audio_url,duration,play_count,like_count,favorite_count',
          order: 'play_count.desc,created_at.desc',
          limit
        })

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('获取播客列表失败:', error)
        return apiService.handleApiError(error, 'podcast.getList')
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
        return apiService.handleApiError(error, 'user.getFavorites')
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
        // 构建正确的DELETE URL，使用查询参数而不是data
        await requestUtil.delete(`/rest/v1/user_favorites?user_id=eq.${userId}&podcast_id=eq.${podcastId}`, {
          headers: {
            'Content-Type': 'application/json'
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
        // 先删除已存在的记录 - 修复DELETE请求
        await requestUtil.delete(`/rest/v1/user_history?user_id=eq.${userId}&podcast_id=eq.${podcastId}`, {
          headers: {
            'Content-Type': 'application/json'
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
          limit = 20
        } = params

        const queryParams = {
          or: `(title.ilike.*${query}*,description.ilike.*${query}*)`,
          limit: limit,
          order: 'created_at.desc'
        }

        const result = await requestUtil.get('/rest/v1/podcasts', queryParams)

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

    // 搜索播客（包含频道信息）- 先搜索播客，然后手动获取频道信息
    podcastsWithChannel: async (query, params = {}) => {
      try {
        const {
          limit = 20
        } = params

        console.log('开始搜索播客，关键词:', query)

        // 首先搜索播客
        const queryParams = {
          or: `(title.ilike.*${query}*,description.ilike.*${query}*)`,
          limit: limit,
          order: 'created_at.desc'
        }

        const podcasts = await requestUtil.get('/rest/v1/podcasts', queryParams)
        
        console.log('播客搜索结果:', podcasts)

        if (!podcasts || podcasts.length === 0) {
          return {
            success: true,
            data: []
          }
        }

        // 获取所有用到的频道ID
        const channelIds = [...new Set(podcasts.map(p => p.channel_id).filter(id => id))]
        console.log('需要查询的频道IDs:', channelIds)
        
        let channelsMap = {}
        if (channelIds.length > 0) {
          try {
            // 批量获取频道信息 - 使用PostgREST的IN语法
            const channelQueryString = channelIds.map(id => `"${id}"`).join(',')
            const channelQuery = {
              id: `in.(${channelQueryString})`
            }
            console.log('频道查询参数:', channelQuery)
            
            const channels = await requestUtil.get('/rest/v1/channels', channelQuery)
            console.log('频道查询结果:', channels)
            
            // 创建频道映射
            channels.forEach(channel => {
              channelsMap[channel.id] = channel
            })
          } catch (channelError) {
            console.error('获取频道信息失败，使用默认频道名称:', channelError)
            // 如果获取频道失败，不影响播客搜索结果
          }
        }

        // 合并播客和频道信息
        const formattedResult = podcasts.map(podcast => ({
          ...podcast,
          channel_name: channelsMap[podcast.channel_id]?.name || '奇绩前沿信号'
        }))

        console.log('最终格式化结果:', formattedResult)

        return {
          success: true,
          data: formattedResult
        }
      } catch (error) {
        console.error('搜索播客（含频道信息）失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 搜索频道
    channels: async (query, params = {}) => {
      try {
        const {
          limit = 10
        } = params

        const queryParams = {
          or: `(name.ilike.*${query}*,description.ilike.*${query}*)`,
          limit: limit,
          order: 'subscriber_count.desc,created_at.desc'
        }

        const result = await requestUtil.get('/rest/v1/channels', queryParams)

        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('搜索频道失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 综合搜索（播客 + 频道）
    all: async (query, params = {}) => {
      try {
        const {
          podcastLimit = 5,
          channelLimit = 3
        } = params

        // 并行搜索播客和频道
        const [podcastResult, channelResult] = await Promise.all([
          this.search.podcastsWithChannel(query, { limit: podcastLimit }),
          this.search.channels(query, { limit: channelLimit })
        ])

        return {
          success: true,
          data: {
            podcasts: podcastResult.success ? podcastResult.data : [],
            channels: channelResult.success ? channelResult.data : [],
            total: (podcastResult.success ? podcastResult.data.length : 0) + 
                   (channelResult.success ? channelResult.data.length : 0)
          }
        }
      } catch (error) {
        console.error('综合搜索失败:', error)
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
          data: ['AI', '机器学习', '计算机视觉', '深度学习', '自然语言处理', '数据科学']
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

  // 评论相关 API
  comment = {
    // 获取播客的所有评论
    getList: async (podcastId) => {
      try {
        const result = await commentService.getCommentsByPodcastId(podcastId)
        return result
      } catch (error) {
        console.error('获取评论列表失败:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }
    },

    // 获取悬浮播放条显示的评论（置顶 > 高赞 > 随机）
    getFloatingComment: async (podcastId) => {
      try {
        const result = await commentService.getPinnedOrPopularComment(podcastId)
        return result
      } catch (error) {
        console.error('获取悬浮播放条评论失败:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }
    },

    // 发表评论
    create: async (userId, podcastId, content, audioTimestamp = 0) => {
      try {
        const result = await commentService.createComment(userId, podcastId, content, audioTimestamp)
        return result
      } catch (error) {
        console.error('发表评论失败:', error)
        return apiService.handleApiError(error, 'comment.create')
      }
    },

    // 回复评论
    reply: async (userId, parentCommentId, content) => {
      try {
        const result = await commentService.replyToComment(userId, parentCommentId, content)
        return result
      } catch (error) {
        console.error('回复评论失败:', error)
        return apiService.handleApiError(error, 'comment.reply')
      }
    },

    // 点赞/取消点赞评论
    like: async (userId, commentId) => {
      try {
        const result = await commentService.likeComment(userId, commentId)
        return result
      } catch (error) {
        console.error('点赞评论失败:', error)
        return apiService.handleApiError(error, 'comment.like')
      }
    },

    // 置顶评论（管理员功能）
    pin: async (commentId) => {
      try {
        const result = await commentService.pinComment(commentId)
        return result
      } catch (error) {
        console.error('置顶评论失败:', error)
        return apiService.handleApiError(error, 'comment.pin')
      }
    },

    // 取消置顶评论
    unpin: async (commentId) => {
      try {
        const result = await commentService.unpinComment(commentId)
        return result
      } catch (error) {
        console.error('取消置顶评论失败:', error)
        return apiService.handleApiError(error, 'comment.unpin')
      }
    }
  }

  // 认知提取相关 API
  insight = {
    // 获取播客的所有insights（按点击次数智能排序）
    getList: async (podcastId) => {
      try {
        const result = await insightService.getInsightsByClickCount(podcastId)
        return result
      } catch (error) {
        console.error('获取insights列表失败:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }
    },

    // 获取播客的主要insight
    getMain: async (podcastId) => {
      try {
        const result = await insightService.getMainInsightByPodcastId(podcastId)
        return result
      } catch (error) {
        console.error('获取主要insight失败:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }
    },

    // 获取insight详情
    getDetail: async (insightId) => {
      try {
        const result = await insightService.getInsightById(insightId)
        return result
      } catch (error) {
        console.error('获取insight详情失败:', error)
        return {
          success: false,
          error: error.message,
          data: null
        }
      }
    },

    // 点击查看insight详情（会增加点击次数）
    recordClick: async (insightId) => {
      try {
        const result = await insightService.incrementClickCount(insightId)
        return result
      } catch (error) {
        console.error('记录insight点击失败:', error)
        // 非关键操作，失败不影响主流程
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 点赞insight
    like: async (insightId) => {
      try {
        const result = await insightService.incrementLikeCount(insightId)
        return result
      } catch (error) {
        console.error('点赞insight失败:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    // 获取热门insights
    getPopular: async (limit = 10) => {
      try {
        const result = await insightService.getPopularInsights(limit)
        return result
      } catch (error) {
        console.error('获取热门insights失败:', error)
        return {
          success: false,
          error: error.message,
          data: []
        }
      }
    },

    // 创建用户交互记录
    createInteraction: async (userId, insightId, interactionType) => {
      try {
        const result = await insightService.createUserInteraction(userId, insightId, interactionType)
        return result
      } catch (error) {
        console.error('创建用户交互记录失败:', error)
        return apiService.handleApiError(error, 'insight.createInteraction')
      }
    }
  }


}

// 创建单例实例
const apiService = new ApiService()

module.exports = apiService