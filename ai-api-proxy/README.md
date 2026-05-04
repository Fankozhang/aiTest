# API Key 轮询代理 - 功能使用文档

## 项目概述

这是一个基于 Electron + Express 的 API Key 轮询代理服务，主要功能是：
- **多 API Key 轮询**：当某个 Key 达到速率限制时自动切换到其他可用 Key
- **智能路由**：不同模型使用不同的 API Key
- **代理服务**：将请求代理到上游 API，支持 OpenAI 兼容格式

---

## 核心文件结构

```
api轮训代理/
├── main.js                 # Electron 主进程，处理配置、IPC、窗口管理
├── preload.js             # 预加载脚本，暴露安全 API 给前端
├── src/
│   ├── server.js          # Express 代理服务器，核心请求处理逻辑
│   ├── apiKeyManager.js   # API Key 轮询管理、熔断器逻辑
│   ├── db.js              # 日志存储模块
│   └── auth.js            # 认证中间件（暂未启用）
├── ui/
│   ├── index.html         # Web UI 界面
│   ├── app.js             # 前端逻辑
│   └── styles.css         # 样式文件
└── data/
    ├── config.json        # 配置文件（API Keys、统计等）
    └── logs.json          # 请求日志
```

---

## 已实现功能详解

### 1. API Key 管理

**文件**: `src/apiKeyManager.js`

#### 功能：
- 每个 Key 支持配置多个模型
- 支持启用/禁用 Key
- Key 状态跟踪（active/disabled）
- 模型列表自动检测

#### 核心类 `ApiKeyManager`:
```javascript
constructor(config)        // 初始化，加载 API Keys
getKeyForModel(model)      // 为指定模型获取可用 Key
markSuccess(keyId, model)  // 标记 Key 成功，释放并发占用
markFailure(keyId, model)  // 标记 Key 失败，触发熔断
releaseKey(keyId)          // 释放 Key 的并发占用
```

#### 熔断器逻辑：
- 连续失败超过 `circuitBreakerThreshold`（默认3次）则熔断
- 熔断后等待 `circuitBreakerResetSeconds`（默认300秒）恢复
- Key 有并发限制 `maxConcurrentPerKey`（默认5）

---

### 2. 代理服务器

**文件**: `src/server.js`

#### 支持的接口：
| 接口 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/v1/models` | GET | 获取模型列表（从 Key 中提取） |
| `/v1/chat/completions` | POST | ChatGPT 对话接口 |
| `/v1/completions` | POST | 文本补全接口 |
| `/v1/embeddings` | POST | 向量嵌入接口 |
| `/v1/images/generations` | POST | 图片生成接口（JSON 格式） |
| `/v1/images/edits` | POST | 图片编辑接口（multipart 格式） |
| `/v1/messages` | POST | Anthropic 风格消息接口 |
| `/admin/stats` | GET | 统计信息 |
| `/admin/logs` | GET | 请求日志 |

#### 请求处理流程：
1. 解析请求中的 `model` 参数（支持 JSON 和 multipart 格式）
2. 调用 `apiKeyManager.getKeyForModel(model)` 获取可用 Key
3. 如果没有可用 Key，返回 503
4. 转发请求到上游 API，透传原始响应内容
5. 记录请求日志和统计

#### 请求格式支持：

**JSON 格式**（/v1/chat/completions, /v1/embeddings, /v1/images/generations）：
```javascript
{
  "model": "gpt-4",
  "messages": [{"role": "user", "content": "Hello"}]
}
```

**multipart 格式**（/v1/images/edits）：
- 图片以文件上传方式传递
- 支持字段：model, prompt, image, mask 等

#### 响应处理：
- 统一使用 `arraybuffer` 接收上游响应
- 自动解压 gzip 压缩（如果上游返回压缩数据）
- 透传 Content-Type 响应头，不做转换
- 支持 JSON 和图片（二进制）响应

#### 请求头处理：
- `Accept-Encoding: identity` - 禁止上游返回压缩数据，确保响应可正确解析
- `Content-Type` - 透传原始内容类型
- 移除可能导致问题的 `host` 和 `content-length` 头

#### multipart 请求解析：

**文件**: `src/server.js` - `parseMultipart()` 函数

用于解析 `/v1/images/edits` 等 multipart 格式请求：
1. 从 Content-Type 中提取 boundary
2. 分割请求体，提取各字段和文件
3. 字段存储在 `parsed.fields`，文件存储在 `parsed.files`
4. 使用 FormData 转发到上游 API

---

### 3. 统计功能

**文件**: `main.js` 中的 `updateStats()` 和 `getStats()`

#### 统计数据存储在 `config.stats` 中：
```javascript
{
  totalRequests: 10,           // 总请求数
  successfulRequests: 10,       // 成功请求数
  failedRequests: 0,            // 失败请求数
  rateLimitHits: 0,             // 限流次数
  dailyStats: {                  // 按日统计
    '2026-05-02': { requests: 10, success: 10, failed: 0, rateLimit: 0 }
  },
  monthlyStats: {                // 按月统计
    '2026-05': { requests: 10, success: 10, failed: 0, rateLimit: 0 }
  },
  yearlyStats: {                 // 按年统计
    '2026': { requests: 10, success: 10, failed: 0, rateLimit: 0 }
  }
}
```

#### 统计更新流程：
1. 请求完成后，调用 `updateStatsCallback(success, isRateLimited)`
2. 该回调在 `server.startServer(config, updateStats)` 时传入
3. 更新 config.json 并保存

---

### 4. 前端 UI

**文件**: `ui/index.html`, `ui/app.js`, `ui/styles.css`

#### 页面结构：
- **密钥管理** (`#page-keys`): 添加/编辑/删除 API Key，设置支持的模型
- **模型管理** (`#page-models`): 查看所有可用模型，测试模型连通性
- **使用统计** (`#page-usage`): 总请求、今日/本月/今年统计
- **请求日志** (`#page-logs`): 查看所有请求记录，筛选错误/限流
- **设置** (`#page-settings`): 服务器端口、限流参数、日志开关

#### 关键 JS 函数：
```javascript
// 配置管理
loadConfig()                        // 从后端加载配置
saveConfig(config)                  // 保存配置到后端

// 密钥管理
updateKeyList()                     // 渲染密钥列表
addKey()                             // 添加密钥
editKey(id)                          // 编辑密钥
removeKey(id)                       // 删除密钥
testSingleModel(model)               // 测试单个模型
testAllModels()                     // 测试所有模型

// 模型管理
updateModelsList()                  // 渲染模型列表
detectModels()                       // 检测密钥支持的模型

// 统计
refreshStats()                      // 刷新统计数据
startStatsAutoRefresh()             // 启动定时刷新
stopStatsAutoRefresh()              // 停止定时刷新

// 日志
refreshLogs()                       // 刷新日志列表
renderLogs(entries)                 // 渲染日志表格
clearLogs()                         // 清空日志（需手动删除文件）

// 设置
saveSettings()                      // 保存设置
updateSettingsForm()                // 更新设置表单

// 工具
escapeHtml(str)                     // HTML 转义
showToast(message, type)            // 显示提示消息
```

---

### 5. IPC 通信

**文件**: `main.js` 中的 `ipcMain.handle()` + `preload.js` 中的 `exposeInMainWorld()`

#### 已暴露的 API：
```javascript
window.electronAPI.getConfig()           // 获取配置
window.electronAPI.saveConfig(config)     // 保存配置
window.electronAPI.addApiKey(config)      // 添加 API Key
window.electronAPI.removeApiKey(id)       // 删除 API Key
window.electronAPI.updateApiKey(id, ...)  // 更新 API Key
window.electronAPI.getServerStatus()      // 获取服务器状态
window.electronAPI.getStats()             // 获取统计数据
window.electronAPI.resetConfig()          // 重置为默认配置
```

---

## 配置数据结构

**文件**: `data/config.json`

```javascript
{
  "server": {
    "port": 3456,           // 服务器端口
    "host": "localhost"      // 服务器主机
  },
  "apiKeys": [
    {
      "id": "uuid",
      "name": "Key名称",
      "key": "sk-xxx",
      "baseUrl": "https://api.openai.com/v1",
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "enabled": true,
      "status": "active",
      "stats": {
        "totalRequests": 0,
        "successfulRequests": 0,
        "failedRequests": 0,
        "lastUsed": null
      }
    }
  ],
  "auth": {
    "enabled": false,
    "secret": "",
    "tokens": []
  },
  "rateLimit": {
    "maxConcurrentPerKey": 5,
    "circuitBreakerThreshold": 3,
    "retryAfterSeconds": 60,
    "circuitBreakerResetSeconds": 300
  },
  "logging": {
    "enabled": true,
    "logRequestHeaders": true,
    "logResponseHeaders": true
  },
  "stats": {
    // 统计数据结构见上文
  }
}
```

---

## 如何增加新功能

### 1. 添加新的 API 接口

在 `src/server.js` 中添加新的路由：
```javascript
app.post('/v1/your-new-endpoint', async (req, res) => {
  // 获取 API Key
  const apiKey = apiKeyManager.getKeyForModel(req.body.model);
  if (!apiKey) {
    return res.status(503).json({ error: 'No available API key' });
  }
  // 代理请求...
});
```

### 2. 添加新的统计指标

1. 在 `main.js` 的 `getDefaultConfig().stats` 中添加新字段
2. 在 `updateStats()` 中更新该字段
3. 在 `getStats()` 中返回给前端
4. 在 `ui/index.html` 添加显示元素
5. 在 `ui/app.js` 的 `refreshStats()` 中更新显示

### 3. 添加新的 UI 页面

1. 在 `ui/index.html` 添加新的 section
2. 在 `ui/app.js` 中添加对应的渲染函数
3. 在导航栏添加入口
4. 在 `switchPage()` 中添加页面切换逻辑

### 4. 添加新的配置项

1. 在 `main.js` 的 `getDefaultConfig()` 中添加默认值
2. 在 `ui/index.html` 添加输入控件
3. 在 `ui/app.js` 的 `saveSettings()` 中保存
4. 在 `server.js` 中读取使用

---

## 注意事项

1. **配置持久化**: 所有配置保存在 `data/config.json`，重启不丢失
2. **统计持久化**: 统计数据保存在配置中，重启后保留
3. **日志存储**: 日志保存在 `data/logs.json`，会自动清理旧日志
4. **API Key 安全**: 前端显示时会部分隐藏，但完整 Key 保存在配置文件中