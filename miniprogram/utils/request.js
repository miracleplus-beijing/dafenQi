// HTTP 请求工具类
const { getCurrentConfig } = require('../config/supabase.config.js')

class RequestUtil {
  constructor() {
    this.config = getCurrentConfig()
    this.baseURL = this.config.url
    this.timeout = this.config.timeout
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'apikey': this.config.anonKey
    }
  }

  // 获取认证令牌
  async getAuthToken() {
    try {
      const session = wx.getStorageSync('supabase_session')
      return session ? session.access_token : null
    } catch (error) {
      console.error('获取认证令牌失败:', error)
      return null
    }
  }

  // 通用请求方法
  async request(options) {
    const {
      url,
      method = 'GET',
      data,
      headers = {},
      needAuth = true
    } = options

    // 构建请求头
    const requestHeaders = { ...this.defaultHeaders, ...headers }
    
    // 添加认证头
    if (needAuth) {
      const token = await this.getAuthToken()
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`
      }
    }

    return new Promise((resolve, reject) => {
      if (this.config.debug) {
        console.log('发起请求:', {
          url: `${this.baseURL}${url}`,
          method,
          data,
          headers: requestHeaders
        })
      }

      wx.request({
        url: `${this.baseURL}${url}`,
        method,
        data,
        header: requestHeaders,
        timeout: this.timeout,
        success: (res) => {
          if (this.config.debug) {
            console.log('请求响应:', res)
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)
          } else {
            const error = new Error(`HTTP ${res.statusCode}: ${res.errMsg}`)
            error.statusCode = res.statusCode
            error.response = res.data
            reject(error)
          }
        },
        fail: (error) => {
          console.error('请求失败:', error)
          reject(new Error(`网络请求失败: ${error.errMsg}`))
        }
      })
    })
  }

  // GET 请求
  async get(url, params = {}, options = {}) {
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
    
    const fullUrl = queryString ? `${url}?${queryString}` : url
    
    return this.request({
      url: fullUrl,
      method: 'GET',
      ...options
    })
  }

  // POST 请求
  async post(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'POST',
      data,
      ...options
    })
  }

  // PUT 请求
  async put(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'PUT',
      data,
      ...options
    })
  }

  // PATCH 请求
  async patch(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'PATCH',
      data,
      ...options
    })
  }

  // DELETE 请求
  async delete(url, options = {}) {
    return this.request({
      url,
      method: 'DELETE',
      ...options
    })
  }

  // 文件上传请求
  async upload(url, filePath, formData = {}, options = {}) {
    const token = await this.getAuthToken()
    const headers = {
      'apikey': this.config.anonKey,
      ...options.headers
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${this.baseURL}${url}`,
        filePath,
        name: 'file',
        formData,
        header: headers,
        timeout: this.timeout,
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data)
            } else {
              reject(new Error(`上传失败: ${data.message || res.errMsg}`))
            }
          } catch (error) {
            reject(new Error('响应解析失败'))
          }
        },
        fail: reject
      })
    })
  }
}

// 创建单例实例
const requestUtil = new RequestUtil()

module.exports = requestUtil