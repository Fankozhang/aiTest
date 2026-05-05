const { v4: uuidv4 } = require('uuid');

/**
 * API Key 管理器 - 负责管理多个 API Key 的轮询、故障切换、模型兼容性等
 */
class ApiKeyManager {
  constructor(config) {
    this.config = config;
    this.apiKeys = new Map(); // keyId -> ApiKey实例
    this.modelToKeys = new Map(); // model -> [keyIds]
    this.modelRoundRobin = new Map(); // model -> lastUsedIndex
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0
    };
    
    this._initializeKeys();
  }

  /**
   * 初始化所有 API Key
   */
  _initializeKeys() {
    if (this.config.apiKeys && Array.isArray(this.config.apiKeys)) {
      this.config.apiKeys.forEach(keyConfig => {
        this._addKey(keyConfig);
      });
    }
  }

  /**
   * 添加单个 API Key
   */
  _addKey(keyConfig) {
    const id = keyConfig.id || uuidv4();
    const apiKey = {
      id,
      key: keyConfig.key,
      name: keyConfig.name || `Key-${id.slice(0, 8)}`,
      models: new Set(keyConfig.models || []),
      baseUrl: keyConfig.baseUrl,
      enabled: keyConfig.enabled !== false,
      status: 'active', // active, rate_limited, error, disabled
      
      // 限流状态
      rateLimitState: {
        remaining: null,
        resetTime: null,
        limit: null
      },
      
      // 并发控制
      concurrentRequests: 0,
      maxConcurrent: this.config.rateLimit?.maxConcurrentPerKey || 5,
      
      // 熔断器
      circuitBreaker: {
        failures: 0,
        threshold: this.config.rateLimit?.circuitBreakerThreshold || 3,
        resetTime: null,
        resetSeconds: this.config.rateLimit?.circuitBreakerResetSeconds || 60,
        isOpen: false
      },
      
      // 使用统计
      stats: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastUsed: null
      }
    };

    this.apiKeys.set(id, apiKey);
    this._updateModelMapping(apiKey);
    return apiKey;
  }

  /**
   * 更新模型映射关系
   */
  _updateModelMapping(apiKey) {
    // 清除旧映射
    for (const [model, keyIds] of this.modelToKeys.entries()) {
      const index = keyIds.indexOf(apiKey.id);
      if (index > -1) {
        keyIds.splice(index, 1);
        if (keyIds.length === 0) {
          this.modelToKeys.delete(model);
        }
      }
    }

    // 添加新映射
    if (apiKey.enabled && apiKey.status !== 'disabled') {
      for (const model of apiKey.models) {
        if (!this.modelToKeys.has(model)) {
          this.modelToKeys.set(model, []);
        }
        const keyIds = this.modelToKeys.get(model);
        if (!keyIds.includes(apiKey.id)) {
          keyIds.push(apiKey.id);
        }
      }
    }
  }

  /**
   * 获取指定模型的可用 API Key（最小并发优先 + 轮询）
   */
  getKeyForModel(model) {
    const keyIds = this.modelToKeys.get(model);
    if (!keyIds || keyIds.length === 0) {
      return null;
    }

    const now = Date.now();
    let selectedKey = null;
    let minConnections = Infinity;
    let selectedIndex = -1;

    // 获取该模型的轮询起始索引，实现 Round Robin 分布
    const lastIndex = this.modelRoundRobin.get(model) ?? -1;
    const startIndex = (lastIndex + 1) % keyIds.length;

    // 从上次使用的下一个位置开始循环遍历所有支持该模型的 Key
    for (let i = 0; i < keyIds.length; i++) {
      const currentIndex = (startIndex + i) % keyIds.length;
      const id = keyIds[currentIndex];
      const apiKey = this.apiKeys.get(id);
      
      if (!apiKey || !apiKey.enabled || apiKey.status === 'disabled') continue;

      // 1. 检查熔断器
      if (apiKey.circuitBreaker.isOpen) {
        if (apiKey.circuitBreaker.resetTime && now > apiKey.circuitBreaker.resetTime) {
          // 冷却期满，进入半开状态尝试探测
          apiKey.status = 'half_open';
        } 
        
        // 如果不是半开状态，或者半开状态已经有请求在探测了，则跳过
        if (apiKey.status !== 'half_open' || apiKey.concurrentRequests > 0) {
          continue;
        }
      }

      // 2. 检查 429 限流状态
      if (apiKey.status === 'rate_limited' && apiKey.rateLimitState.resetTime && now < apiKey.rateLimitState.resetTime) {
        continue;
      }

      // 3. 检查并发配额
      if (apiKey.concurrentRequests >= apiKey.maxConcurrent) {
        continue;
      }

      // 4. 最小并发优先策略 + 顺序轮询
      // 如果发现更低并发的 Key，更新选择
      if (apiKey.concurrentRequests < minConnections) {
        minConnections = apiKey.concurrentRequests;
        selectedKey = apiKey;
        selectedIndex = currentIndex;
      } 
      // 如果并发相同，我们保持 startIndex 遇到的第一个（即轮询顺序中的下一个），无需更新
    }

    if (selectedKey) {
      // 记录本次使用的索引，供下次轮询参考
      this.modelRoundRobin.set(model, selectedIndex);
      
      selectedKey.concurrentRequests++;
      selectedKey.stats.totalRequests++;
      selectedKey.stats.lastUsed = new Date().toISOString();
      this.stats.totalRequests++;
    }

    return selectedKey;
  }

  /**
   * 释放 API Key 的并发占用
   */
  releaseKey(keyId) {
    const apiKey = this.apiKeys.get(keyId);
    if (apiKey) {
      apiKey.concurrentRequests = Math.max(0, apiKey.concurrentRequests - 1);
    }
  }

  /**
   * 标记请求成功
   */
  markSuccess(keyId, model, responseHeaders) {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return;

    apiKey.stats.successfulRequests++;
    this.stats.successfulRequests++;

    // 成功后将状态恢复为 active
    if (apiKey.status !== 'active') {
      if (apiKey.status === 'half_open') {
        console.log(`[KeyManager] ${apiKey.name} 探测成功，熔断器关闭，恢复正常使用`);
      }
      apiKey.status = 'active';
      apiKey.circuitBreaker.isOpen = false;
      apiKey.circuitBreaker.resetTime = null;
    }

    // 更新限流状态（从响应头）
    if (responseHeaders) {
      if (responseHeaders['x-ratelimit-remaining']) {
        apiKey.rateLimitState.remaining = parseInt(responseHeaders['x-ratelimit-remaining']);
      }
      if (responseHeaders['x-ratelimit-reset']) {
        apiKey.rateLimitState.resetTime = parseInt(responseHeaders['x-ratelimit-reset']) * 1000;
      }
      if (responseHeaders['x-ratelimit-limit']) {
        apiKey.rateLimitState.limit = parseInt(responseHeaders['x-ratelimit-limit']);
      }
    }

    // 重置熔断器失败计数
    apiKey.circuitBreaker.failures = 0;
  }

  /**
   * 标记请求失败（带错误分级处理）
   */
  markFailure(keyId, model, errorType, statusCode) {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return;

    // 1. 过滤用户端错误 (400 Bad Request)
    // 这类错误通常是 prompt 违规或参数错误，不应视为 Key 的故障
    if (statusCode === 400) {
      console.log(`[KeyManager] ${apiKey.name} 收到 400 错误，忽略故障计次`);
      return;
    }

    apiKey.stats.failedRequests++;
    this.stats.failedRequests++;

    // 2. 处理身份验证失败 (401/403)
    // 说明 Key 已失效、欠费或被封，应永久禁用
    if (statusCode === 401 || statusCode === 403) {
      console.error(`[KeyManager] ${apiKey.name} 身份验证失败 (${statusCode})，已永久禁用`);
      apiKey.status = 'disabled';
      apiKey.enabled = false;
      this._updateModelMapping(apiKey); // 从可用列表中移除
      return;
    }

    // 3. 处理速率限制 (429)
    if (statusCode === 429 || 
        (errorType && (errorType.includes('rate_limit') || errorType.includes('too_many_requests')))) {
      this.stats.rateLimitHits++;
      apiKey.status = 'rate_limited';
      
      // 设置冷却时间（默认 60 秒）
      const resetSeconds = this.config.rateLimit?.retryAfterSeconds || 60;
      apiKey.rateLimitState.resetTime = Date.now() + (resetSeconds * 1000);
      apiKey.rateLimitState.remaining = 0;
      console.log(`[KeyManager] ${apiKey.name} 进入冷却模式，${resetSeconds}s 后恢复`);
    } 
    // 4. 处理其他服务器错误 (5xx) - 触发熔断
    else {
      // 如果是在半开状态下失败，立即再次熔断
      if (apiKey.status === 'half_open') {
        apiKey.circuitBreaker.isOpen = true;
        apiKey.circuitBreaker.resetTime = Date.now() + (apiKey.circuitBreaker.resetSeconds * 1000);
        apiKey.status = 'error';
        console.error(`[KeyManager] ${apiKey.name} 半开探测失败，重新进入熔断状态`);
        return;
      }

      apiKey.circuitBreaker.failures++;
      console.warn(`[KeyManager] ${apiKey.name} 连续失败计次: ${apiKey.circuitBreaker.failures}/${apiKey.circuitBreaker.threshold}`);
      
      if (apiKey.circuitBreaker.failures >= apiKey.circuitBreaker.threshold) {
        apiKey.circuitBreaker.isOpen = true;
        apiKey.circuitBreaker.resetTime = Date.now() + (apiKey.circuitBreaker.resetSeconds * 1000);
        apiKey.status = 'error';
        console.error(`[KeyManager] ${apiKey.name} 触发熔断，暂时摘除`);
      }
    }
  }

  /**
   * 获取所有 API Key 的状态
   */
  getAllKeyStatus() {
    const statuses = [];
    for (const [id, apiKey] of this.apiKeys.entries()) {
      statuses.push({
        id: apiKey.id,
        name: apiKey.name,
        key: `${apiKey.key.slice(0, 8)}...${apiKey.key.slice(-4)}`,
        models: Array.from(apiKey.models),
        status: apiKey.status,
        enabled: apiKey.enabled,
        concurrentRequests: apiKey.concurrentRequests,
        maxConcurrent: apiKey.maxConcurrent,
        rateLimitRemaining: apiKey.rateLimitState.remaining,
        rateLimitResetTime: apiKey.rateLimitState.resetTime,
        stats: apiKey.stats,
        circuitBreaker: {
          failures: apiKey.circuitBreaker.failures,
          isOpen: apiKey.circuitBreaker.isOpen,
          resetTime: apiKey.circuitBreaker.resetTime
        }
      });
    }
    return statuses;
  }

  /**
   * 获取支持的模型列表
   */
  getSupportedModels() {
    const models = new Set();
    for (const keyId of this.modelToKeys.keys()) {
      // 检查是否至少有一个 active 的 key 支持此模型
      const keyIds = this.modelToKeys.get(keyId);
      for (const id of keyIds) {
        const apiKey = this.apiKeys.get(id);
        if (apiKey && apiKey.enabled && (apiKey.status === 'active' || apiKey.status === 'half_open')) {
          models.add(keyId);
          break;
        }
      }
    }
    return Array.from(models);
  }

  /**
   * 获取全局统计
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    this.config = newConfig;
    
    // 更新现有 key 的限流配置
    for (const [id, apiKey] of this.apiKeys.entries()) {
      apiKey.maxConcurrent = this.config.rateLimit?.maxConcurrentPerKey || 5;
      apiKey.circuitBreaker.threshold = this.config.rateLimit?.circuitBreakerThreshold || 3;
      apiKey.circuitBreaker.resetSeconds = this.config.rateLimit?.circuitBreakerResetSeconds || 60;
    }
  }
}

module.exports = { ApiKeyManager };
