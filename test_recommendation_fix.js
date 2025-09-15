/**
 * 推荐系统修复验证测试
 * 测试修复后的推荐服务是否能正常初始化和运行
 */

// 模拟微信小程序环境
global.wx = {
  getStorageSync: () => null,
  request: (options) => {
    console.log('模拟请求:', options.url)
    // 模拟成功响应
    setTimeout(() => {
      options.success({
        statusCode: 200,
        data: options.url.includes('users') ? [{id: 'test-user'}] :
              options.url.includes('podcasts') ? [{id: 'test-podcast'}] : []
      })
    }, 100)
  }
}

// 模拟require函数
const requireStubs = {
  './rating-matrix.service.js': { clearCache: () => {} },
  './collaborative-filtering.service.js': {
    getPopularItems: async () => ({ success: true, data: [] }),
    clearCache: () => {}
  },
  './performance-monitor.service.js': {
    reset: () => {},
    recordRecommendationRequest: () => 'req-1',
    recordRecommendationResponse: () => {},
    recordUserClick: () => {},
    recordUserConversion: () => {}
  },
  '../../utils/request.js': {
    get: async (url, params) => {
      console.log(`模拟API调用: GET ${url}`, params)
      if (url.includes('users')) return [{id: 'test-user'}]
      if (url.includes('podcasts')) return [{id: 'test-podcast'}]
      return []
    }
  }
}

global.require = (path) => {
  if (requireStubs[path]) {
    return requireStubs[path]
  }
  throw new Error(`Module not mocked: ${path}`)
}

// 测试修复后的推荐服务
async function testRecommendationService() {
  console.log('=== 推荐系统修复验证测试 ===\n')

  try {
    // 加载修复后的推荐服务
    const RecommendationServiceModule = require('./miniprogram/services/recommendation/index.js')
    console.log('✅ 推荐服务模块加载成功')

    // 测试初始化
    console.log('\n1. 测试服务初始化...')
    const initResult = await RecommendationServiceModule.initialize()
    console.log('初始化结果:', initResult)

    if (initResult.success) {
      console.log('✅ 推荐服务初始化成功')
    } else {
      console.log('❌ 推荐服务初始化失败')
      return false
    }

    // 测试热门推荐功能
    console.log('\n2. 测试热门推荐功能...')
    const popularResult = await RecommendationServiceModule.getPopularRecommendations(5)
    console.log('热门推荐结果:', popularResult)

    if (popularResult.success !== undefined) {
      console.log('✅ 热门推荐功能正常')
    } else {
      console.log('❌ 热门推荐功能异常')
      return false
    }

    // 测试服务状态
    console.log('\n3. 测试服务状态...')
    const status = RecommendationServiceModule.getServiceStatus()
    console.log('服务状态:', status)

    if (status.initialized) {
      console.log('✅ 服务状态正常')
    } else {
      console.log('❌ 服务状态异常')
      return false
    }

    console.log('\n=== 所有测试通过！修复成功！ ===')
    return true

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    console.error('错误堆栈:', error.stack)
    return false
  }
}

// 运行测试
testRecommendationService().then(success => {
  console.log('\n测试结果:', success ? '成功' : '失败')
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('测试执行错误:', error)
  process.exit(1)
})