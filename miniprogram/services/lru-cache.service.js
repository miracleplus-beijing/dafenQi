/**
 * LRU缓存管理系统
 * 实现最近最少使用(Least Recently Used)算法管理音频数据块缓存
 */

class LRUCache {
  constructor(maxSize = 10 * 1024 * 1024) { // 默认10MB缓存上限
    this.maxSize = maxSize // 最大缓存大小(字节)
    this.currentSize = 0   // 当前缓存大小
    
    // 双向链表节点存储
    this.cache = new Map() // key -> Node
    
    // 创建头尾节点(哨兵节点)
    this.head = this.createNode('__HEAD__', null, 0)
    this.tail = this.createNode('__TAIL__', null, 0)
    this.head.next = this.tail
    this.tail.prev = this.head
    
    // 统计信息
    this.stats = {
      hits: 0,        // 命中次数
      misses: 0,      // 未命中次数
      evictions: 0,   // 淘汰次数
      totalPuts: 0,   // 总存入次数
      totalGets: 0    // 总获取次数
    }
  }

  /**
   * 创建缓存节点
   * @param {string} key - 缓存键
   * @param {ArrayBuffer} data - 数据块
   * @param {number} size - 数据大小
   * @returns {Object} 节点对象
   */
  createNode(key, data, size) {
    return {
      key,
      data,
      size,
      accessTime: Date.now(),
      prev: null,
      next: null,
      // 额外的元数据
      metadata: {
        audioUrl: null,
        chunkIndex: null,
        createdAt: Date.now(),
        accessCount: 0
      }
    }
  }

  /**
   * 生成缓存键
   * @param {string} audioUrl - 音频URL
   * @param {number} chunkIndex - 数据块索引
   * @returns {string} 缓存键
   */
  generateKey(audioUrl, chunkIndex) {
    // 使用URL的hash部分和块索引组合，减少键长度
    const urlHash = this.hashCode(audioUrl)
    return `${urlHash}_${chunkIndex}`
  }

  /**
   * 简单字符串哈希函数
   * @param {string} str - 输入字符串
   * @returns {string} 哈希值
   */
  hashCode(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(36) // 转换为36进制
  }

  /**
   * 获取缓存数据
   * @param {string} audioUrl - 音频URL
   * @param {number} chunkIndex - 数据块索引
   * @returns {ArrayBuffer|null} 缓存的数据块
   */
  get(audioUrl, chunkIndex) {
    this.stats.totalGets++
    
    const key = this.generateKey(audioUrl, chunkIndex)
    const node = this.cache.get(key)
    
    if (!node) {
      this.stats.misses++
      console.log(`缓存未命中: ${audioUrl} chunk ${chunkIndex}`)
      return null
    }
    
    // 命中，更新访问时间和计数
    this.stats.hits++
    node.accessTime = Date.now()
    node.metadata.accessCount++
    
    // 移动到链表头部(最近使用)
    this.moveToHead(node)
    
    console.log(`缓存命中: ${audioUrl} chunk ${chunkIndex}, 访问次数: ${node.metadata.accessCount}`)
    return node.data
  }

  /**
   * 存入缓存数据
   * @param {string} audioUrl - 音频URL
   * @param {number} chunkIndex - 数据块索引  
   * @param {ArrayBuffer} data - 数据块
   * @returns {boolean} 是否成功存入
   */
  put(audioUrl, chunkIndex, data) {
    this.stats.totalPuts++
    
    if (!data || data.byteLength === 0) {
      console.warn('尝试存入空数据块')
      return false
    }
    
    const key = this.generateKey(audioUrl, chunkIndex)
    const existingNode = this.cache.get(key)
    
    // 如果已存在，更新数据并移到头部
    if (existingNode) {
      existingNode.data = data
      existingNode.size = data.byteLength
      existingNode.accessTime = Date.now()
      existingNode.metadata.accessCount++
      this.moveToHead(existingNode)
      
      console.log(`更新缓存: ${audioUrl} chunk ${chunkIndex}`)
      return true
    }
    
    // 创建新节点
    const newNode = this.createNode(key, data, data.byteLength)
    newNode.metadata.audioUrl = audioUrl
    newNode.metadata.chunkIndex = chunkIndex
    
    // 检查缓存空间，必要时进行淘汰
    const requiredSpace = data.byteLength
    if (!this.ensureSpace(requiredSpace)) {
      console.warn(`缓存空间不足，无法存入数据块: ${audioUrl} chunk ${chunkIndex}`)
      return false
    }
    
    // 添加到缓存
    this.cache.set(key, newNode)
    this.addToHead(newNode)
    this.currentSize += data.byteLength
    
    console.log(`新增缓存: ${audioUrl} chunk ${chunkIndex}, 大小: ${(data.byteLength / 1024).toFixed(1)}KB`)
    this.logCacheStatus()
    
    return true
  }

  /**
   * 确保有足够的缓存空间
   * @param {number} requiredSpace - 需要的空间(字节)
   * @returns {boolean} 是否有足够空间
   */
  ensureSpace(requiredSpace) {
    // 如果单个数据块就超过缓存上限，直接拒绝
    if (requiredSpace > this.maxSize) {
      console.warn(`单个数据块(${(requiredSpace / 1024).toFixed(1)}KB)超过缓存上限`)
      return false
    }
    
    // 计算需要释放的空间
    const freeSpace = this.maxSize - this.currentSize
    if (freeSpace >= requiredSpace) {
      return true // 空间充足
    }
    
    const spaceToFree = requiredSpace - freeSpace
    let freedSpace = 0
    
    console.log(`需要释放空间: ${(spaceToFree / 1024).toFixed(1)}KB`)
    
    // 从尾部开始淘汰(最少使用的)
    let current = this.tail.prev
    while (current !== this.head && freedSpace < spaceToFree) {
      const nodeToRemove = current
      current = current.prev
      
      // 移除节点
      this.removeNode(nodeToRemove)
      this.cache.delete(nodeToRemove.key)
      
      freedSpace += nodeToRemove.size
      this.currentSize -= nodeToRemove.size
      this.stats.evictions++
      
      console.log(`淘汰缓存: ${nodeToRemove.metadata.audioUrl} chunk ${nodeToRemove.metadata.chunkIndex}`)
    }
    
    console.log(`成功释放空间: ${(freedSpace / 1024).toFixed(1)}KB`)
    return freedSpace >= spaceToFree
  }

  /**
   * 移动节点到链表头部
   * @param {Object} node - 要移动的节点
   */
  moveToHead(node) {
    this.removeNode(node)
    this.addToHead(node)
  }

  /**
   * 添加节点到链表头部
   * @param {Object} node - 要添加的节点
   */
  addToHead(node) {
    node.prev = this.head
    node.next = this.head.next
    
    this.head.next.prev = node
    this.head.next = node
  }

  /**
   * 从链表中移除节点
   * @param {Object} node - 要移除的节点
   */
  removeNode(node) {
    node.prev.next = node.next
    node.next.prev = node.prev
  }

  /**
   * 检查是否包含指定的缓存
   * @param {string} audioUrl - 音频URL
   * @param {number} chunkIndex - 数据块索引
   * @returns {boolean} 是否包含
   */
  has(audioUrl, chunkIndex) {
    const key = this.generateKey(audioUrl, chunkIndex)
    return this.cache.has(key)
  }

  /**
   * 删除指定音频的所有缓存块
   * @param {string} audioUrl - 音频URL
   * @returns {number} 删除的块数量
   */
  removeAudio(audioUrl) {
    let removedCount = 0
    const keysToRemove = []
    
    // 查找需要删除的节点
    for (const [key, node] of this.cache.entries()) {
      if (node.metadata.audioUrl === audioUrl) {
        keysToRemove.push(key)
      }
    }
    
    // 删除节点
    keysToRemove.forEach(key => {
      const node = this.cache.get(key)
      if (node) {
        this.removeNode(node)
        this.cache.delete(key)
        this.currentSize -= node.size
        removedCount++
      }
    })
    
    if (removedCount > 0) {
      console.log(`删除音频${audioUrl}的${removedCount}个缓存块`)
      this.logCacheStatus()
    }
    
    return removedCount
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear()
    this.head.next = this.tail
    this.tail.prev = this.head
    this.currentSize = 0
    
    // 重置统计信息
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalPuts: 0,
      totalGets: 0
    }
    
    console.log('已清空所有缓存')
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const hitRate = this.stats.totalGets > 0 ? 
      (this.stats.hits / this.stats.totalGets * 100).toFixed(2) : '0.00'
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      currentSize: this.currentSize,
      currentSizeMB: (this.currentSize / 1024 / 1024).toFixed(2),
      maxSizeMB: (this.maxSize / 1024 / 1024).toFixed(2),
      usage: `${(this.currentSize / this.maxSize * 100).toFixed(1)}%`,
      nodeCount: this.cache.size
    }
  }

  /**
   * 获取所有缓存键信息
   * @returns {Array} 缓存键列表
   */
  getAllKeys() {
    const keys = []
    for (const [key, node] of this.cache.entries()) {
      keys.push({
        key,
        audioUrl: node.metadata.audioUrl,
        chunkIndex: node.metadata.chunkIndex,
        size: node.size,
        accessCount: node.metadata.accessCount,
        accessTime: node.accessTime,
        createdAt: node.metadata.createdAt
      })
    }
    
    // 按访问时间排序(最近访问的在前)
    keys.sort((a, b) => b.accessTime - a.accessTime)
    return keys
  }

  /**
   * 调整缓存上限
   * @param {number} newMaxSize - 新的缓存上限(字节)
   */
  setMaxSize(newMaxSize) {
    const oldMaxSize = this.maxSize
    this.maxSize = newMaxSize
    
    console.log(`调整缓存上限: ${(oldMaxSize / 1024 / 1024).toFixed(1)}MB -> ${(newMaxSize / 1024 / 1024).toFixed(1)}MB`)
    
    // 如果新上限小于当前使用量，需要清理
    if (this.currentSize > newMaxSize) {
      this.ensureSpace(0) // 确保不超过新上限
    }
  }

  /**
   * 输出缓存状态日志
   */
  logCacheStatus() {
    const stats = this.getStats()
    console.log(`缓存状态 - 使用: ${stats.currentSizeMB}MB/${stats.maxSizeMB}MB (${stats.usage}), 节点: ${stats.nodeCount}, 命中率: ${stats.hitRate}`)
  }

  /**
   * 基于内存压力进行智能清理
   * @param {number} memoryPressure - 内存压力等级 1-5
   */
  smartCleanup(memoryPressure = 3) {
    if (memoryPressure < 1 || memoryPressure > 5) return

    let cleanupRatio = 0
    switch (memoryPressure) {
      case 1: cleanupRatio = 0.1; break  // 清理10%
      case 2: cleanupRatio = 0.2; break  // 清理20%
      case 3: cleanupRatio = 0.3; break  // 清理30%
      case 4: cleanupRatio = 0.5; break  // 清理50%
      case 5: cleanupRatio = 0.8; break  // 清理80%
    }

    const targetSize = this.maxSize * (1 - cleanupRatio)
    const spaceToFree = Math.max(0, this.currentSize - targetSize)

    if (spaceToFree > 0) {
      console.log(`智能清理模式${memoryPressure}: 目标释放${(spaceToFree / 1024).toFixed(1)}KB`)
      this.ensureSpace(spaceToFree)
    }
  }

  /**
   * 清理过期缓存 (兼容旧版API)
   */
  cleanup() {
    console.log('执行LRU缓存清理...')
    // 使用智能清理机制，中等强度清理
    this.smartCleanup(3)
  }
}

// 创建并导出LRU缓存实例
const lruCache = new LRUCache()
module.exports = lruCache