/**
 * API 代理服务器 - 核心请求处理模块
 * 负责将客户端请求代理到上游 API，并返回上游的响应内容
 */

// 引入所需的模块
const express = require('express');           // Express Web 框架
const cors = require('cors');                   // 跨域资源共享
const axios = require('axios');                 // HTTP 客户端，用于转发请求
const { v4: uuidv4 } = require('uuid');         // 生成唯一请求ID
const multiparty = require('multiparty');        // multipart 解析
const fs = require('fs');                        // 文件系统
const { ApiKeyManager } = require('./apiKeyManager');  // API Key 管理器
const { createAuthMiddleware } = require('./auth');    // 认证中间件（暂未启用）
const { loadLogs, appendLogEntry } = require('./db');        // 日志存储模块

// 全局变量 - 服务器状态
let server = null;                              // HTTP 服务器实例
let app = null;                                 // Express 应用实例
let apiKeyManager = null;                       // API Key 管理器实例
let config = null;                              // 配置文件
let updateStatsCallback = null;                 // 统计更新回调函数

/**
 * 启动代理服务器
 * @param {Object} serverConfig - 服务器配置（端口、主机等）
 * @param {Function} updateStatsFn - 统计数据更新回调函数
 */
function startServer(serverConfig, updateStatsFn) {
  config = serverConfig;
  updateStatsCallback = updateStatsFn;
  
  console.log('[Server] startServer 被调用');
  console.log('[Server] 配置: port=%s, host=%s, apiKeys=%s', 
    config.server?.port, config.server?.host, config.apiKeys?.length);
  console.log('[Server] config.server 对象:', JSON.stringify(config.server));
  console.log('[Server] config.apiKeys 数组:', config.apiKeys?.length || 0);
  
  // 如果服务器已经在运行，直接返回
  if (server) {
    console.log('服务器已在运行');
    return Promise.resolve(server);
  }

  // 创建 Express 应用
  app = express();
  // 初始化 API Key 管理器
  apiKeyManager = new ApiKeyManager(config);

  // 配置中间件
  app.use(cors());                              // 允许跨域请求
  app.use(express.json({ limit: '50mb' }));      // 解析 JSON 请求体，最大 50MB
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));  // 解析 URL 编码

  // ===== 接口路由定义 =====

  // 健康检查接口 - 返回服务器状态
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // 获取模型列表 - 从已配置的 API Key 中提取支持的模型
  app.get('/v1/models', (req, res) => {
    const models = apiKeyManager.getSupportedModels();
    res.json({
      object: 'list',
      data: models.map(model => ({
        id: model,
        object: 'model',
        created: Date.now(),
        owned_by: 'proxy'
      }))
    });
  });

  // 获取完整模型目录 - 包含 tier 元数据
  app.get('/v1/models/full', (req, res) => {
    const models = apiKeyManager.getSupportedModels();
    const keyStatuses = apiKeyManager.getAllKeyStatus();
    
    // 为每个模型构建完整的元数据
    const modelData = models.map(model => {
      // 查找支持该模型的 Key
      const supportingKeys = keyStatuses.filter(k => 
        k.models.includes(model) && k.enabled && k.status === 'active'
      );
      
      // 根据 Key 的 baseUrl 确定 tier（简单按域名分组）
      const tiers = new Set();
      supportingKeys.forEach(key => {
        const baseUrl = key.baseUrl || '';
        if (baseUrl.includes('openai')) tiers.add('openai');
        else if (baseUrl.includes('anthropic')) tiers.add('anthropic');
        else if (baseUrl.includes('google')) tiers.add('google');
        else if (baseUrl.includes('deepseek')) tiers.add('deepseek');
        else if (baseUrl.includes('xai')) tiers.add('xai');
        else if (baseUrl.includes('cohere')) tiers.add('cohere');
        else if (baseUrl.includes('meta-llama') || baseUrl.includes('meta-llama')) tiers.add('meta');
        else if (baseUrl.includes('glm')) tiers.add('glm');
        else if (baseUrl.includes('qwen')) tiers.add('qwen');
        else if (baseUrl.includes('vhr')) tiers.add('image');
        else if (baseUrl.includes('img')) tiers.add('image');
        else tiers.add('other');
      });
      
      return {
        id: model,
        object: 'model',
        created: Date.now(),
        owned_by: 'proxy',
        // 扩展字段
        tier: Array.from(tiers).join(','),
        provider: supportingKeys.length > 0 ? 
          new URL(supportingKeys[0].baseUrl || 'http://localhost').hostname.replace('api.', '') : 'unknown',
        available: supportingKeys.length > 0,
        keys_count: supportingKeys.length
      };
    });
    
    res.json({
      object: 'list',
      data: modelData,
      metadata: {
        total: modelData.length,
        timestamp: new Date().toISOString()
      }
    });
  });

  // ===== 独立接口路由 =====
  
  // ChatGPT 对话接口
  app.post('/v1/chat/completions', handleChatCompletions);
  
  // 文本补全接口
  app.post('/v1/completions', handleCompletions);
  
  // 向量嵌入接口
  app.post('/v1/embeddings', handleEmbeddings);
  
  // 图片生成接口
  app.post('/v1/images/generations', handleImagesGenerations);
  
  // 图片编辑接口
  app.post('/v1/images/edits', handleImagesEdits);
  
  // Anthropic 风格消息接口
  app.post('/v1/messages', handleMessages);

  // 通用代理路由 - 用于转发任意 API 请求
  app.all('/proxy/*', handleGenericProxy);

  // 状态管理接口
  app.get('/admin/keys', (req, res) => {
    res.json(apiKeyManager.getAllKeyStatus());
  });

  // 获取统计数据
  app.get('/admin/stats', (req, res) => {
    res.json({
      global: apiKeyManager.getStats(),
      keys: apiKeyManager.getAllKeyStatus()
    });
  });

  // 获取请求日志
  app.get('/admin/logs', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;   // 默认返回100条
    const offset = parseInt(req.query.offset) || 0;
    
    // 动态从磁盘加载最新日志
    const logs = loadLogs(limit + offset);
    const entries = logs.entries.slice(-(offset + limit), -offset || undefined);
    
    res.json({
      total: logs.entries.length,
      offset,
      limit,
      entries: entries.reverse()
    });
  });

  // 清空请求日志
  app.delete('/admin/logs', (req, res) => {
    const { clearLogsFile } = require('./db');
    const success = clearLogsFile();
    if (success) {
      res.json({ success: true, message: 'Logs cleared' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to clear logs' });
    }
});
 
  // 获取配置中的端口和主机
  const port = config.server?.port || 3456;
  const host = config.server?.host || 'localhost';

  console.log('[Server] 准备启动, port:', port, 'host:', host);
  
  // 启动 HTTP 服务器 - 使用超时包装
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('服务器启动超时'));
    }, 5000);
  
    try {
      server = app.listen(port, host, () => {
        clearTimeout(timeout);
        console.log(`🚀 API Key 代理服务器运行在 http://${host}:${port}`);
        console.log('支持的路由: /v1/chat/completions, /v1/completions, /v1/embeddings, /v1/images/generations, /v1/images/edits, /v1/messages');
        resolve(server);
      });
      
      server.on('error', (err) => {
        clearTimeout(timeout);
        console.error('[Server] Express 服务器错误:', err.message);
        reject(err);
      });
    } catch (err) {
      clearTimeout(timeout);
      console.error('[Server] 启动失败:', err.message);
      reject(err);
    }
  });
}

/**
 * 停止服务器
 */
function stopServer() {
  if (server) {
    server.close();
    server = null;
    app = null;
    console.log('服务器已停止');
  }
}

/**
 * 处理代理请求 - 核心请求处理函数
 * 
 * 请求处理流程：
 * 1. 验证请求中的 model 参数
 * 2. 从 API Key 管理器获取可用的 Key
 * 3. 将请求转发到上游 API
 * 4. 透传上游的响应内容（包括响应体和响应头）
 * 5. 记录请求日志和更新统计数据
 * 
 * 关于返回内容的说明：
 * - 使用 axios 的 responseType: 'text' 获取上游响应
 * - 直接透传上游返回的内容，不做任何转换或处理
 * - Content-Type 响应头也会透传，确保客户端能正确解析响应内容
 * - 支持所有 OpenAI 兼容格式的响应（JSON、图片二进制等）
 */
/**
 * 解析 multipart/form-data 请求体
 * @param {Buffer} body - 请求体 Buffer
 * @param {string} boundary - boundary 字符串
 * @returns {Object} 解析后的字段和文件
 */
function parseMultipart(body, boundary) {
  const result = { fields: {}, files: {} };
  if (!body || !boundary) return result;
  
  try {
    const parts = body.split(Buffer.from('--' + boundary));
    
    for (const part of parts) {
      if (!part.trim() || part.trim() === '--') continue;
      
      // 分离 headers 和 content
      const headerEndIdx = part.indexOf('\r\n\r\n');
      if (headerEndIdx === -1) continue;
      
      const headerStr = part.slice(0, headerEndIdx).toString('binary');
      const content = part.slice(headerEndIdx + 4);
      
      // 解析 Content-Disposition
      const dispositionMatch = headerStr.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(;\s*filename="([^"]+)")?/);
      if (!dispositionMatch) continue;
      
      const fieldName = dispositionMatch[1];
      const filename = dispositionMatch[3];
      
      if (filename) {
        // 文件字段 - 去掉末尾的 \r\n
        const contentStr = content.toString('binary');
        const trimmedContent = contentStr.replace(/\r\n$/, '');
        result.files[fieldName] = {
          filename: filename,
          content: Buffer.from(trimmedContent, 'binary')
        };
      } else {
        // 普通字段 - 去掉末尾的 \r\n
        const contentStr = content.toString('binary');
        const trimmedContent = contentStr.replace(/\r\n$/, '');
        result.fields[fieldName] = trimmedContent;
      }
    }
  } catch (e) {
    console.error('解析 multipart 失败:', e.message);
  }
  
  return result;
}

/**
 * 使用 multiparty 解析 multipart/form-data 请求
 * @param {Object} req - Express 请求对象
 * @returns {Promise<Object>} 解析后的字段和文件
 */
function parseMultipartRequest(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    const boundary = boundaryMatch ? boundaryMatch[1] : null;
    
    if (!boundary) {
      return reject(new Error('Missing boundary'));
    }
    
    const form = new multiparty.Form();
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      resolve({ fields, files });
    });
  });
}

/**
 * 构建目标 URL
 */
function buildTargetUrl(endpoint, baseUrl) {
  const base = baseUrl ? baseUrl.replace(/\/$/, '') : '';
  return base + '/' + endpoint;
}

/**
 * 提取限流响应头
 */
function extractRateLimitHeaders(headers) {
  const result = {};
  const keys = [
    'x-ratelimit-remaining',
    'x-ratelimit-limit',
    'x-ratelimit-reset',
    'x-ratelimit-reset-requests',
    'x-request-id',
    'x-ratelimit-remaining-tokens',
    'x-ratelimit-limit-tokens'
  ];
  for (const key of keys) {
    if (headers[key]) {
      result[key] = headers[key];
    }
  }
  return result;
}

/**
 * 检测是否为 HTML 错误页面（非 JSON 响应）
 */
function isHtmlErrorResponse(content) {
  if (!content) return false;
  const trimmed = content.trim().toLowerCase();
  // 检测 HTML 特征标签
  return trimmed.startsWith('<!doctype html') || 
         trimmed.startsWith('<html') || 
         trimmed.includes('502') && trimmed.includes('bad gateway') ||
         trimmed.includes('cloudflare') && trimmed.includes('error');
}

/**
 * 清理错误字符串，移除 HTML 内容
 */
function sanitizeErrorForLog(errorStr) {
  if (!errorStr) return null;
  if (isHtmlErrorResponse(errorStr)) {
    return '[HTML Error Page - 可能是上游服务 502/503 错误]';
  }
  // 限制最大长度
  if (errorStr.length > 500) {
    return errorStr.substring(0, 500) + '...';
  }
  return errorStr;
}

/**
 * 提取错误类型 - 符合 FreeTheAi 文档标准
 * 支持: 400, 401, 403, 429, 5xx 错误码识别
 */
function extractErrorType(errorStr) {
  if (!errorStr) return 'unknown';
  
  // 检测 HTML 错误页面，返回 server_error
  if (isHtmlErrorResponse(errorStr)) {
    return 'server_error';
  }
  
  try {
    const parsed = JSON.parse(errorStr);
    if (parsed.error?.type) return parsed.error.type;
    if (parsed.error?.code) return parsed.error.code;
  } catch (e) {
    const lower = errorStr.toLowerCase();
    // 429 - Rate limit
    if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('rate_limit')) return 'rate_limit_error';
    // 401 - Invalid API key
    if (lower.includes('invalid api key') || lower.includes('authentication') || lower.includes('unauthorized')) return 'invalid_request_error';
    // 403 - Access denied
    if (lower.includes('access denied') || lower.includes('forbidden') || lower.includes('permission')) return 'authentication_error';
    // 400 - Invalid request
    if (lower.includes('invalid request') || lower.includes('validation') || lower.includes('missing')) return 'invalid_request_error';
    if (lower.includes('unknown model') || lower.includes('model not found')) return 'invalid_request_error';
    // 5xx - Server error
    if (lower.includes('server error') || lower.includes('internal error') || lower.includes('upstream')) return 'server_error';
  }
  return 'unknown';
}

/**
 * 转换为标准错误格式 - 符合 FreeTheAi 文档标准
 * 400: Invalid request body, missing prompt, unknown model, or unsupported media operation.
 * 401: Missing or invalid API key.
 * 403: The model is not available for your current access tier.
 * 429: Rate limit or concurrency limit reached.
 * 5xx: Provider or gateway failure.
 */
function convertToStandardError(status, errorStr, isRateLimited) {
  // 检测 HTML 错误响应，返回标准化错误
  if (isHtmlErrorResponse(errorStr)) {
    return {
      error: {
        message: 'Provider or gateway failure. Retry once before reporting.',
        type: 'server_error',
        code: status >= 500 ? status : 502
      }
    };
  }

  let message = errorStr;
  let type = isRateLimited ? 'rate_limit_error' : 'proxy_error';
  let code = status;

  try {
    const parsed = JSON.parse(errorStr);
    if (parsed.error) {
      message = typeof parsed.error === 'string' ? parsed.error : (parsed.error.message || JSON.stringify(parsed.error));
      
      // 根据上游返回的错误类型映射
      const upstreamType = parsed.error.type || '';
      if (upstreamType.includes('invalid_api_key') || upstreamType.includes('authentication')) {
        type = 'invalid_request_error'; // 401 - 映射为请求错误
        code = 401;
      } else if (upstreamType.includes('insufficient_quota') || upstreamType.includes('billing')) {
        type = 'authentication_error'; // 403 - 权限问题
        code = 403;
      } else if (upstreamType.includes('rate_limit')) {
        type = 'rate_limit_error';
        code = 429;
      } else if (upstreamType.includes('invalid_request') || upstreamType.includes('validation')) {
        type = 'invalid_request_error';
        code = 400;
      } else if (upstreamType.includes('model_not_found') || upstreamType.includes('unknown_model')) {
        type = 'invalid_request_error';
        code = 400;
      } else {
        type = parsed.error.type || type;
      }
      code = parsed.error.code || code;
    } else if (parsed.message) {
      message = parsed.message;
    }
  } catch (e) {
    // 保持原字符串
  }

  // 根据状态码调整错误类型
  if (status === 401) {
    type = 'invalid_request_error';
    message = message || 'Missing or invalid API key';
  } else if (status === 403) {
    type = 'authentication_error';
    message = message || 'The model is not available for your current access tier';
  } else if (status === 429) {
    type = 'rate_limit_error';
    message = message || 'Rate limit or concurrency limit reached. Wait and retry.';
  } else if (status >= 500 && status < 600) {
    type = 'server_error';
    message = message || 'Provider or gateway failure. Retry once before reporting.';
  }

  return {
    error: {
      message,
      type,
      code
    }
  };
}

/**
 * 记录请求日志
 */
function logRequest(requestId, req, keyName, model, duration, error, responseHeaders, status) {
  try {
    // 检查日志是否启用
    if (config?.logging?.enabled === false) {
      return;
    }

    // 清理错误信息，移除 HTML 内容
    let cleanError = error;
    if (error && typeof error === 'object' && error.error) {
      cleanError = {
        ...error,
        error: sanitizeErrorForLog(error.error)
      };
    } else if (error && typeof error === 'string') {
      cleanError = sanitizeErrorForLog(error);
    }

    const entry = {
      id: requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.path,
      model: model || null,
      keyName: keyName || null,
      duration: duration || 0,
      status: status || null,
      error: cleanError || null,
      responseHeaders: config?.logging?.logResponseHeaders !== false ? (responseHeaders || null) : null,
      clientIp: req.ip || req.connection?.remoteAddress || null
    };
    
    if (config?.logging?.logRequestHeaders !== false) {
      entry.requestHeaders = req.headers;
    }
    
    // 使用 NDJSON 格式追加到磁盘，不再维护庞大的内存数组
    appendLogEntry(entry);
    
  } catch (e) {
    console.error('[logRequest] 记录日志失败:', e.message);
  }
}

/**
 * 执行单个请求的内部函数
 */
async function executeSingleRequest(req, apiKey, model, endpoint, requestId) {
  const targetUrl = buildTargetUrl(endpoint, apiKey.baseUrl);
  
  const headers = {
    ...req.headers,
    'Authorization': `Bearer ${apiKey.key}`,
    'Accept-Encoding': 'identity'
  };
  delete headers.host;
  delete headers['content-length'];

  const requestData = { ...req.body };
  const isStream = requestData.stream === true;
  headers['Content-Type'] = 'application/json';

  const response = await axios({
    method: req.method,
    url: targetUrl,
    headers,
    data: requestData,
    responseType: isStream ? 'stream' : 'arraybuffer',
    decompress: true,
    timeout: 300000,
    validateStatus: () => true
  });

  const responseHeaders = extractRateLimitHeaders(response.headers);
  const responseContentType = response.headers['content-type'] || '';
  const isJsonResponse = responseContentType.includes('application/json');
  // 只有当状态码为 200 且 Content-Type 正确时才视为流式响应
  const isStreamResponse = isStream && response.status === 200 && responseContentType.includes('text/event-stream');

  let returnData;
  if (isStreamResponse) {
    returnData = response.data; // 返回 Node.js 可读流
  } else if (isStream && response.status !== 200) {
    // 错误情况：即使是流模式，也要读取流内容以获取错误 JSON
    returnData = await new Promise((resolve) => {
      let data = '';
      response.data.on('data', chunk => { data += chunk.toString('utf8'); });
      response.data.on('end', () => resolve(data));
      response.data.on('error', () => resolve('{"error":{"message":"Read stream error"}}'));
    });
  } else if (isJsonResponse) {
    returnData = Buffer.isBuffer(response.data) ? response.data.toString('utf8') : String(response.data);
  } else {
    returnData = response.data;
  }

  return {
    response,
    returnData,
    isJsonResponse,
    isStreamResponse,
    responseContentType,
    responseHeaders
  };
}

/**
 * 核心代理请求处理函数
 * 包含获取 API Key、转发请求、响应处理等公共逻辑
 * 支持失败后自动切换 Key 重试
 */
async function proxyRequest(req, res, endpoint) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  const model = req.body?.model;
  
  if (!model) {
    return res.status(400).json({ 
      error: {
        message: "Missing 'model' parameter",
        type: "invalid_request_error",
        code: "missing_model"
      }
    });
  }

  // 获取重试配置
  const maxRetries = config?.rateLimit?.maxRetries ?? 5;
  const retryDelayMs = config?.rateLimit?.retryDelayMs ?? 300;
  
  // 用于跟踪已尝试的 Key，避免重复尝试
  const triedKeyIds = new Set();
  let lastError = null;
  let lastStatus = null;
  let lastResponseHeaders = null;
  let currentApiKey = null;
  let isRetriableError = false;

  // 重试循环
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // 获取可用的 API Key
    let apiKey = null;
    
    // 如果是第一次尝试，从所有可用 Key 中获取
    // 如果是重试，getKeyForModel 会自动跳过失败/限流的 Key
    apiKey = apiKeyManager.getKeyForModel(model);
    
    // 如果没有可用的 Key
    if (!apiKey) {
      if (attempt === 0) {
        // 第一次就没有可用 Key，直接返回错误
        logRequest(requestId, req, null, model, 0, 
          { error: '该模型无可用 API Key' }, null, 503);
        return res.status(503).json({ 
          error: {
            message: `No available API key for model: ${model}`,
            type: "proxy_error",
            code: "no_available_key"
          }
        });
      }
      // 重试时没有更多可用 Key，退出重试
      break;
    }

    // 记录已尝试的 Key
    triedKeyIds.add(apiKey.id);
    currentApiKey = apiKey;

    console.log(`[${requestId}] [${endpoint}] 尝试 ${attempt + 1}/${maxRetries + 1}，使用 Key: ${apiKey.name}`);

    // 标记请求是否已完成
    let finished = false;
    let requestCompleted = false;

    const finish = () => {
      if (!finished) {
        finished = true;
        apiKeyManager.releaseKey(apiKey.id);
      }
    };

    // 监听客户端断开连接
    const closeHandler = () => {
      if (!requestCompleted && !res.writableEnded) {
        finish();
        logRequest(requestId, req, apiKey?.name || 'Unknown', model, Date.now() - startTime, 
          { error: '客户端异常断开' }, null, 499);
      }
    };
    req.on('close', closeHandler);

    try {
      const result = await executeSingleRequest(req, apiKey, model, endpoint, requestId);
      const { response, returnData, isJsonResponse, isStreamResponse, responseContentType, responseHeaders } = result;
      
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] [${endpoint}] 收到响应, status: ${response.status}, attempt: ${attempt + 1}`);

      // 流式响应处理
      if (isStreamResponse) {
        requestCompleted = true;
        req.removeListener('close', closeHandler);
        
        // 成功开始流式传输，立即标记 Key 成功并更新统计
        apiKeyManager.markSuccess(apiKey.id, model, responseHeaders);
        if (updateStatsCallback) updateStatsCallback(true, false);

        res.set('Content-Type', 'text/event-stream');
        res.set('Cache-Control', 'no-cache');
        res.set('Connection', 'keep-alive');
        res.set('X-Accel-Buffering', 'no');

        const stream = returnData;
        stream.pipe(res);

        // 监听流结束事件以记录日志
        stream.on('end', () => {
          const duration = Date.now() - startTime;
          logRequest(requestId, req, apiKey.name, model, duration, null, responseHeaders, response.status);
          finish();
        });

        // 监听流错误
        stream.on('error', (err) => {
          const duration = Date.now() - startTime;
          console.error(`[${requestId}] 流传输异常:`, err.message);
          logRequest(requestId, req, apiKey.name, model, duration, { error: err.message }, responseHeaders, 500);
          if (!res.writableEnded) res.end();
          finish();
        });

        // 如果客户端在传输中途断开，销毁上游流以节省资源
        req.on('close', () => {
          if (stream && typeof stream.destroy === 'function') {
            stream.destroy();
          }
          finish();
        });

        return;
      }

      // 检查是否成功
      if (response.status >= 200 && response.status < 300) {
        apiKeyManager.markSuccess(apiKey.id, model, responseHeaders);
        logRequest(requestId, req, apiKey.name, model, duration, null, responseHeaders, response.status);
        if (updateStatsCallback) updateStatsCallback(true, false);
        
        // 成功，直接返回响应
        requestCompleted = true;
        req.removeListener('close', closeHandler);
        
        if (isJsonResponse) {
          res.set('Content-Type', 'application/json');
          res.status(response.status).send(returnData);
        } else {
          res.set('Content-Type', responseContentType.split(';')[0].trim());
          res.status(response.status).send(returnData);
        }
        finish();
        return;
      }

      // 请求失败，记录错误信息用于重试判断
      const errorStr = Buffer.isBuffer(returnData) ? returnData.toString('utf8') : String(returnData);
      const errorType = extractErrorType(errorStr);
      const isRateLimited = response.status === 429 || errorType === 'rate_limit';
      
      // 标记当前 Key 失败
      apiKeyManager.markFailure(apiKey.id, model, errorType, response.status);
      
      lastError = errorStr;
      lastStatus = response.status;
      lastResponseHeaders = responseHeaders;
      isRetriableError = true;
      
      logRequest(requestId, req, apiKey.name, model, duration, 
        { error: errorStr, attempt: attempt + 1, type: errorType }, responseHeaders, response.status);
      
      if (updateStatsCallback) updateStatsCallback(false, isRateLimited);
      
      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        console.log(`[${requestId}] [${endpoint}] 请求失败，${retryDelayMs}ms 后重试...`);
        req.removeListener('close', closeHandler);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        continue;
      }
      
      // 最后一次尝试失败，返回错误
      req.removeListener('close', closeHandler);
      requestCompleted = true;
      const standardError = convertToStandardError(response.status, errorStr, isRateLimited);
      
      if (isJsonResponse) {
        res.set('Content-Type', 'application/json');
        res.status(response.status).send(returnData);
      } else {
        res.set('Content-Type', responseContentType.split(';')[0].trim());
        res.status(response.status).send(returnData);
      }
      finish();
      return;

    } catch (error) {
      req.removeListener('close', closeHandler);
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] [${endpoint}] 代理错误:`, error.message);
      
      apiKeyManager.markFailure(apiKey.id, model, error.code || error.message);
      lastError = error.message;
      lastStatus = 502;
      isRetriableError = true;
      
      logRequest(requestId, req, apiKey.name, model, duration, 
        { error: error.message, code: error.code, attempt: attempt + 1 }, null, 502);
      
      if (updateStatsCallback) updateStatsCallback(false, false);
      
      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        console.log(`[${requestId}] [${endpoint}] 请求异常，${retryDelayMs}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        continue;
      }
      
      // 最后一次尝试失败
      requestCompleted = true;
      if (!res.headersSent) {
        res.status(502).json({
          error: {
            message: error.message,
            type: 'proxy_error',
            code: 502
          }
        });
      }
      finish();
      return;
    }
  }

  // 所有 Key 都尝试完毕，仍然失败
  if (!res.headersSent) {
    res.status(lastStatus || 502).json({
      error: {
        message: lastError || 'All API keys failed',
        type: 'proxy_error',
        code: lastStatus || 502
      }
    });
  }
}

// ===== 独立接口处理函数 =====

/**
 * ChatGPT 对话接口
 */
async function handleChatCompletions(req, res) {
  console.log('[handleChatCompletions] 收到请求');
  await proxyRequest(req, res, 'chat/completions');
}

/**
 * 文本补全接口
 */
async function handleCompletions(req, res) {
  console.log('[handleCompletions] 收到请求');
  await proxyRequest(req, res, 'completions');
}

/**
 * 向量嵌入接口
 */
async function handleEmbeddings(req, res) {
  console.log('[handleEmbeddings] 收到请求');
  await proxyRequest(req, res, 'embeddings');
}

/**
 * 图片生成接口
 */
async function handleImagesGenerations(req, res) {
  console.log('[handleImagesGenerations] 收到请求');
  await proxyRequest(req, res, 'images/generations');
}

/**
 * 图片编辑接口 - 支持 JSON (base64) 和 multipart/form-data 格式
 */
async function handleImagesEdits(req, res) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  const contentType = req.headers['content-type'] || '';
  const isMultipart = contentType.includes('multipart/form-data');
  
  try {
    let model, imageItems, prompt, mask;
    let extraParams = {};

    function normalizeImageItem(value, fallbackMimeType = 'image/png') {
      if (!value) return null;

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('data:')) {
          return { type: 'data_url', dataUrl: trimmed };
        }

        if (/^https?:\/\//i.test(trimmed)) {
          return { type: 'url', url: trimmed };
        }

        if (/^[A-Za-z0-9+/=\r\n]+$/.test(trimmed)) {
          return { type: 'base64', mimeType: fallbackMimeType, data: trimmed };
        }

        return { type: 'url', url: trimmed };
      }

      if (Buffer.isBuffer(value)) {
        return { type: 'buffer', mimeType: fallbackMimeType, content: value };
      }

      if (typeof value === 'object') {
        if (Array.isArray(value)) return null;

        if (value.dataUrl || value.url || value.base64 || value.image || value.content) {
          return normalizeImageItem(
            value.dataUrl || value.url || value.base64 || value.image || value.content,
            value.mimeType || fallbackMimeType
          );
        }

        if (value.path && fs.existsSync(value.path)) {
          return {
            type: 'buffer',
            mimeType: value.mimeType || fallbackMimeType,
            content: fs.readFileSync(value.path),
            filename: value.filename || 'image.png'
          };
        }
      }

      return null;
    }

    function collectImageItems(value, fallbackMimeType = 'image/png') {
      if (value === undefined || value === null) return [];
      if (Array.isArray(value)) {
        return value.map(item => normalizeImageItem(item, fallbackMimeType)).filter(Boolean);
      }
      const normalized = normalizeImageItem(value, fallbackMimeType);
      return normalized ? [normalized] : [];
    }

    function imageItemToDataUrl(img) {
      if (!img) return null;
      if (img.type === 'data_url') return img.dataUrl;
      if (img.type === 'base64') {
        return img.data.startsWith('data:') ? img.data : `data:${img.mimeType || 'image/png'};base64,${img.data}`;
      }
      if (img.type === 'buffer') {
        return `data:${img.mimeType || 'image/png'};base64,${img.content.toString('base64')}`;
      }
      if (img.type === 'url') return img.url;
      return null;
    }

    if (isMultipart) {
      // multipart/form-data 格式
      const parsedMultipart = await parseMultipartRequest(req);
      model = parsedMultipart.fields?.model?.[0];
      
      // 兼容 image / image[] / images / images[] / file 字段
      const multipartImages = [];
      const multipartImageKeys = ['image', 'image[]', 'images', 'images[]', 'file', 'files'];
      for (const key of multipartImageKeys) {
        const files = parsedMultipart.files?.[key] || [];
        for (const file of files) {
          multipartImages.push({
            type: 'buffer',
            content: fs.readFileSync(file.path),
            filename: file.originalFilename || 'image.png',
            mimeType: file.headers?.['content-type'] || 'image/png'
          });
        }
      }
      imageItems = multipartImages;

      // 兼容 mask 字段（可选）
      const maskFile = parsedMultipart.files?.mask?.[0];
      if (maskFile) {
        mask = {
          type: 'buffer',
          content: fs.readFileSync(maskFile.path),
          filename: maskFile.originalFilename || 'mask.png',
          mimeType: maskFile.headers?.['content-type'] || 'image/png'
        };
      }

      // 处理其他字段
      prompt = parsedMultipart.fields?.prompt?.[0];
      extraParams = {
        size: parsedMultipart.fields?.size?.[0],
        output_format: parsedMultipart.fields?.output_format?.[0],
        moderation: parsedMultipart.fields?.moderation?.[0],
        quality: parsedMultipart.fields?.quality?.[0],
        n: parsedMultipart.fields?.n?.[0],
        user: parsedMultipart.fields?.user?.[0]
      };
    } else {
      // JSON 格式 (支持 base64 图片)
      model = req.body?.model;
      imageItems = collectImageItems(
        req.body?.image ||
        req.body?.['image[]'] ||
        req.body?.images ||
        req.body?.['images[]']
      );

      // 兼容 mask (可选)
      mask = normalizeImageItem(req.body?.mask);
      
      prompt = req.body?.prompt;
      extraParams = {
        size: req.body?.size,
        output_format: req.body?.output_format,
        moderation: req.body?.moderation,
        quality: req.body?.quality,
        n: req.body?.n,
        user: req.body?.user
      };
    }
    
    if (!model) {
      return res.status(400).json({ 
        error: {
          message: "Missing 'model' parameter",
          type: "invalid_request_error",
          code: "missing_model"
        }
      });
    }

    if (!imageItems || imageItems.length === 0) {
      return res.status(400).json({ 
        error: {
          message: "Missing 'image' parameter",
          type: "invalid_request_error",
          code: "missing_image"
        }
      });
    }

    const apiKey = apiKeyManager.getKeyForModel(model);
    if (!apiKey) {
      logRequest(requestId, req, null, model, 0, { error: '该模型无可用 API Key' }, null, 503);
      return res.status(503).json({ 
        error: {
          message: `No available API key for model: ${model}`,
          type: "proxy_error",
          code: "no_available_key"
        }
      });
    }

    let finished = false;
    let requestCompleted = false;

    const finish = () => {
      if (!finished) {
        finished = true;
        apiKeyManager.releaseKey(apiKey.id);
      }
    };

    req.on('close', () => {
      if (!requestCompleted && !res.writableEnded) {
        finish();
        logRequest(requestId, req, apiKey.name, model, Date.now() - startTime, 
          { error: '客户端异常断开' }, null, 499);
      }
    });

    const targetUrl = buildTargetUrl('images/edits', apiKey.baseUrl);
    const isJsonTarget = true;

    const jsonBody = {
      model,
      prompt,
      image: imageItems.length === 1 ? imageItemToDataUrl(imageItems[0]) : imageItems.map(imageItemToDataUrl)
    };

    if (mask) {
      jsonBody.mask = imageItemToDataUrl(mask);
    }

    for (const [key, value] of Object.entries(extraParams)) {
      if (value !== undefined && value !== null && value !== '') {
        jsonBody[key] = value;
      }
    }

    console.log(`[${requestId}] [handleImagesEdits] 代理请求到 ${targetUrl}, 格式: ${isJsonTarget ? 'json/base64' : 'multipart'}`);

    const headers = {
      ...req.headers,
      'Authorization': `Bearer ${apiKey.key}`,
      'Accept-Encoding': 'identity'
    };
    delete headers.host;
    delete headers['content-length'];

    const requestHeaders = {
      ...headers,
      'Content-Type': 'application/json'
    };

    const response = await axios({
      method: 'POST',
      url: targetUrl,
      headers: requestHeaders,
      data: jsonBody,
      responseType: 'arraybuffer',
      decompress: true,
      timeout: 300000,
      validateStatus: () => true
    });

    const duration = Date.now() - startTime;
    const responseHeaders = extractRateLimitHeaders(response.headers);
    const responseContentType = response.headers['content-type'] || '';

    const isJsonResponse = responseContentType.includes('application/json');
    const isImageResponse = responseContentType.includes('image/');

    let returnData;
    if (isJsonResponse) {
      returnData = Buffer.isBuffer(response.data) ? response.data.toString('utf8') : String(response.data);
    } else if (isImageResponse) {
      returnData = response.data;
    } else {
      returnData = Buffer.isBuffer(response.data) ? response.data.toString('utf8') : String(response.data);
    }

    let standardError = null;

    if (response.status >= 200 && response.status < 300) {
      apiKeyManager.markSuccess(apiKey.id, model, responseHeaders);
      logRequest(requestId, req, apiKey.name, model, duration, null, responseHeaders, response.status);
      if (updateStatsCallback) updateStatsCallback(true, false);
    } else {
      const errorStr = Buffer.isBuffer(returnData) ? returnData.toString('utf8') : String(returnData);
      const errorType = extractErrorType(errorStr);
      const isRateLimited = response.status === 429 || errorType === 'rate_limit';
      apiKeyManager.markFailure(apiKey.id, model, errorType, response.status);
      logRequest(requestId, req, apiKey.name, model, duration, 
        { error: errorStr }, responseHeaders, response.status);
      if (updateStatsCallback) updateStatsCallback(false, isRateLimited);
      
      standardError = convertToStandardError(response.status, errorStr, isRateLimited);
    }

    requestCompleted = true;

    if (standardError) {
      res.status(response.status).json(standardError);
    } else if (isJsonResponse) {
      res.set('Content-Type', 'application/json');
      res.status(response.status).send(returnData);
    } else if (isImageResponse) {
      res.set('Content-Type', responseContentType.split(';')[0].trim());
      res.status(response.status).send(returnData);
    } else {
      res.set('Content-Type', responseContentType.split(';')[0].trim());
      res.status(response.status).send(returnData);
    }
    finish();

  } catch (error) {
    console.error(`[handleImagesEdits] 错误:`, error.message);
    res.status(502).json({
      error: {
        message: error.message,
        type: 'proxy_error',
        code: 502
      }
    });
  }
}

/**
 * Anthropic 风格消息接口
 */
async function handleMessages(req, res) {
  console.log('[handleMessages] 收到请求');
  await proxyRequest(req, res, 'messages');
}

// 保留旧的通用函数用于向后兼容（如果还有其他地方调用）
async function handleProxyRequest(req, res) {
  const endpoint = req.originalUrl.replace('/v1/', '').replace('/', '');
  await proxyRequest(req, res, endpoint);
}

/**
 * 通用代理路由处理
 */
async function handleGenericProxy(req, res) {
  const endpoint = req.params[0] || '';
  await proxyRequest(req, res, endpoint);
}

/**
 * 获取服务器状态
 */
function getServerStatus() {
  const port = config?.server?.port || 3456;
  const host = config?.server?.host || 'localhost';
  return {
    running: server !== null,
    url: `http://${host}:${port}`,
    stats: apiKeyManager ? apiKeyManager.getStats() : {},
    keys: apiKeyManager ? apiKeyManager.getAllKeyStatus() : []
  };
}

module.exports = { startServer, stopServer, getServerStatus };
