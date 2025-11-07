// HTTP 请求工具类
const { getCurrentConfig } = require('../config/supabase.config.js');

class RequestUtil {
  constructor() {
    this.config = getCurrentConfig();
    console.log(this.config);
    this.baseURL = this.config.baseURL;
    this.timeout = this.config.timeout;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      apikey: this.config.anonKey,
    };
  }

  // 获取认证令牌（已弃用，使用getValidAuthToken代替）
  async getAuthToken() {
    try {
      const session = wx.getStorageSync('supabase_session');
      return session ? session.access_token : null;
    } catch (error) {
      console.error('获取认证令牌失败:', error);
      return null;
    }
  }

  // 获取有效认证令牌（带智能验证）
  async getValidAuthToken() {
    try {
      const session = wx.getStorageSync('supabase_session');
      if (!session?.access_token) {
        console.log('无Session或access_token，将使用匿名访问');
        return null;
      }

      // 检查token是否即将过期（提前5分钟续签）
      if (this.isTokenExpiringSoon(session)) {
        console.log('Token即将过期，尝试提前续签');
        const refreshResult = await this.refreshSessionToken();
        if (refreshResult.success) {
          return refreshResult.session.access_token;
        } else {
          console.log('提前续签失败，使用当前token');
        }
      }

      return session.access_token;
    } catch (error) {
      console.error('获取token失败:', error);
      return null;
    }
  }

  // 检查token是否即将过期（提前5分钟）
  isTokenExpiringSoon(session) {
    if (!session?.expires_at) {
      return false;
    }

    const expiresAt = new Date(session.expires_at * 1000); // expires_at是Unix时间戳
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    return expiresAt <= fiveMinutesFromNow;
  }

  // 使用refresh token刷新会话
  async refreshSessionToken() {
    try {
      const session = wx.getStorageSync('supabase_session');
      if (!session?.refresh_token) {
        console.error('无refresh_token，无法续签');
        return { success: false, error: '无refresh_token' };
      }

      console.log('开始自动续签token...');

      const response = await this.callRefreshTokenAPI(session.refresh_token);
      if (response.success) {
        // 更新本地存储的session
        const newSession = response.session;
        wx.setStorageSync('supabase_session', newSession);

        // 更新全局状态
        const app = getApp();
        if (app && app.globalData) {
          app.globalData.userInfo = response.user;
          app.globalData.isLoggedIn = true;
          app.globalData.isGuestMode = false;
        }

        console.log('Token续签成功');
        return { success: true, session: newSession };
      } else {
        console.error('续签失败:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('续签过程出错:', error);
      return { success: false, error: error.message };
    }
  }

  // 调用后端refresh token API
  async callRefreshTokenAPI(refreshToken) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.baseURL}/functions/v1/wechat-auth`,
        method: 'POST',
        data: {
          code: 'refresh_session',
          refresh_token: refreshToken
        },
        header: {
          'Content-Type': 'application/json',
          'apikey': this.config.anonKey
        },
        timeout: 10000,
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            resolve(res.data);
          } else {
            resolve({
              success: false,
              error: res.data?.error || `HTTP ${res.statusCode}`
            });
          }
        },
        fail: (error) => {
          reject(new Error(`续签API调用失败: ${error.errMsg}`));
        }
      });
    });
  }

  // 清理过期session
  clearExpiredSession() {
    try {
      wx.removeStorageSync('supabase_session');
      wx.removeStorageSync('lastLoginTime');
      console.log('已清理过期session');
    } catch (error) {
      console.error('清理session失败:', error);
    }
  }

  // 退出登录状态
  logoutUser() {
    try {
      // 清理本地存储的认证信息
      wx.removeStorageSync('supabase_session');
      wx.removeStorageSync('lastLoginTime');

      // 更新全局状态
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = null;
        app.globalData.isLoggedIn = false;
        app.globalData.isGuestMode = true;
        // 清理用户相关数据
        app.globalData.favoriteList = [];
        app.globalData.historyList = [];
      }

      console.log('用户已退出登录');

      // 显示提示消息
      wx.showToast({
        title: '登录已过期，请重新登录',
        icon: 'none',
        duration: 2000,
      });

      // 延迟跳转到登录页面，让用户看到提示
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login',
        });
      }, 1500);
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  }

  // API权限分类 - 可以匿名访问的API
  canUseAnonymousAccess(url) {
    const ANONYMOUS_ALLOWED_APIS = [
      '/rest/v1/podcasts',
      '/rest/v1/channels',
      '/rest/v1/insights',
      '/rest/v1/users',
      '/rest/v1/user_favorites',
      '/rest/v1/research_fields',
      '/rest/v1/institutions',
    ];

    return ANONYMOUS_ALLOWED_APIS.some(path => url.includes(path));
  }

  // 需要认证但可以友好提示的API
  requiresAuthWithPrompt(url) {
    const AUTH_REQUIRED_APIS = [
      '/rest/v1/comments',
      '/rest/v1/user_likes',
      '/rest/v1/user_play_history',
    ];

    return AUTH_REQUIRED_APIS.some(path => url.includes(path));
  }

  // 智能降级的请求方法
  async request(options) {
    const {
      url,
      method = 'GET',
      data,
      headers = {},
      needAuth = true,
      retryWithoutAuth = true,
      isRetryAfterRefresh = false, // 新增：标记是否为续签后的重试请求
    } = options;

    // 构建请求头
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    // 智能认证处理
    if (needAuth) {
      // 第一步：尝试获取有效JWT token
      const token = await this.getValidAuthToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
        console.log('使用JWT token认证');
      } else {
        // 第二步：判断是否可以降级到匿名访问
        if (this.canUseAnonymousAccess(url)) {
          console.log(`JWT不可用，降级到匿名访问: ${url}`);
          // 使用anon key，不设置Authorization头
        } else if (this.requiresAuthWithPrompt(url)) {
          // 第三步：需要认证的API返回友好错误
          throw new AuthRequiredError('此功能需要登录使用');
        } else {
          console.log('未知API类型，尝试匿名访问');
        }
      }
    }

    return new Promise((resolve, reject) => {
      if (this.config.debug) {
        console.log('发起请求:', {
          url: `${this.baseURL}${url}`,
          method,
          data,
          headers: requestHeaders,
          isRetryAfterRefresh,
        });
      }

      wx.request({
        url: `${this.baseURL}${url}`,
        method,
        data,
        header: requestHeaders,
        timeout: this.timeout,
        success: res => {
          if (this.config.debug) {
            console.log('请求响应:', res);
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            // 401错误的智能处理
            this.handle401Error(res, options, resolve, reject);
          } else {
            const error = new Error(`HTTP ${res.statusCode}: ${res.errMsg}`);
            error.statusCode = res.statusCode;
            error.response = res.data;
            reject(error);
          }
        },
        fail: error => {
          console.error('请求失败:', error);
          reject(new Error(`网络请求失败: ${error.errMsg}`));
        },
      });
    });
  }

  // 处理401错误的智能续签逻辑
  async handle401Error(res, originalOptions, resolve, reject) {
    const { needAuth, retryWithoutAuth, isRetryAfterRefresh, url } = originalOptions;

    console.log('收到401错误，开始智能处理', {
      needAuth,
      isRetryAfterRefresh,
      url
    });

    // 如果是续签后的重试请求仍然401，说明续签失败，需要重新登录
    if (isRetryAfterRefresh) {
      console.log('续签后重试仍然401，执行退出登录');
      this.logoutUser();
      reject(new AuthRequiredError('登录已过期，请重新登录'));
      return;
    }

    // 如果当前请求需要认证，且有存储的session，尝试自动续签
      try {
        const session = wx.getStorageSync('supabase_session');
        if (session?.access_token && session?.refresh_token) {
          console.log('检测到有效session，尝试自动续签');

          // 尝试自动续签
          const refreshResult = await this.refreshSessionToken();
          if (refreshResult.success) {
            console.log('续签成功，重试原始请求');
            // 续签成功，重试原始请求
            this.request({
              ...originalOptions,
              isRetryAfterRefresh: true, // 标记为续签后的重试
            })
              .then(resolve)
              .catch(reject);
            return;
          } else {
            console.log('续签失败:', refreshResult.error);
            // 续签失败，清理session并降级处理
            this.clearExpiredSession();
          }
        } else {
          console.log('无有效session信息');
        }
      } catch (error) {
        console.error('续签过程出错:', error);
      }

    // 降级处理逻辑（续签失败或无session时）
    if (needAuth && retryWithoutAuth && this.canUseAnonymousAccess(url)) {
      console.log('JWT认证失败，自动重试匿名访问');
      this.request({
        ...originalOptions,
        needAuth: false,
        retryWithoutAuth: false,
      })
        .then(resolve)
        .catch(reject);
    } else if (this.requiresAuthWithPrompt(url)) {
      reject(new AuthRequiredError('请登录后使用此功能'));
    } else {
      reject(
        new Error(
          `认证失败: ${res.statusCode} - ${JSON.stringify(res.data)}`
        )
      );
    }
  }

  // GET 请求
  async get(url, params = {}, options = {}) {
    const queryString = Object.keys(params)
      .map(
        key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join('&');

    const fullUrl = queryString ? `${url}?${queryString}` : url;

    return this.request({
      url: fullUrl,
      method: 'GET',
      ...options,
    });
  }

  // GET 请求（强制认证，不允许降级）
  async getAuthenticated(url, params = {}, options = {}) {
    const queryString = Object.keys(params)
      .map(
        key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join('&');

    const fullUrl = queryString ? `${url}?${queryString}` : url;

    return this.request({
      url: fullUrl,
      method: 'GET',
      needAuth: true,
      retryWithoutAuth: false,
      ...options,
    });
  }

  // POST 请求
  async post(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'POST',
      data,
      ...options,
    });
  }

  // PUT 请求
  async put(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'PUT',
      data,
      ...options,
    });
  }

  // PATCH 请求
  async patch(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'PATCH',
      data,
      ...options,
    });
  }

  // DELETE 请求
  async delete(url, options = {}) {
    return this.request({
      url,
      method: 'DELETE',
      ...options,
    });
  }

  // 文件上传请求
  async upload(url, filePath, formData = {}, options = {}) {
    const token = await this.getAuthToken();
    const headers = {
      apikey: this.config.anonKey,
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${this.baseURL}${url}`,
        filePath,
        name: 'file',
        formData,
        header: headers,
        timeout: this.timeout,
        success: res => {
          try {
            const data = JSON.parse(res.data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(`上传失败: ${data.message || res.errMsg}`));
            }
          } catch (e) {
            reject(new Error('响应解析失败:' + e.message));
          }
        },
        fail: reject,
      });
    });
  }
}

// 自定义错误类
class AuthRequiredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthRequiredError';
    this.needLogin = true;
  }
}

// 创建单例实例
const requestUtil = new RequestUtil();

module.exports = requestUtil;
module.exports.AuthRequiredError = AuthRequiredError;
