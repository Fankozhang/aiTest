const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 配置管理
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // API Key 管理
  addApiKey: (apiKeyConfig) => ipcRenderer.invoke('add-api-key', apiKeyConfig),
  removeApiKey: (keyId) => ipcRenderer.invoke('remove-api-key', keyId),
  updateApiKey: (keyId, updates) => ipcRenderer.invoke('update-api-key', keyId, updates),
  
  // 服务器状态
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  
  // 统计数据
  getStats: () => ipcRenderer.invoke('get-stats'),
  
  // 数据目录
  getDataDir: () => ipcRenderer.invoke('get-data-dir'),
  
  // 重置配置
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  
  // 监听事件
  onServerStatusChange: (callback) => {
    ipcRenderer.on('server-status-changed', callback);
    return () => ipcRenderer.removeListener('server-status-changed', callback);
  }
});