/**
 * Supabase配置文件模板
 *
 * 使用说明:
 * 1. 复制此文件并重命名为 supabase.config.js
 * 2. 将下面的配置替换为您的实际Supabase项目配置
 * 3. supabase.config.js 文件已被加入.gitignore，不会上传到git仓库
 */

const config = {
  // Supabase项目URL - 在Supabase控制台的Settings > API中找到

  supabaseUrl: 'https://gxvfcafgnhzjiauukssj.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmZjYWZnbmh6amlhdXVrc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY4NjAsImV4cCI6MjA3MTAwMjg2MH0.uxO5eyw0Usyd59UKz-S7bTrmOnNPg9Ld9wJ6pDMIQUA',
  timeout: 60000,
  // Supabase匿名密钥（公开密钥，可以在前端使用）
  // 在Supabase控制台的Settings > API中找到anon/public key

  // API配置
  api: {
    timeout: 10000, // 请求超时时间(毫秒)
    retries: 3, // 重试次数
    retryDelay: 1000, // 重试延迟(毫秒)
  },

  // 认证配置
  auth: {
    sessionDuration: 7 * 24 * 60 * 60 * 1000, // 会话持续时间(7天)
    autoRefresh: true, // 自动刷新token
    persistSession: true, // 持久化会话
  },

  // 存储配置
  storage: {
    buckets: {
      icons: 'icons', // SVG图标存储桶
      covers: 'covers', // 封面图片存储桶
      audio: 'audio', // 音频文件存储桶
      avatars: 'avatars', // 用户头像存储桶
    },
  },
};

const getCurrentConfig = () => {
  return {
    baseURL: config.supabaseUrl,
    timeout: config.timeout,
    anonKey: config.supabaseAnonKey,
  };
};

module.exports = {
  config,
  getCurrentConfig,
};
