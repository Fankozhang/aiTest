const fs = require('fs');
const path = require('path');
let electronApp = null;

try {
  electronApp = require('electron').app;
} catch (e) {
  console.log('[db]Electron 不可用，使用备用路径');
}

function getDataDir() {
  if (electronApp) {
    return path.join(electronApp.getPath('userData'), 'data');
  }
  // 备用路径（在项目目录）
  return path.join(__dirname, '..', 'data');
}

function getConfigFile() {
  return path.join(getDataDir(), 'config.json');
}

// 获取日志文件路径 (改为 .log 后缀表示 NDJSON 格式)
function getLogsFile() {
  return path.join(getDataDir(), 'api-requests.log');
}

// 确保数据目录存在
function ensureDataDir() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 加载配置
function loadConfig() {
  ensureDataDir();
  const configFile = getConfigFile();
  console.log('[db.loadConfig] 读取路径:', configFile);
  try {
    if (fs.existsSync(configFile)) {
      const data = fs.readFileSync(configFile, 'utf8');
      const config = JSON.parse(data);
      console.log('[db.loadConfig] 加载成功, apiKeys:', config.apiKeys?.length || 0);
      return config;
    } else {
      console.log('[db.loadConfig] 文件不存在，使用默认配置');
    }
  } catch (error) {
    console.error('[db.loadConfig] 加载配置失败:', error);
  }
  return getDefaultConfig();
}

// 保存配置
function saveConfig(config) {
  ensureDataDir();
  const configFile = getConfigFile();
  try {
    console.log('[db.saveConfig] 保存路径:', configFile);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[db.saveConfig] 保存配置失败:', error);
    return false;
  }
}

// 追加单条日志 (NDJSON 格式)
function appendLogEntry(entry) {
  ensureDataDir();
  const logsFile = getLogsFile();
  try {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logsFile, line, 'utf8');
    return true;
  } catch (error) {
    console.error('[db.appendLogEntry] 写入日志失败:', error);
    return false;
  }
}

// 清空日志文件
function clearLogsFile() {
  ensureDataDir();
  const logsFile = getLogsFile();
  try {
    if (fs.existsSync(logsFile)) {
      fs.writeFileSync(logsFile, '', 'utf8');
    }
    return true;
  } catch (error) {
    console.error('[db.clearLogsFile] 清空日志失败:', error);
    return false;
  }
}

// 加载日志 (从 NDJSON 文件读取并解析为数组)
function loadLogs(limit = 1000) {
  ensureDataDir();
  const logsFile = getLogsFile();
  try {
    if (fs.existsSync(logsFile)) {
      const content = fs.readFileSync(logsFile, 'utf8');
      const lines = content.trim().split('\n');
      // 只取最后 limit 条以保证性能
      const lastLines = lines.slice(-limit);
      const entries = lastLines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      return { entries };
    }
  } catch (error) {
    console.error('加载日志失败:', error);
  }
  return { entries: [] };
}

// 获取默认配置
function getDefaultConfig() {
  return {
    server: {
      port: 3456,
      host: 'localhost'
    },
    apiKeys: [],
    auth: {
      enabled: false,
      secret: '',
      tokens: []
    },
    rateLimit: {
      maxRequestsPerMinute: 60,
      maxConcurrentPerKey: 5,
      retryAfterSeconds: 60,
      circuitBreakerThreshold: 3,
      circuitBreakerResetSeconds: 60,
      maxRetries: 5,
      retryDelayMs: 300
    },
    logging: {
      enabled: true,
      maxLogEntries: 10000,
      logRequestHeaders: true,
      logResponseHeaders: true,
      preserveContextLogs: true
    }
  };
}

module.exports = {
  loadConfig,
  saveConfig,
  loadLogs,
  appendLogEntry,
  clearLogsFile
};
