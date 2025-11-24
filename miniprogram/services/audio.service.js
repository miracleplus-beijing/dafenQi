/**
 * 音频服务
 * 处理音频播放、下载、上传等功能
 */
class AudioService {
  constructor() {
    this.supabaseUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co';
    this.supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmZjYWZnbmh6amlhdXVrc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY4NjAsImV4cCI6MjA3MTAwMjg2MH0.uxO5eyw0Usyd59UKz-S7bTrmOnNPg9Ld9wJ6pDMIQUA';
    this.authService = require('./auth.service.js');
  }

  // 获取 Supabase 密钥
  getSupabaseAnonKey() {
    return this.supabaseAnonKey;
  }

  /**
   * 检查当前用户是否已登录
   * @returns {boolean} 是否已登录
   */
  isUserLoggedIn() {
    const session = this.authService.getSession();
    return session?.access_token !== null && session?.access_token !== undefined;
  }

  /**
   * 获取单个播客详情
   * @param {string} podcastId - 播客ID
   * @returns {Promise<Object>} 播客详情
   */
  async getPodcastDetail(podcastId) {
    try {
      const url = `${this.supabaseUrl}/rest/v1/podcasts?id=eq.${podcastId}&select=*,channels(name,description)`;
      const response = await this.makeRequest(url, 'GET');

      if (response.data && response.data.length > 0) {
        return {
          success: true,
          data: response.data[0],
        };
      } else {
        return {
          success: false,
          error: '播客不存在',
        };
      }
    } catch (error) {
      console.error('获取播客详情失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 记录播放历史
   * @param {string} userId - 用户ID
   * @param {string} podcastId - 播客ID
   * @param {number} playPosition - 播放位置(秒)
   * @param {number} playDuration - 播放时长(秒)
   * @returns {Promise<Object>} 操作结果
   */
  async recordPlayHistory(
    userId,
    podcastId,
    playPosition = 0,
    playDuration = 0
  ) {
    try {
      // 检查用户是否已登录
      if (!this.isUserLoggedIn()) {
        console.warn('用户未登录，跳过播放历史记录');
        return { success: true, message: '未登录用户，跳过历史记录' };
      }

      const url = `${this.supabaseUrl}/rest/v1/user_play_history`;

      const data = {
        user_id: userId,
        podcast_id: podcastId,
        play_position: playPosition,
        play_duration: playDuration,
        completed:
          playPosition > 0 &&
          playDuration > 0 &&
          playPosition >= playDuration * 0.9,
        played_at: new Date().toISOString(),
      };

      // 明确要求用户认证
      await this.makeRequest(url, 'POST', data, true);

      // 同时更新播客的播放次数
      await this.incrementPlayCount(podcastId);

      return { success: true };
    } catch (error) {
      console.error('记录播放历史失败:', error);

      // 如果是权限问题，给用户友好的提示
      if (
        error.message.includes('权限不足') ||
        error.message.includes('未登录')
      ) {
        return {
          success: false,
          error: '请先登录后再播放',
          errorType: 'auth_required',
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }


  /**
   * 添加到收藏
   * @param {string} userId - 用户ID
   * @param {string} podcastId - 播客ID
   * @returns {Promise<Object>} 操作结果
   */
  async addToFavorites(userId, podcastId) {
    try {
      // 检查用户是否已登录
      if (!this.isUserLoggedIn()) {
        return {
          success: false,
          error: '请先登录后再收藏',
          errorType: 'auth_required',
        };
      }

      const url = `${this.supabaseUrl}/rest/v1/user_favorites`;

      const data = {
        user_id: userId,
        podcast_id: podcastId,
        created_at: new Date().toISOString(),
      };

      // 需要用户认证
      await this.makeRequest(url, 'POST', data, true);

      console.log('添加收藏成功, podcastId：', podcastId);

      return { success: true };
    } catch (error) {
      console.error('添加收藏失败:', error);
      return {
        success: false,
        error: error.message.includes('权限不足')
          ? '请先登录后再收藏'
          : error.message,
      };
    }
  }

  /**
   * 删除收藏
   * @param {string} userId - 用户ID
   * @param {string} podcastId - 播客ID
   * @returns {Promise<Object>} 操作结果
   */
  async removeFromFavorites(userId, podcastId) {
    try {
      // 检查用户是否已登录
      if (!this.isUserLoggedIn()) {
        return {
          success: false,
          error: '请先登录后再取消收藏',
          errorType: 'auth_required',
        };
      }

      const url = `${this.supabaseUrl}/rest/v1/user_favorites?user_id=eq.${userId}&podcast_id=eq.${podcastId}`;

      // 需要用户认证
      await this.makeRequest(url, 'DELETE', null, true);
      console.log('取消收藏成功, podcastId：', podcastId);

      return { success: true };
    } catch (error) {
      console.error('删除收藏失败:', error);
      return {
        success: false,
        error: error.message.includes('权限不足')
          ? '请先登录后再取消收藏'
          : error.message,
      };
    }
  }
  /**
   * 检查是否已收藏
   * @param {string} userId - 用户ID
   * @param {string} podcastId - 播客ID
   * @returns {Promise<boolean>} 是否已收藏
   */
  async checkIsFavorited(userId, podcastId) {
    const url = `${this.supabaseUrl}/rest/v1/user_favorites?user_id=eq.${userId}&podcast_id=eq.${podcastId}&select=id`;
    const response = await this.makeRequest(url, 'GET');

    return response.data && response.data.length > 0;

  }

  /**
   * 上传音频文件到 Supabase Storage
   * @param {string} filePath - 本地文件路径
   * @param {string} fileName - 文件名
   * @returns {Promise<Object>} 上传结果
   */
  async uploadAudioFile(filePath, fileName) {
    try {
      // 读取本地文件
      const fileContent = await this.readLocalFile(filePath);

      // 上传到 Supabase Storage
      const uploadUrl = `${this.supabaseUrl}/storage/v1/object/podcast-audios/${fileName}`;

      const response = await wx.request({
        url: uploadUrl,
        method: 'POST',
        header: {
          Authorization: `Bearer ${this.getSupabaseAnonKey()}`,
          'Content-Type': 'audio/mpeg',
        },
        data: fileContent,
      });

      if (response.statusCode === 200) {
        // 获取公共 URL
        const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/podcast-audios/${fileName}`;

        return {
          success: true,
          url: publicUrl,
          fileName,
        };
      } else {
        throw new Error(`上传失败: ${response.statusCode}`);
      }
    } catch (error) {
      console.error('上传音频失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 读取本地文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<ArrayBuffer>} 文件内容
   */
  readLocalFile(filePath) {
    return new Promise((resolve, reject) => {
      const fs = wx.getFileSystemManager();
      fs.readFile({
        filePath,
        success: res => resolve(res.data),
        fail: reject,
      });
    });
  }

  /**
   * 发起网络请求
   * @param {string} url - 请求地址
   * @param {string} method - 请求方法
   * @param {Object} data - 请求数据
   * @param {boolean} requireAuth - 是否需要用户认证
   * @returns {Promise<Object>} 响应结果
   */
  makeRequest(url, method = 'GET', data = null, requireAuth = false) {
    return new Promise((resolve, reject) => {
      // 智能选择认证方式
      const session = this.authService.getSession();
      const userToken = session?.access_token;
      let authorizationHeader;

      if (requireAuth && !userToken) {
        // 需要认证但用户未登录，直接拒绝请求
        reject(new Error('用户未登录，无法执行此操作'));
        return;
      }

      if (userToken && (requireAuth || url.includes('user_'))) {
        // 使用用户JWT token（对于需要认证的操作或用户相关的表）
        authorizationHeader = `Bearer ${userToken}`;
        console.log('使用用户JWT token进行认证请求');
      } else {
        // 使用匿名token（对于公开操作）
        authorizationHeader = `Bearer ${this.supabaseAnonKey}`;
        console.log('使用匿名token进行公开请求');
      }

      const requestOptions = {
        url,
        method,
        header: {
          apikey: this.supabaseAnonKey,
          'Content-Type': 'application/json',
          Authorization: authorizationHeader,
          Prefer: 'return=representation',
        },
        success: res => {
          console.log('网络请求响应:', {
            statusCode: res.statusCode,
            data: res.data,
            header: res.header,
            authType: userToken ? 'user' : 'anonymous',
          });

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: res.data });
          } else {
            const errorMsg = `HTTP ${res.statusCode}: ${(res.data && res.data.message) || res.errMsg}`;
            console.error('API请求失败:', errorMsg);

            // 特殊处理RLS权限错误
            if (
              res.statusCode === 401 &&
              res.data &&
              res.data.message &&
              res.data.message.includes('row-level security')
            ) {
              console.error('RLS权限错误，用户可能未登录或无权限访问此资源');
              reject(new Error('权限不足，请先登录'));
            } else {
              reject(new Error(errorMsg));
            }
          }
        },
        fail: error => {
          reject(new Error('网络请求失败: ' + error.errMsg));
        },
      };

      if (
        data &&
        (method === 'POST' || method === 'PUT' || method === 'PATCH')
      ) {
        requestOptions.data = data;
      }

      wx.request(requestOptions);
    });
  }
}

// 创建并导出音频服务实例
const audioService = new AudioService();
module.exports = audioService;
