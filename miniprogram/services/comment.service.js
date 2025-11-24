// comment.service.js - 评论服务
// 处理播客评论相关的数据操作
const requestUtil = require('../utils/request.js');

class CommentService {
  constructor() {
    this.supabaseUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co';
    this.supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmZjYWZnbmh6amlhdXVrc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY4NjAsImV4cCI6MjA3MTAwMjg2MH0.uxO5eyw0Usyd59UKz-S7bTrmOnNPg9Ld9wJ6pDMIQUA';
  }

  // 通用的Supabase请求方法（委托全局requestUtil）
  async supabaseRequest(endpoint, options = {}) {
    const path = `/rest/v1/${endpoint}`;
    const method = options.method || 'GET';
    const needAuth = options.needAuth !== undefined ? options.needAuth : method !== 'GET';
    try {
      const data = await requestUtil.request({
        url: path,
        method,
        data: options.data,
        headers: {
          Prefer: 'return=representation',
          ...(options.headers || {}),
        },
        needAuth,
      });
      return { success: true, data };
    } catch (error) {
      console.error('Supabase请求失败:', error);
      return {
        success: false,
        error: error.message || '请求失败',
        statusCode: error.statusCode || 0,
      };
    }
  }

  // 获取播客的所有评论（包含用户信息）
  async getCommentsByPodcastId(podcastId) {
    try {
      console.log('获取播客评论列表:', podcastId);

      // 使用Supabase的关联查询获取评论及用户信息
      const query = `podcast_id=eq.${podcastId}&select=*,user:user_id(id,nickname,avatar_url)&order=created_at.desc`;

      // const result = await requestUtil.get('/rest/v1/comments', {
      //   podcast_id: `eq.${podcastId}`,
      // });

      const result = await this.supabaseRequest(`comments?${query}`);

      if (result.success) {
        const comments = result.data.map(comment =>
          this.formatCommentData(comment)
        );

        console.log(`成功获取${comments.length}条评论`);
        return {
          success: true,
          data: comments,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('获取评论列表失败:', error);
      return {
        success: false,
        error: error.message || '获取评论失败',
        data: [],
      };
    }
  }

  // 获取悬浮播放条显示的评论（置顶 > 高赞 > 随机）
  async getPinnedOrPopularComment(podcastId) {
    try {
      console.log('获取悬浮播放条评论:', podcastId);

      // 第1优先级：置顶评论
      let query = `podcast_id=eq.${podcastId}&is_pinned=eq.true&is_deleted=eq.false&select=*,user:user_id(id,nickname,avatar_url)&limit=1`;
      let result = await this.supabaseRequest(`comments?${query}`);

      if (result.success && result.data.length > 0) {
        console.log('找到置顶评论');
        return {
          success: true,
          data: this.formatCommentData(result.data[0]),
        };
      }

      // 第2优先级：高赞评论（like_count >= 10）
      query = `podcast_id=eq.${podcastId}&like_count=gte.10&is_deleted=eq.false&select=*,user:user_id(id,nickname,avatar_url)&order=like_count.desc&limit=1`;
      result = await this.supabaseRequest(`comments?${query}`);

      if (result.success && result.data.length > 0) {
        console.log('找到高赞评论');
        return {
          success: true,
          data: this.formatCommentData(result.data[0]),
        };
      }

      // 第3优先级：随机评论
      query = `podcast_id=eq.${podcastId}&is_deleted=eq.false&select=*,user:user_id(id,nickname,avatar_url)`;
      result = await this.supabaseRequest(`comments?${query}`);

      if (result.success && result.data.length > 0) {
        const randomIndex = Math.floor(Math.random() * result.data.length);
        console.log('使用随机评论:', randomIndex, '/', result.data.length);
        return {
          success: true,
          data: this.formatCommentData(result.data[randomIndex]),
        };
      }

      // 没有评论时返回null
      console.log('没有找到任何评论');
      return {
        success: true,
        data: null,
      };
    } catch (error) {
      console.error('获取悬浮播放条评论失败:', error);
      return {
        success: false,
        error: error.message || '获取评论失败',
        data: null,
      };
    }
  }

  // 发表评论（自动记录音频时间点）
  async createComment(userId, podcastId, content, audioTimestamp = 0) {
    try {
      console.log('发表评论:', { userId, podcastId, audioTimestamp });

      if (!userId || !podcastId || !content || !content.trim()) {
        throw new Error('缺少必要参数');
      }

      const commentData = {
        user_id: userId,
        podcast_id: podcastId,
        content: content.trim(),
        audio_timestamp: audioTimestamp,
        like_count: 0,
        is_deleted: false,
        is_pinned: false,
      };

      const result = await this.supabaseRequest('comments', {
        method: 'POST',
        data: commentData,
      });

      if (result.success && result.data.length > 0) {
        console.log('评论发表成功');

        // 同步增加评论量
        try {
          const apiService = require('./api.service.js');
          await apiService.stats.incrementCommentCount(podcastId);
          console.log(`播客 ${podcastId} 评论量已增加`);
        } catch (error) {
          console.warn('增加评论量失败，但不影响评论发表:', error);
        }

        return {
          success: true,
          data: result.data[0],
        };
      } else {
        throw new Error(result.error || '发表评论失败');
      }
    } catch (error) {
      console.error('发表评论失败:', error);
      return {
        success: false,
        error: error.message || '发表评论失败',
      };
    }
  }

  // 回复评论
  async replyToComment(userId, parentCommentId, content) {
    try {
      console.log('回复评论:', { userId, parentCommentId });

      if (!userId || !parentCommentId || !content || !content.trim()) {
        throw new Error('缺少必要参数');
      }

      // 先获取父评论信息以获取podcast_id
      const parentQuery = `id=eq.${parentCommentId}&select=podcast_id,audio_timestamp`;
      const parentResult = await this.supabaseRequest(
        `comments?${parentQuery}`
      );

      if (!parentResult.success || parentResult.data.length === 0) {
        throw new Error('父评论不存在');
      }

      const parentComment = parentResult.data[0];

      const replyData = {
        user_id: userId,
        podcast_id: parentComment.podcast_id,
        parent_id: parentCommentId,
        content: content.trim(),
        audio_timestamp: parentComment.audio_timestamp, // 继承父评论的时间点
        like_count: 0,
        is_deleted: false,
        is_pinned: false,
      };

      const result = await this.supabaseRequest('comments', {
        method: 'POST',
        data: replyData,
      });

      if (result.success && result.data.length > 0) {
        console.log('回复发表成功');
        return {
          success: true,
          data: result.data[0],
        };
      } else {
        throw new Error(result.error || '回复失败');
      }
    } catch (error) {
      console.error('回复评论失败:', error);
      return {
        success: false,
        error: error.message || '回复评论失败',
      };
    }
  }

  // 点赞评论
  async likeComment(userId, commentId) {
    try {
      console.log('点赞评论:', { userId, commentId });

      if (!userId || !commentId) {
        throw new Error('缺少必要参数');
      }

      // 检查是否已经点赞过
      const checkQuery = `user_id=eq.${userId}&comment_id=eq.${commentId}`;
      const checkResult = await this.supabaseRequest(
        `comment_likes?${checkQuery}`
      );

      if (checkResult.success && checkResult.data.length > 0) {
        // 已经点赞，执行取消点赞
        await this.supabaseRequest(
          `comment_likes?user_id=eq.${userId}&comment_id=eq.${commentId}`,
          {
            method: 'DELETE',
          }
        );

        // 减少点赞数
        await this.decrementLikeCount(commentId);

        return {
          success: true,
          data: { isLiked: false },
        };
      } else {
        // 未点赞，执行点赞
        await this.supabaseRequest('comment_likes', {
          method: 'POST',
          data: {
            user_id: userId,
            comment_id: commentId,
          },
        });

        // 增加点赞数
        await this.incrementLikeCount(commentId);

        return {
          success: true,
          data: { isLiked: true },
        };
      }
    } catch (error) {
      console.error('点赞评论失败:', error);
      return {
        success: false,
        error: error.message || '操作失败',
      };
    }
  }

  // 增加评论点赞数
  async incrementLikeCount(commentId) {
    try {
      const currentResult = await this.supabaseRequest(
        `comments?id=eq.${commentId}&select=like_count`
      );

      if (currentResult.success && currentResult.data.length > 0) {
        const currentCount = currentResult.data[0].like_count || 0;
        const newCount = currentCount + 1;

        await this.supabaseRequest(`comments?id=eq.${commentId}`, {
          method: 'PATCH',
          data: { like_count: newCount },
        });

        console.log(`评论 ${commentId} 点赞数更新为 ${newCount}`);
      }
    } catch (error) {
      console.error('更新点赞数失败:', error);
    }
  }

  // 减少评论点赞数
  async decrementLikeCount(commentId) {
    try {
      const currentResult = await this.supabaseRequest(
        `comments?id=eq.${commentId}&select=like_count`
      );

      if (currentResult.success && currentResult.data.length > 0) {
        const currentCount = currentResult.data[0].like_count || 0;
        const newCount = Math.max(0, currentCount - 1);

        await this.supabaseRequest(`comments?id=eq.${commentId}`, {
          method: 'PATCH',
          data: { like_count: newCount },
        });

        console.log(`评论 ${commentId} 点赞数更新为 ${newCount}`);
      }
    } catch (error) {
      console.error('更新点赞数失败:', error);
    }
  }

  // 格式化评论数据
  formatCommentData(rawComment) {
    try {
      // 处理用户信息（可能是嵌套对象或单独字段）
      const user = rawComment.user || rawComment.users || {};

      return {
        id: rawComment.id,
        user_id: rawComment.user_id,
        podcast_id: rawComment.podcast_id,
        parent_id: rawComment.parent_id,
        content: rawComment.content || '',
        audio_timestamp: rawComment.audio_timestamp || 0,
        timestamp_formatted: this.formatTimestamp(
          rawComment.audio_timestamp || 0
        ),
        like_count: rawComment.like_count || 0,
        is_pinned: rawComment.is_pinned || false,
        is_deleted: rawComment.is_deleted || false,
        // 用户信息
        user_nickname: user.nickname || '匿名用户',
        user_avatar:
          user.avatar_url ||
          'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/default-avatar.png',
        // 时间信息
        created_at: rawComment.created_at,
        updated_at: rawComment.updated_at,
        // UI状态
        isLiked: false, // 需要根据当前用户判断
      };
    } catch (error) {
      console.error('格式化评论数据失败:', error);
      return {
        id: rawComment.id,
        content: rawComment.content || '',
        user_nickname: '匿名用户',
        user_avatar:
          'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/icons/default-avatar.png',
        timestamp_formatted: '0:00',
        like_count: 0,
      };
    }
  }

  // 格式化音频时间戳（秒 → MM:SS 或 H:MM:SS）
  formatTimestamp(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  // 置顶评论（管理员功能）
  async pinComment(commentId) {
    try {
      console.log('置顶评论:', commentId);

      const result = await this.supabaseRequest(`comments?id=eq.${commentId}`, {
        method: 'PATCH',
        data: { is_pinned: true },
      });

      if (result.success) {
        console.log('评论置顶成功');
        return {
          success: true,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('置顶评论失败:', error);
      return {
        success: false,
        error: error.message || '置顶失败',
      };
    }
  }

  // 获取用户的所有评论（包含播客信息）
  async getUserComments(userId) {
    try {
      console.log('获取用户评论列表:', userId);

      if (!userId) {
        throw new Error('缺少用户ID参数');
      }

      // 使用Supabase的关联查询获取评论及播客信息(包含channels关联)
      const query = `user_id=eq.${userId}&select=*,podcast:podcast_id(id,title,cover_url,duration,channels(name))&order=created_at.desc`;

      const result = await this.supabaseRequest(`comments?${query}`);

      if (result.success) {
        const comments = result.data.map(comment => {
          const podcast = comment.podcast || {};
          const channels = podcast.channels || {};
          return {
            ...this.formatCommentData(comment),
            // 添加播客信息
            podcast_title: podcast.title || '未知博客',
            podcast_cover: podcast.cover_url || 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/podcast_cover/defult_cover.png',
            podcast_channel: channels.name || '未知频道',
            podcast_duration: podcast.duration || 0,
          };
        });

        console.log(`成功获取用户${userId}的${comments.length}条评论`);
        return {
          success: true,
          data: comments,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('获取用户评论列表失败:', error);
      return {
        success: false,
        error: error.message || '获取评论失败',
        data: [],
      };
    }
  }

  // 取消置顶评论
  async unpinComment(commentId) {
    try {
      console.log('取消置顶评论:', commentId);

      const result = await this.supabaseRequest(`comments?id=eq.${commentId}`, {
        method: 'PATCH',
        data: { is_pinned: false },
      });

      if (result.success) {
        console.log('取消置顶成功');
        return {
          success: true,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('取消置顶失败:', error);
      return {
        success: false,
        error: error.message || '取消置顶失败',
      };
    }
  }
}

// 导出单例
const commentService = new CommentService();
module.exports = commentService;
