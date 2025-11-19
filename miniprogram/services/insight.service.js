// insight服务 - 处理认知提取相关的数据操作
class InsightService {
  constructor() {
    this.supabaseUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co';
    this.supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmZjYWZnbmh6amlhdXVrc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY4NjAsImV4cCI6MjA3MTAwMjg2MH0.uxO5eyw0Usyd59UKz-S7bTrmOnNPg9Ld9wJ6pDMIQUA';
  }

  // 通用的Supabase请求方法
  async supabaseRequest(endpoint, options = {}) {
    const url = `${this.supabaseUrl}/rest/v1/${endpoint}`;
    const headers = {
      apikey: this.supabaseAnonKey,
      Authorization: `Bearer ${this.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    };

    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url,
          method: options.method || 'GET',
          header: headers,
          data: options.data,
          success: resolve,
          fail: reject,
        });
      });

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          success: true,
          data: response.data,
          statusCode: response.statusCode,
        };
      } else {
        console.error('Supabase请求失败:', response);
        return {
          success: false,
          error: response.data?.message || `请求失败 (${response.statusCode})`,
          statusCode: response.statusCode,
        };
      }
    } catch (error) {
      console.error('网络请求失败:', error);
      return {
        success: false,
        error: error.errMsg || '网络请求失败',
        statusCode: 0,
      };
    }
  }

  // 根据播客ID获取insights
  async getInsightsByPodcastId(podcastId) {
    try {
      console.log('获取播客insights:', podcastId);

      // 构建查询参数
      const query = `podcast_id=eq.${podcastId}&status=eq.active&select=*&order=created_at.desc`;

      const result = await this.supabaseRequest(`insights?${query}`);

      if (result.success) {
        const insights = result.data.map(insight =>
          this.formatInsightData(insight)
        );

        console.log(`成功获取${insights.length}条insights`);
        return {
          success: true,
          data: insights,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('获取insights失败:', error);
      return {
        success: false,
        error: error.message || '获取认知提取数据失败',
        data: [],
      };
    }
  }

  // 获取单个insight详情
  async getInsightById(insightId) {
    try {
      console.log('获取insight详情:', insightId);

      const query = `id=eq.${insightId}&status=eq.active&select=*`;

      const result = await this.supabaseRequest(`insights?${query}`);

      if (result.success && result.data.length > 0) {
        const insight = this.formatInsightData(result.data[0]);

        // 更新浏览次数
        await this.incrementViewCount(insightId);

        console.log('成功获取insight详情');
        return {
          success: true,
          data: insight,
        };
      } else {
        throw new Error('未找到对应的认知提取内容');
      }
    } catch (error) {
      console.error('获取insight详情失败:', error);
      return {
        success: false,
        error: error.message || '获取认知提取详情失败',
        data: null,
      };
    }
  }

  // 获取播客的主要insight（通常是第一个系统生成的summary类型）
  async getMainInsightByPodcastId(podcastId) {
    try {
      console.log('获取播客主要insight:', podcastId);

      // 优先获取系统生成的summary类型insight
      const query = `podcast_id=eq.${podcastId}&status=eq.active&insight_type=eq.summary&source_type=eq.system&select=*&order=created_at.asc&limit=1`;

      let result = await this.supabaseRequest(`insights?${query}`);

      // 如果没有summary类型，则获取任意第一个insight
      if (result.success && result.data.length === 0) {
        const fallbackQuery = `podcast_id=eq.${podcastId}&status=eq.active&select=*&order=created_at.asc&limit=1`;
        result = await this.supabaseRequest(`insights?${fallbackQuery}`);
      }

      if (result.success && result.data.length > 0) {
        const insight = this.formatInsightData(result.data[0]);

        // 更新浏览次数
        await this.incrementViewCount(result.data[0].id);

        console.log('成功获取主要insight');
        return {
          success: true,
          data: insight,
        };
      } else {
        // 如果数据库中没有对应的insight，返回默认数据
        console.log('数据库中无insight数据，返回默认数据');
        return this.getDefaultInsightData(podcastId);
      }
    } catch (error) {
      console.error('获取主要insight失败:', error);
      // 出错时也返回默认数据
      return this.getDefaultInsightData(podcastId);
    }
  }

  // 格式化insight数据
  formatInsightData(rawInsight) {
    try {
      return {
        id: rawInsight.id,
        title: rawInsight.title || '认知提取',
        summary: rawInsight.summary || '暂无摘要',
        detailed_content: rawInsight.detailed_content,
        keywords: Array.isArray(rawInsight.keywords) ? rawInsight.keywords : [],
        related_papers: Array.isArray(rawInsight.related_papers)
          ? rawInsight.related_papers
          : [],
        related_authors: Array.isArray(rawInsight.related_authors)
          ? rawInsight.related_authors
          : [],
        audio_timestamp: rawInsight.audio_timestamp,
        duration: rawInsight.duration,
        insight_type: rawInsight.insight_type || 'summary',
        source_type: rawInsight.source_type || 'system',
        like_count: rawInsight.like_count || 0,
        view_count: rawInsight.view_count || 0,
        click_count: rawInsight.click_count || 0,
        display_order: rawInsight.display_order || 0,
        // 认知卡片专用字段（重用summary和related_authors）
        quote_text: rawInsight.summary || '暂无摘要',
        quote_author: this.extractAuthorName(rawInsight.related_authors),
        isLiked: rawInsight.isLiked || false,
        created_at: rawInsight.created_at,
        updated_at: rawInsight.updated_at,
      };
    } catch (error) {
      console.error('格式化insight数据失败:', error);
      return this.getDefaultInsightData().data;
    }
  }

  // 提取作者名称（从related_authors JSONB字段）
  extractAuthorName(relatedAuthors) {
    if (
      !relatedAuthors ||
      !Array.isArray(relatedAuthors) ||
      relatedAuthors.length === 0
    ) {
      return '佚名';
    }

    const firstAuthor = relatedAuthors[0];

    // 处理两种格式：
    // 1. 对象格式：{name: "张三", institution: "xx"}
    // 2. 字符串格式：["张三", "李四"]
    if (typeof firstAuthor === 'object' && firstAuthor.name) {
      return firstAuthor.name;
    } else if (typeof firstAuthor === 'string') {
      return firstAuthor;
    }

    return '佚名';
  }

  // 获取默认insight数据（当数据库中没有数据时使用）
  getDefaultInsightData(podcastId = null) {
    const defaultData = {
      id: 'default',
      title: '认知提取',
      summary:
        '本期播客内容丰富，涵盖了当前热门话题的深度分析，为听众提供了独特的观点和洞察。',
      detailed_content:
        '节目深入探讨了相关主题，通过专业的分析和生动的案例，帮助听众更好地理解复杂的概念和现象。内容具有很强的实用性和启发性。',
      keywords: ['播客', '深度分析', '专业洞察'],
      related_papers: [],
      related_authors: [],
      audio_timestamp: null,
      duration: null,
      insight_type: 'summary',
      source_type: 'system',
      like_count: 0,
      view_count: 0,
      isLiked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      success: true,
      data: defaultData,
    };
  }

  // 增加浏览次数
  async incrementViewCount(insightId) {
    try {
      // 先获取当前浏览次数
      const currentResult = await this.supabaseRequest(
        `insights?id=eq.${insightId}&select=view_count`
      );

      if (currentResult.success && currentResult.data.length > 0) {
        const currentCount = currentResult.data[0].view_count || 0;
        const newCount = currentCount + 1;

        // 更新浏览次数
        const updateResult = await this.supabaseRequest(
          `insights?id=eq.${insightId}`,
          {
            method: 'PATCH',
            data: { view_count: newCount },
          }
        );

        if (updateResult.success) {
          console.log(`insight ${insightId} 浏览次数更新为 ${newCount}`);
        }
      }
    } catch (error) {
      console.error('更新浏览次数失败:', error);
      // 非关键操作，失败不影响主流程
    }
  }

  // 增加点赞次数
  async incrementLikeCount(insightId) {
    try {
      // 先获取当前点赞次数
      const currentResult = await this.supabaseRequest(
        `insights?id=eq.${insightId}&select=like_count`
      );

      if (currentResult.success && currentResult.data.length > 0) {
        const currentCount = currentResult.data[0].like_count || 0;
        const newCount = currentCount + 1;

        // 更新点赞次数
        const updateResult = await this.supabaseRequest(
          `insights?id=eq.${insightId}`,
          {
            method: 'PATCH',
            data: { like_count: newCount },
          }
        );

        if (updateResult.success) {
          console.log(`insight ${insightId} 点赞次数更新为 ${newCount}`);
          return {
            success: true,
            data: { like_count: newCount },
          };
        } else {
          throw new Error(updateResult.error);
        }
      } else {
        throw new Error('未找到对应的认知提取内容');
      }
    } catch (error) {
      console.error('更新点赞次数失败:', error);
      return {
        success: false,
        error: error.message || '点赞失败',
      };
    }
  }

  // 创建用户交互记录（点赞、收藏、分享）
  async createUserInteraction(userId, insightId, interactionType) {
    try {
      if (!userId || !insightId || !interactionType) {
        throw new Error('缺少必要参数');
      }

      const interactionData = {
        user_id: userId,
        insight_id: insightId,
        interaction_type: interactionType,
      };

      const result = await this.supabaseRequest('user_insight_interactions', {
        method: 'POST',
        data: interactionData,
      });

      if (result.success) {
        console.log(`创建用户交互记录成功: ${interactionType}`);
        return {
          success: true,
          data: result.data[0],
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('创建用户交互记录失败:', error);
      return {
        success: false,
        error: error.message || '操作失败',
      };
    }
  }

  // 获取用户对指定insight的交互记录
  async getCurrentUserInteractions(userId, insightId) {
    try {
      if (!userId || !insightId) {
        return {
          success: true,
          data: [],
        };
      }

      const query = `user_id=eq.${userId}&insight_id=eq.${insightId}&select=*`;

      const result = await this.supabaseRequest(
        `user_insight_interactions?${query}`
      );

      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('获取用户交互记录失败:', error);
      return {
        success: false,
        error: error.message || '获取交互记录失败',
        data: [],
      };
    }
  }

  // 获取热门insights
  async getPopularInsights(limit = 10) {
    try {
      console.log('获取热门insights');

      const query = `status=eq.active&select=*&order=like_count.desc,view_count.desc&limit=${limit}`;

      const result = await this.supabaseRequest(`insights?${query}`);

      if (result.success) {
        const insights = result.data.map(insight =>
          this.formatInsightData(insight)
        );

        console.log(`成功获取${insights.length}条热门insights`);
        return {
          success: true,
          data: insights,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('获取热门insights失败:', error);
      return {
        success: false,
        error: error.message || '获取热门内容失败',
        data: [],
      };
    }
  }

  // 按点击次数排序获取insights（智能排序 - 新增方法）
  async getInsightsByClickCount(podcastId) {
    try {
      console.log('按点击次数获取insights:', podcastId);

      // 按view_count降序,like_count降序,created_at降序排序
      // 注意：数据库暂无click_count字段，使用view_count作为排序依据
      const query = `podcast_id=eq.${podcastId}&status=eq.active&select=*&order=view_count.desc,like_count.desc,created_at.desc`;

      const result = await this.supabaseRequest(`insights?${query}`);

      if (result.success) {
        const insights = result.data.map(insight =>
          this.formatInsightData(insight)
        );

        console.log(`成功获取${insights.length}条insights（按点击次数排序）`);
        return {
          success: true,
          data: insights,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('按点击次数获取insights失败:', error);
      return {
        success: false,
        error: error.message || '获取认知卡片失败',
        data: [],
      };
    }
  }

  // 增加点击次数（新增方法）
  async incrementClickCount(insightId) {
    try {
      // 先获取当前点击次数
      const currentResult = await this.supabaseRequest(
        `insights?id=eq.${insightId}&select=click_count`
      );

      if (currentResult.success && currentResult.data.length > 0) {
        const currentCount = currentResult.data[0].click_count || 0;
        const newCount = currentCount + 1;

        // 更新点击次数
        const updateResult = await this.supabaseRequest(
          `insights?id=eq.${insightId}`,
          {
            method: 'PATCH',
            data: { click_count: newCount },
          }
        );

        if (updateResult.success) {
          console.log(`insight ${insightId} 点击次数更新为 ${newCount}`);
          return {
            success: true,
            data: { click_count: newCount },
          };
        } else {
          throw new Error(updateResult.error);
        }
      } else {
        throw new Error('未找到对应的认知提取内容');
      }
    } catch (error) {
      console.error('更新点击次数失败:', error);
      // 非关键操作,失败不影响主流程
      return {
        success: false,
        error: error.message || '更新点击次数失败',
      };
    }
  }
}

// 导出单例实例
const insightService = new InsightService();

module.exports = insightService;
