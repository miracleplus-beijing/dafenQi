import { createClient } from '@renkunx/supabase-wechat-stable-v2'

// 1. 定义 Supabase URL 和 Key
const supabaseUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmZjYWZnbmh6amlhdXVrc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY4NjAsImV4cCI6MjA3MTAwMjg2MH0.uxO5eyw0Usyd59UKz-S7bTrmOnNPg9Ld9wJ6pDMIQUA'



// 4. 初始化 Client，注入上面的适配器
export const supabaseClient = createClient(supabaseUrl, supabaseKey)

/**
 * SupabaseService 类 - 封装 Supabase 客户端操作
 * 参考官方文档：https://supabase.com/docs/reference/javascript/select
 */
class SupabaseService {
    constructor() {
        this.client = supabaseClient
    }

    /**
     * 查询数据 - 遵循官方 Supabase 语法
     * @param {string} tableName - 表名
     * @param {Object} options - 查询选项
     * @param {string} options.columns - 选择的列（如 'id,title,channels(name)'）
     * @param {Object} options.filters - 过滤条件 {fieldName: value}
     * @param {string} options.order - 排序 'fieldName.asc|desc'
     * @param {number} options.limit - 限制数量
     * @param {number} options.offset - 分页偏移
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    async select(tableName, options = {}) {
        try {
            const {
                columns = '*',
                filters = {},
                order = null,
                limit = null,
                offset = null
            } = options

            // 开始构建查询
            let query = this.client.from(tableName).select(columns)

            // 应用过滤条件
            for (const [key, value] of Object.entries(filters)) {
                if (value === null || value === undefined) {
                    query = query.is(key, null)
                } else if (Array.isArray(value)) {
                    query = query.in(key, value)
                } else if (typeof value === 'object' && value.operator) {
                    // 处理复杂操作符
                    const { operator, val } = value
                    switch (operator) {
                        case 'gt':
                            query = query.gt(key, val)
                            break
                        case 'gte':
                            query = query.gte(key, val)
                            break
                        case 'lt':
                            query = query.lt(key, val)
                            break
                        case 'lte':
                            query = query.lte(key, val)
                            break
                        case 'like':
                            query = query.like(key, val)
                            break
                        case 'ilike':
                            query = query.ilike(key, val)
                            break
                        case 'contains':
                            // 数组包含操作符 - 对于 text[] 类型字段
                            query = query.contains(key, val)
                            break
                        default:
                            query = query.eq(key, val)
                    }
                } else {
                    query = query.eq(key, value)
                }
            }

            // 应用排序
            if (order) {
                const [column, direction] = order.split('.')
                query = query.order(column, { ascending: direction !== 'desc' })
            }

            // 应用分页
            if (limit) query = query.limit(limit)
            if (offset !== null && offset !== undefined) {
                query = query.range(offset, offset + (limit || 10) - 1)
            }

            // 执行查询
            const { data, error } = await query

            if (error) {
                console.error(`查询 ${tableName} 失败:`, error)
                return { success: false, error: error.message }
            }

            return { success: true, data: data || [] }
        } catch (error) {
            console.error(`查询 ${tableName} 异常:`, error)
            return { success: false, error: error.message }
        }
    }

    /**
     * 插入数据
     * @param {string} tableName - 表名
     * @param {Array|Object} records - 记录数据
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    async insert(tableName, records) {
        try {
            const { data, error } = await this.client
                .from(tableName)
                .insert(Array.isArray(records) ? records : [records])
                .select()

            if (error) {
                console.error(`插入 ${tableName} 失败:`, error)
                return { success: false, error: error.message }
            }

            return { success: true, data: data || [] }
        } catch (error) {
            console.error(`插入 ${tableName} 异常:`, error)
            return { success: false, error: error.message }
        }
    }

    /**
     * 更新数据
     * @param {string} tableName - 表名
     * @param {Object} updates - 更新的字段
     * @param {Object} filters - 过滤条件 {id: 'xxx'}
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    async update(tableName, updates, filters = {}) {
        try {
            let query = this.client.from(tableName).update(updates)

            // 应用过滤条件
            for (const [key, value] of Object.entries(filters)) {
                if (value === null) {
                    query = query.is(key, null)
                } else if (Array.isArray(value)) {
                    query = query.in(key, value)
                } else if (typeof value === 'object' && value.operator) {
                    // 处理复杂操作符
                    const { operator, val } = value
                    if (operator === 'contains') {
                        query = query.contains(key, val)
                    }
                } else {
                    query = query.eq(key, value)
                }
            }

            const { data, error } = await query.select()

            if (error) {
                console.error(`更新 ${tableName} 失败:`, error)
                return { success: false, error: error.message }
            }

            return { success: true, data: data || [] }
        } catch (error) {
            console.error(`更新 ${tableName} 异常:`, error)
            return { success: false, error: error.message }
        }
    }

    /**
     * 删除数据
     * @param {string} tableName - 表名
     * @param {Object} filters - 过滤条件 {id: 'xxx'}
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    async delete(tableName, filters = {}) {
        try {
            let query = this.client.from(tableName).delete()

            // 应用过滤条件
            for (const [key, value] of Object.entries(filters)) {
                if (value === null) {
                    query = query.is(key, null)
                } else if (Array.isArray(value)) {
                    query = query.in(key, value)
                } else if (typeof value === 'object' && value.operator) {
                    // 处理复杂操作符
                    const { operator, val } = value
                    if (operator === 'contains') {
                        query = query.contains(key, val)
                    }
                } else {
                    query = query.eq(key, value)
                }
            }

            const { data, error } = await query.select()

            if (error) {
                console.error(`删除 ${tableName} 失败:`, error)
                return { success: false, error: error.message }
            }

            return { success: true, data: data || [] }
        } catch (error) {
            console.error(`删除 ${tableName} 异常:`, error)
            return { success: false, error: error.message }
        }
    }

    /**
     * 获取当前会话
     */
    async getSession() {
        try {
            const { data, error } = await this.client.auth.getSession()
            if (error) {
                return { success: false, error: error.message }
            }
            return { success: true, data: data?.session }
        } catch (error) {
            console.error('获取会话失败:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * 获取当前用户
     */
    async getUser() {
        try {
            const { data, error } = await this.client.auth.getUser()
            if (error) {
                return { success: false, error: error.message }
            }
            return { success: true, data: data?.user }
        } catch (error) {
            console.error('获取用户失败:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * 直接访问表对象
     */
    table(tableName) {
        return this.client.from(tableName)
    }

    /**
     * 直接访问 Storage
     */
    storage() {
        return this.client.storage
    }

    /**
     * 直接访问 Auth
     */
    auth() {
        return this.client.auth
    }
}

// 创建并导出单例
const supabaseService = new SupabaseService()

module.exports = supabaseService
export default supabaseService