const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// 热更新配置
try {
  require('electron-reloader')(module, {
    watchRenderer: true,
    ignore: ['data/*.json', 'data/logs.json']
  });
} catch (_) {
  console.log('Error loading electron-reloader');
}
const { v4: uuidv4 } = require('uuid');

// 路径定义
const APP_DIR = __dirname;

function getDataDir() {
  return path.join(app.getPath('userData'), 'data');
}

function getConfigFile() {
  return path.join(getDataDir(), 'config.json');
}

let mainWindow;
let tray;
let config = {};
let serverInstance = null;

// 确保数据目录存在
function ensureDataDir() {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// 加载配置
function loadConfig() {
  ensureDataDir();
  const configFile = getConfigFile();
  console.log('[DB] 加载配置, 路径:', configFile);
  try {
    if (fs.existsSync(configFile)) {
      const data = fs.readFileSync(configFile, 'utf8');
      const loaded = JSON.parse(data);
      console.log('[DB] 从文件加载配置, apiKeys 数量:', loaded.apiKeys?.length || 0);
      console.log('[DB] server 配置:', JSON.stringify(loaded.server));
      return loaded;
    }
  } catch (error) {
    console.error('[DB] 加载配置失败:', error);
  }
  return getDefaultConfig();
}

// 保存配置
function saveConfig(configData) {
  ensureDataDir();
  const configFile = getConfigFile();
  try {
    const jsonStr = JSON.stringify(configData, null, 2);
    fs.writeFileSync(configFile, jsonStr, 'utf8');
    console.log('[DB] 配置已保存, apiKeys 数量:', configData.apiKeys?.length || 0);
    return true;
  } catch (error) {
    console.error('[DB] 保存配置失败:', error);
    return false;
  }
}

// 默认配置
function getDefaultConfig() {
  return {
    server: { port: 3456, host: 'localhost' },
    apiKeys: [],
    auth: { enabled: false, secret: '', tokens: [] },
    rateLimit: {
      maxConcurrentPerKey: 5,
      circuitBreakerThreshold: 3,
      retryAfterSeconds: 60,
      circuitBreakerResetSeconds: 60,
      maxRetries: 5,
      retryDelayMs: 300
    },
    logging: {
      enabled: true,
      logRequestHeaders: true,
      logResponseHeaders: true
    },
    stats: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      dailyStats: {},
      monthlyStats: {},
      yearlyStats: {}
    }
  };
}

// 获取日期字符串（本地时间）
function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getYearKey(date = new Date()) {
  return String(date.getFullYear());
}

// 更新统计数据
function updateStats(success, isRateLimited) {
  const config = loadConfig();
  if (!config.stats) config.stats = getDefaultConfig().stats;
  
  const now = new Date();
  const dateKey = getDateKey(now);
  const monthKey = getMonthKey(now);
  const yearKey = getYearKey(now);
  
  // 更新总数
  config.stats.totalRequests = (config.stats.totalRequests || 0) + 1;
  if (success) {
    config.stats.successfulRequests = (config.stats.successfulRequests || 0) + 1;
  } else {
    config.stats.failedRequests = (config.stats.failedRequests || 0) + 1;
  }
  if (isRateLimited) {
    config.stats.rateLimitHits = (config.stats.rateLimitHits || 0) + 1;
  }
  
  // 更新日统计
  if (!config.stats.dailyStats) config.stats.dailyStats = {};
  if (!config.stats.dailyStats[dateKey]) {
    config.stats.dailyStats[dateKey] = { requests: 0, success: 0, failed: 0, rateLimit: 0 };
  }
  config.stats.dailyStats[dateKey].requests++;
  if (success) config.stats.dailyStats[dateKey].success++;
  else config.stats.dailyStats[dateKey].failed++;
  if (isRateLimited) config.stats.dailyStats[dateKey].rateLimit++;
  
  // 更新月统计
  if (!config.stats.monthlyStats) config.stats.monthlyStats = {};
  if (!config.stats.monthlyStats[monthKey]) {
    config.stats.monthlyStats[monthKey] = { requests: 0, success: 0, failed: 0, rateLimit: 0 };
  }
  config.stats.monthlyStats[monthKey].requests++;
  if (success) config.stats.monthlyStats[monthKey].success++;
  else config.stats.monthlyStats[monthKey].failed++;
  if (isRateLimited) config.stats.monthlyStats[monthKey].rateLimit++;
  
  // 更新年统计
  if (!config.stats.yearlyStats) config.stats.yearlyStats = {};
  if (!config.stats.yearlyStats[yearKey]) {
    config.stats.yearlyStats[yearKey] = { requests: 0, success: 0, failed: 0, rateLimit: 0 };
  }
  config.stats.yearlyStats[yearKey].requests++;
  if (success) config.stats.yearlyStats[yearKey].success++;
  else config.stats.yearlyStats[yearKey].failed++;
  if (isRateLimited) config.stats.yearlyStats[yearKey].rateLimit++;
  
  saveConfig(config);
}

// 获取统计数据的辅助函数
function getStats() {
  const config = loadConfig();
  const stats = config.stats || getDefaultConfig().stats;
  
  const now = new Date();
  const dateKey = getDateKey(now);
  const monthKey = getMonthKey(now);
  const yearKey = getYearKey(now);
  
  return {
    total: {
      requests: stats.totalRequests || 0,
      success: stats.successfulRequests || 0,
      failed: stats.failedRequests || 0,
      rateLimit: stats.rateLimitHits || 0
    },
    today: stats.dailyStats?.[dateKey] || { requests: 0, success: 0, failed: 0, rateLimit: 0 },
    thisMonth: stats.monthlyStats?.[monthKey] || { requests: 0, success: 0, failed: 0, rateLimit: 0 },
    thisYear: stats.yearlyStats?.[yearKey] || { requests: 0, success: 0, failed: 0, rateLimit: 0 }
  };
}

// 加载服务器模块
function loadServerModule() {
  try {
    const serverModule = require(path.join(APP_DIR, 'src', 'server'));
    console.log('[Server] 服务器模块已加载:', typeof serverModule.startServer);
    return serverModule;
  } catch (e) {
    console.error('加载服务器模块失败:', e.message);
    console.error('错误详情:', e.stack);
    return null;
  }
}

// 初始化配置
function initConfig() {
  config = loadConfig();
  console.log('[Init] 配置加载完成, apiKeys:', config.apiKeys?.length || 0);
}

function createWindow() {
  const iconPath = path.join(APP_DIR, 'assets', 'key2api.png');
  let windowIcon;
  try {
    if (fs.existsSync(iconPath)) {
      windowIcon = nativeImage.createFromPath(iconPath);
    }
  } catch (e) {
    console.error('[Window] 加载图标失败:', e.message);
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: windowIcon,
    webPreferences: {
      preload: path.join(APP_DIR, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    },
    title: 'API Key 轮询代理',
    backgroundColor: '#0F172A'
  });

  mainWindow.loadFile(path.join(APP_DIR, 'ui', 'index.html'));
  
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(APP_DIR, 'assets', 'key2api.png');
  let trayIcon;

  try {
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
      if (!trayIcon.isEmpty()) {
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
      }
    }
  } catch (e) {
    console.error('[Tray] 加载图标失败:', e.message);
  }

  if (!trayIcon || trayIcon.isEmpty()) {
    console.log('[Tray] 没有找到图标文件，跳过托盘创建');
    return;
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('API Key 轮询代理');

  function updateTrayMenu() {
    const isRunning = serverInstance !== null;
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: '隐藏窗口',
        click: () => {
          if (mainWindow) {
            mainWindow.hide();
          }
        }
      },
      { type: 'separator' },
      {
        label: isRunning ? '服务器: 运行中' : '服务器: 已停止',
        enabled: false
      },
      {
        label: isRunning ? `地址: http://${config.server?.host || 'localhost'}:${config.server?.port || 3456}` : '',
        enabled: false
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          stopProxyServer();
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
  }

  updateTrayMenu();

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  console.log('[Tray] 托盘图标创建成功');
  return updateTrayMenu;
}

async function startProxyServer() {
  console.log('[Server] 尝试启动代理服务器...');
  console.log('[Server] 当前配置:', JSON.stringify({
    port: config.server?.port,
    host: config.server?.host,
    apiKeysCount: config.apiKeys?.length || 0
  }));
  
  const server = loadServerModule();
  if (server && server.startServer) {
    try {
      console.log('[Server] 调用 server.startServer...');
      serverInstance = await server.startServer(config, updateStats);
      console.log('[Server] 服务器启动成功');
      return true;
    } catch (err) {
      console.error('[Server] 启动出错:', err.message, err.stack);
      return false;
    }
  }
  console.error('[Server] 服务器模块加载失败');
  return false;
}

async function stopProxyServer() {
  const server = loadServerModule();
  if (server && server.stopServer) {
    server.stopServer();
    serverInstance = null;
  }
}

// ===== IPC 处理器 =====

ipcMain.handle('get-config', () => {
  // 每次都重新从文件加载
  config = loadConfig();
  return config;
});

ipcMain.handle('save-config', async (event, newConfig) => {
  console.log('[IPC] save-config 被调用');
  // 加载当前保存的配置
  const currentConfig = loadConfig();
  // 合并配置，保留 apiKeys
  config = { 
    ...currentConfig, 
    ...newConfig,
    apiKeys: newConfig.apiKeys !== undefined ? newConfig.apiKeys : (currentConfig.apiKeys || [])
  };
  
  const success = saveConfig(config);
  if (success) {
    await stopProxyServer();
    await startProxyServer();
  }
  
  return { success, config };
});

ipcMain.handle('add-api-key', async (event, apiKeyConfig) => {
  console.log('[IPC] add-api-key 被调用:', apiKeyConfig.name);
  
  // 加载当前配置
  config = loadConfig();
  
  if (!config.apiKeys) {
    config.apiKeys = [];
  }
  
  const keyData = {
    id: uuidv4(),
    name: apiKeyConfig.name || '未命名密钥',
    key: apiKeyConfig.key,
    baseUrl: apiKeyConfig.baseUrl || '',
    models: apiKeyConfig.models || [],
    enabled: apiKeyConfig.enabled !== false,
    status: 'active',
    stats: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, lastUsed: null }
  };
  
  config.apiKeys.push(keyData);
  console.log('[IPC] 添加后 apiKeys 数量:', config.apiKeys.length);
  
  const success = saveConfig(config);
  console.log('[IPC] 保存结果:', success);
  
  if (success) {
    await stopProxyServer();
    await startProxyServer();
  }
  
  return { success, apiKeys: config.apiKeys };
});

ipcMain.handle('remove-api-key', async (event, keyId) => {
  config = loadConfig();
  
  if (config.apiKeys) {
    config.apiKeys = config.apiKeys.filter(k => k.id !== keyId);
    const success = saveConfig(config);
    
    if (success) {
      await stopProxyServer();
      await startProxyServer();
    }
    
    return { success, apiKeys: config.apiKeys };
  }
  return { success: false, apiKeys: [] };
});

ipcMain.handle('update-api-key', async (event, keyId, updates) => {
  config = loadConfig();
  
  if (config.apiKeys) {
    const index = config.apiKeys.findIndex(k => k.id === keyId);
    if (index !== -1) {
      config.apiKeys[index] = { ...config.apiKeys[index], ...updates };
      const success = saveConfig(config);
      
      if (success) {
        await stopProxyServer();
        await startProxyServer();
      }
      
      return { success, apiKeys: config.apiKeys };
    }
  }
  return { success: false, apiKeys: config.apiKeys || [] };
});

ipcMain.handle('get-server-status', () => {
  const server = loadServerModule();
  if (server && server.getServerStatus) {
    return server.getServerStatus();
  }
  
  return {
    running: serverInstance !== null,
    url: `http://${config.server?.host || 'localhost'}:${config.server?.port || 3456}`,
    stats: getStats(),
    keys: config.apiKeys || []
  };
});

ipcMain.handle('get-stats', () => {
  return getStats();
});

ipcMain.handle('get-data-dir', () => {
  return getDataDir();
});

ipcMain.handle('reset-config', () => {
  const defaultConfig = getDefaultConfig();
  const currentConfig = loadConfig();
  
  // 恢复所有设置，保留 apiKeys、stats、auth
  const resetConfig = {
    ...defaultConfig,
    server: currentConfig.server || defaultConfig.server,
    apiKeys: currentConfig.apiKeys || [],
    stats: currentConfig.stats,
    auth: currentConfig.auth || defaultConfig.auth
  };
  
  if (saveConfig(resetConfig)) {
    config = resetConfig;
    return { success: true, config: resetConfig };
  }
  return { success: false };
});

// ===== 应用启动 =====

app.whenReady().then(async () => {
  console.log('===== 应用启动 =====');
  initConfig();
  createWindow();
  await startProxyServer();
  createTray();
  console.log('===== 启动完成 =====');
});

app.on('window-all-closed', () => {
  stopProxyServer();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});