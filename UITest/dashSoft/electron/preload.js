const { contextBridge, ipcRenderer } = require('electron')

// 向渲染进程暴露安全的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),

  // 配置
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // 屏幕源
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  selectRecordArea: () => ipcRenderer.invoke('select-record-area'),
  hideRecordAreaIndicator: () => ipcRenderer.invoke('hide-record-area-indicator'),

  // 录制文件
  saveRecordingFile: (data) => ipcRenderer.invoke('save-recording-file', data),
  getRecordings: () => ipcRenderer.invoke('get-recordings'),
  saveRecording: (record) => ipcRenderer.invoke('save-recording', record),
  deleteRecording: (filePath) => ipcRenderer.invoke('delete-recording', filePath),

  // 截图
  saveScreenshotFile: (data) => ipcRenderer.invoke('save-screenshot-file', data),
  getScreenshots: () => ipcRenderer.invoke('get-screenshots'),
  saveScreenshotRecord: (record) => ipcRenderer.invoke('save-screenshot-record', record),
  deleteScreenshot: (filePath) => ipcRenderer.invoke('delete-screenshot', filePath),
  copyImageToClipboard: (filePath) => ipcRenderer.invoke('copy-image-to-clipboard', filePath),

  // 文件操作
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),

  // 系统信息
  getDiskSpace: () => ipcRenderer.invoke('get-disk-space'),
  getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),

  // 录制状态通知主进程
  notifyRecordingStarted: () => ipcRenderer.send('recording-started'),
  notifyRecordingStopped: () => ipcRenderer.send('recording-stopped'),

  // 监听主进程快捷键事件
  onShortcut: (channel, callback) => {
    const validChannels = [
      'shortcut-toggle-record',
      'shortcut-pause-record',
      'shortcut-screenshot',
      'shortcut-toggle-toolbar'
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args))
    }
  },
  offShortcut: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  },
  onRecordAreaCleared: (callback) => {
    ipcRenderer.on('record-area-cleared', () => callback())
  },
  offRecordAreaCleared: () => {
    ipcRenderer.removeAllListeners('record-area-cleared')
  },
  onRecordAreaUpdated: (callback) => {
    ipcRenderer.on('record-area-updated', (_, area) => callback(area))
  },
  offRecordAreaUpdated: () => {
    ipcRenderer.removeAllListeners('record-area-updated')
  }
})
