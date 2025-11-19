// 文件存储服务
const requestUtil = require('../utils/request.js');
const { STORAGE_BUCKETS } = require('../config/supabase.config.js');
let authService;
import Toast from 'tdesign-miniprogram/toast';

class StorageService {
  constructor() {
    this.buckets = STORAGE_BUCKETS;
    this.supabaseUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co';
    this.supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmZjYWZnbmh6amlhdXVrc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY4NjAsImV4cCI6MjA3MTAwMjg2MH0.uxO5eyw0Usyd59UKz-S7bTrmOnNPg9Ld9wJ6pDMIQUA';
    this.userProfileBucket = 'user_profile';
    this.authService = require('./auth.service.js');
    // 文件类型配置
    this.fileTypes = {
      avatar: 'avatars',
      cover: 'covers',
      document: 'documents',
    };
  }

  // 上传文件到指定桶
  async uploadFile(bucketName, filePath, fileName, options = {}) {
    try {
      const { contentType, cacheControl = '3600', upsert = false } = options;

      // 构建上传 URL
      const uploadUrl = `/storage/v1/object/${bucketName}/${fileName}${upsert ? '?upsert=true' : ''}`;

      // 准备表单数据
      const formData = {};
      if (cacheControl) {
        formData['cacheControl'] = cacheControl;
      }

      // 上传文件
      const result = await requestUtil.upload(uploadUrl, filePath, formData, {
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
        },
      });

      // 获取公共访问 URL
      const publicUrl = this.getPublicUrl(bucketName, fileName);

      return {
        success: true,
        data: result,
        publicUrl: publicUrl,
        path: `${bucketName}/${fileName}`,
      };
    } catch (error) {
      console.error('文件上传失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // 上传 SVG 图标
  async uploadSVG(filePath, fileName) {
    return this.uploadFile(this.buckets.SVG_ICONS, filePath, fileName, {
      contentType: 'image/svg+xml',
      upsert: true,
    });
  }

  // 上传音频文件
  async uploadAudio(filePath, fileName) {
    return this.uploadFile(this.buckets.AUDIO_FILES, filePath, fileName, {
      contentType: 'audio/mpeg',
      cacheControl: '86400', // 24小时缓存
    });
  }

  // 上传封面图片
  async uploadCoverImage(filePath, fileName) {
    return this.uploadFile(this.buckets.COVER_IMAGES, filePath, fileName, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  }

  // 批量上传本地 SVG 文件
  async batchUploadLocalSVGs() {
    const svgFiles = [
      '分类.svg',
      'browse.svg',
      'user.svg',
      'search.svg',
      '播放-大.svg',
      'play-small.svg',
      '暂停.svg',
      '收藏-已选择.svg',
      '收藏-未选择.svg',
      '喜欢-已选择.svg',
      '喜欢-未选择.svg',
      '点赞-已选择.svg',
      '点赞-未选择.svg',
      '前进30秒.svg',
      '后退15秒.svg',
      'settings.svg',
      'history.svg',
      'back.svg',
      '分享.svg',
      '评论.svg',
      'feedback.svg',
    ];

    const results = [];

    for (const fileName of svgFiles) {
      try {
        console.log(`正在上传: ${fileName}`);

        // 从本地读取文件
        const localPath = `images/icons/${fileName}`;
        const result = await this.uploadSVG(localPath, fileName);

        results.push({
          fileName,
          ...result,
        });

        // 添加延迟避免请求过快
        await this.delay(500);
      } catch (error) {
        console.error(`上传 ${fileName} 失败:`, error);
        results.push({
          fileName,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  // 获取文件列表
  async listFiles(bucketName, options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        search = '',
        sortBy = { column: 'name', order: 'asc' },
      } = options;

      const params = {
        limit,
        offset,
      };

      if (search) {
        params.search = search;
      }

      if (sortBy) {
        params.sortBy = JSON.stringify(sortBy);
      }

      const result = await requestUtil.post(
        `/storage/v1/object/list/${bucketName}`,
        params
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('获取文件列表失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // 删除文件
  async deleteFile(bucketName, fileName) {
    try {
      await requestUtil.delete(`/storage/v1/object/${bucketName}/${fileName}`);

      return {
        success: true,
        message: '文件删除成功',
      };
    } catch (error) {
      console.error('删除文件失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // 获取文件公共访问 URL
  getPublicUrl(bucketName, fileName) {
    const { config } = require('../config/supabase.config.js');
    console.log(config);
    return `${config.supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
  }

  // 获取签名 URL（用于私有文件）
  async getSignedUrl(bucketName, fileName, expiresIn = 3600) {
    try {
      const result = await requestUtil.post(
        `/storage/v1/object/sign/${bucketName}/${fileName}`,
        {
          expiresIn,
        }
      );

      return {
        success: true,
        signedUrl: result.signedURL,
      };
    } catch (error) {
      console.error('获取签名URL失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 上传文件到user_profile private bucket
   * @param {string} userId - 用户ID
   * @param {string} fileType - 文件类型 (avatar, cover, document)
   * @param {string} tempFilePath - 微信临时文件路径
   * @param {Object} options - 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  async uploadUserFileToPublicBucket(
    userId,
    fileType,
    tempFilePath,
    bucketName,
    options = {}
  ) {
    authService = require('./auth.service.js');

    try {
      // 验证文件类型
      if (!this.fileTypes[fileType]) {
        throw new Error(`不支持的文件类型: ${fileType}`);
      }

      // 读取临时文件
      const fileData = await this.readTempFile(tempFilePath);
      console.log(
        '临时文件读取成功，大小:',
        fileData.byteLength || fileData.length
      );

      // 生成文件名
      const timestamp = Date.now();
      const fileExtension = this.getFileExtension(tempFilePath) || 'jpg';
      const fileName = `${userId}/${this.fileTypes[fileType]}/${fileType}_${timestamp}.${fileExtension}`;

      console.log('准备上传文件到private bucket:', fileName);

      // 使用带认证的上传方法（带一次性重试）
      let uploadResponse = await this.supabaseStorageRequest({
        method: 'POST',
        path: fileName,
        file: fileData,
        options: {
          contentType: options.contentType || 'image/jpeg',
          upsert: true,
        },
      });

      if (uploadResponse.error) {
        const msg = String(uploadResponse.error.message || '');
        console.warn('文件上传失败，检查是否为token过期导致，错误信息:', msg);
        const maybeAuthError = /401|403|Unauthorized|exp/i.test(msg);
        if (maybeAuthError) {
          console.warn('刷新后重试上传异常:', uploadResponse.error);

          Toast({
            context: this,
            selector: '#t-toast',
            message: '错误文案',
            theme: 'error',
            direction: 'column',
          });
        }

        if (uploadResponse.error) {
          console.error('文件上传失败(最终):', uploadResponse.error);
          throw new Error(uploadResponse.error.message || '文件上传失败');
        }
      }

      console.log('文件上传成功:', uploadResponse);

      return {
        success: true,
        path: `${this.userProfileBucket}/${fileName}`,
        bucket: this.userProfileBucket,
        publicUrl: this.getPublicUrl(this.userProfileBucket, fileName),
        uploadResponse,
      };
    } catch (error) {
      console.error('文件上传失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 为private bucket文件生成签名URL (遵循Supabase最佳实践)
   * @param {string} filePath - 文件路径
   * @param {number} expiresIn - 过期时间(秒)，默认7天
   * @returns {Promise<Object>} 签名URL结果
   */
  async generateUserFileSignedUrl(filePath, expiresIn = 604800) {
    // 默认7天
    authService = require('./auth.service.js');
    try {
      // 使用getCurrentUser()检查用户状态，遵循Supabase最佳实践
      const currentUser = authService.getCurrentUser();

      if (!currentUser) {
        throw new Error('用户未登录，无法生成签名URL');
      }

      // 获取token用于API认证
      const sessionResult = authService.getSession();
      let userToken = sessionResult?.access_token;

      // 验证token格式和有效性
      if (!userToken || typeof userToken !== 'string') {
        console.error('用户token为空或格式无效');
        await this.clearInvalidSession();
        throw new Error('用户认证状态无效，请重新登录');
      }

      const tokenParts = userToken.split('.');
      if (tokenParts.length !== 3) {
        console.error('JWT token格式无效，parts:', tokenParts.length);
        await this.clearInvalidSession();
        throw new Error('用户认证token格式无效，请重新登录');
      }

      console.log('使用有效JWT token生成签名URL:', {
        tokenParts: tokenParts.length,
        tokenStart: userToken.substring(0, 20) + '...',
        filePath: filePath,
        expiresIn: expiresIn,
      });

      const response = await this.supabaseRequestWithAuth({
        url: `/storage/v1/object/sign/${this.userProfileBucket}/${filePath}`,
        method: 'POST',
        data: {
          expiresIn: expiresIn,
        },
        authToken: userToken,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const signedUrl = `${this.supabaseUrl}${response.signedURL}`;

      console.log('签名URL生成成功:', {
        signedUrl: signedUrl,
        expiresIn: expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });

      return {
        success: true,
        signedUrl: signedUrl,
        expiresIn: expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };
    } catch (error) {
      console.error('生成签名URL失败:', error);

      // 提供更友好的错误消息
      let errorMessage = error.message;
      if (error.message?.includes('Invalid Compact JWS')) {
        errorMessage = '用户认证已过期，请重新登录';
      } else if (error.message?.includes('Unauthorized')) {
        errorMessage = '没有权限访问此文件，请重新登录';
      } else if (error.message?.includes('exp')) {
        errorMessage = 'token已过期，请重新登录';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 清理无效的本地session
   */
  async clearInvalidSession() {
    try {
      console.log('清理无效的本地session...');

      // 清理本地存储
      wx.removeStorageSync('supabase_session');
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('lastLoginTime');

      // 清理auth service中的状态
      if (authService.logout) {
        await authService.logout();
      }

      console.log('本地session清理完成');
    } catch (error) {
      console.error('清理本地session失败:', error);
    }
  }

  /**
   * 读取微信临时文件
   * @param {string} tempFilePath - 临时文件路径
   * @returns {Promise<ArrayBuffer>} 文件数据
   */
  async readTempFile(tempFilePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: tempFilePath,
        success: res => resolve(res.data),
        fail: reject,
      });
    });
  }

  /**
   * 获取文件扩展名
   * @param {string} filePath - 文件路径
   * @returns {string} 扩展名
   */
  getFileExtension(filePath) {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : null;
  }

  /**
   * 带用户认证的Supabase请求封装
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async supabaseRequestWithAuth(options) {
    const { url, method = 'POST', data, authToken } = options;

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.supabaseUrl}${url}`,
        method,
        data,
        header: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        success: res => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            reject(
              new Error(`HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`)
            );
          }
        },
        fail: reject,
      });
    });
  }

  /**
   * 带用户认证的Supabase Storage上传请求
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async supabaseStorageRequestWithAuth(options) {
    const {
      method = 'POST',
      path,
      file,
      options: uploadOptions = {},
      authToken,
    } = options;

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.supabaseUrl}/storage/v1/object/${this.userProfileBucket}/${path}`,
        method: method,
        data: file,
        header: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${authToken}`, // 使用用户认证token
          'Content-Type':
            uploadOptions.contentType || 'application/octet-stream',
          ...(uploadOptions.upsert && { 'x-upsert': 'true' }),
        },
        success: res => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: res.data, error: null });
          } else {
            resolve({
              data: null,
              error: {
                message: `HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`,
              },
            });
          }
        },
        fail: error => resolve({ data: null, error }),
      });
    });
  }

  /**
   * Supabase Storage API请求封装(用于private bucket)
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async supabaseStorageRequest(options) {
    const {
      method = 'POST',
      path,
      file,
      options: uploadOptions = {},
    } = options;

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.supabaseUrl}/storage/v1/object/${this.userProfileBucket}/${path}`,
        method: method,
        data: file,
        header: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
          'Content-Type':
            uploadOptions.contentType || 'application/octet-stream',
          ...(uploadOptions.upsert && { 'x-upsert': 'true' }),
        },
        success: res => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: res.data, error: null });
          } else {
            resolve({
              data: null,
              error: {
                message: `HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`,
              },
            });
          }
        },
        fail: error => resolve({ data: null, error }),
      });
    });
  }

  /**
   * Supabase REST API请求封装
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async supabaseRequest(options) {
    const { url, method = 'GET', data, headers = {} } = options;

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.supabaseUrl}${url}`,
        method,
        data,
        header: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json',
          ...headers,
        },
        success: res => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            reject(
              new Error(`HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`)
            );
          }
        },
        fail: reject,
      });
    });
  }

  // 读取本地文件（用于上传前的文件处理）
  async readLocalFile(filePath, encoding = 'utf8') {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding,
        success: res => resolve(res.data),
        fail: reject,
      });
    });
  }

  // 获取文件信息
  async getFileInfo(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath,
        success: resolve,
        fail: reject,
      });
    });
  }

  // 压缩图片
  async compressImage(src, quality = 80) {
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src,
        quality,
        success: resolve,
        fail: reject,
      });
    });
  }

  // 选择并上传图片
  async selectAndUploadImage(bucketName, options = {}) {
    try {
      // 选择图片
      const chooseResult = await this.chooseImage(options);
      if (
        !chooseResult.tempFilePaths ||
        chooseResult.tempFilePaths.length === 0
      ) {
        throw new Error('未选择图片');
      }

      const filePath = chooseResult.tempFilePaths[0];

      // 压缩图片（可选）
      let finalPath = filePath;
      if (options.compress !== false) {
        const compressResult = await this.compressImage(
          filePath,
          options.quality || 80
        );
        finalPath = compressResult.tempFilePath;
      }

      // 生成文件名
      const timestamp = Date.now();
      const extension = filePath.split('.').pop();
      const fileName = `${timestamp}.${extension}`;

      // 上传文件
      const uploadResult = await this.uploadFile(
        bucketName,
        finalPath,
        fileName,
        {
          contentType: `image/${extension}`,
          upsert: true,
        }
      );

      return uploadResult;
    } catch (error) {
      console.error('选择并上传图片失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // 选择图片
  async chooseImage(options = {}) {
    const {
      count = 1,
      sizeType = ['original', 'compressed'],
      sourceType = ['album', 'camera'],
    } = options;

    return new Promise((resolve, reject) => {
      wx.chooseImage({
        count,
        sizeType,
        sourceType,
        success: resolve,
        fail: reject,
      });
    });
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建单例实例
const storageService = new StorageService();

module.exports = storageService;
