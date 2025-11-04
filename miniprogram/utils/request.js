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

      // todo 检查token是否过期
      // if (false) {
      //   console.log('Token已过期，清理session并降级到匿名访问');
      //   this.clearExpiredSession();
      //   return null;
      // }

      return session.access_token;
    } catch (error) {
      console.error('获取token失败:', error);
      return null;
    }
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
            console.log('收到401错误，认证失败');

            // 如果当前请求需要认证，说明token可能已经失效
            if (needAuth) {
              // 检查是否有存储的token，如果有说明token失效了
              try {
                const session = wx.getStorageSync('supabase_session');
                if (session?.access_token) {
                  // 有token但仍然401，说明token已失效，执行退出登录
                  console.log('Token失效，执行退出登录');
                  this.logoutUser();
                  reject(new AuthRequiredError('登录已过期，请重新登录'));
                  return;
                }
              } catch (error) {
                console.error('检查session失败:', error);
              }
            }

            // 原有的降级处理逻辑
            if (
              needAuth &&
              retryWithoutAuth &&
              this.canUseAnonymousAccess(url)
            ) {
              console.log('JWT认证失败，自动重试匿名访问');
              this.request({
                ...options,
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
