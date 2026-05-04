const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, screen, desktopCapturer, dialog, Notification, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

// 开发模式判断
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow = null
let tray = null
let isRecording = false
let isPaused = false
let recordingTimer = null
let recordingSeconds = 0
let areaSelectorWindow = null
let areaIndicatorWindow = null

// 默认配置
const defaultConfig = {
  video: {
    quality: 'hd',         // sd | hd | ultra
    fps: 60,
    resolution: '1920x1080',
    format: 'mp4',
    cursor: { show: true, highlight: false, size: 'default' }
  },
  audio: {
    enabled: true,
    micDevice: 'default',
    micVolume: 80,
    systemAudio: true,
    noiseReduction: true,
    format: 'aac'
  },
  camera: {
    enabled: false,
    device: 'default'
  },
  storage: {
    videoPath: path.join(os.homedir(), 'Videos', 'ScreenRec'),
    screenshotPath: path.join(os.homedir(), 'Pictures', 'ScreenRec'),
    autoOpenFolder: true,
    namingRule: '{日期}_{时间}_{序号}'
  },
  shortcuts: {
    startStop: 'F9',
    pause: 'F10',
    screenshot: 'F11',
    toggleToolbar: 'Ctrl+T',
    minimize: 'Ctrl+M',
    areaRecord: 'Ctrl+R'
  },
  notifications: {
    onStart: true,
    onStop: true,
    storageWarning: true,
    sound: false,
    duration: 5
  }
}

// 配置文件路径
const configPath = path.join(app.getPath('userData'), 'config.json')

// 读取配置
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8')
      return Object.assign({}, defaultConfig, JSON.parse(raw))
    }
  } catch (e) { /* 忽略错误，使用默认配置 */ }
  return { ...defaultConfig }
}

// 保存配置
function saveConfig(config) {
  try {
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
  } catch (e) { console.error('保存配置失败:', e) }
}

let appConfig = loadConfig()

// 确保存储目录存在
function ensureStorageDirs() {
  try {
    fs.mkdirSync(appConfig.storage.videoPath, { recursive: true })
    fs.mkdirSync(appConfig.storage.screenshotPath, { recursive: true })
  } catch (e) { /* 忽略 */ }
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,           // 无边框，使用自定义标题栏
    transparent: false,
    backgroundColor: '#F0F2F5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false    // 允许加载本地媒体
    },
    titleBarStyle: 'hidden',
    show: false
  })

  // 加载页面
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 最小化到托盘
  mainWindow.on('minimize', (e) => {
    // 保持默认最小化行为
  })
}

// 注册全局快捷键
function registerShortcuts() {
  globalShortcut.unregisterAll()
  const sc = appConfig.shortcuts

  try {
    globalShortcut.register(sc.startStop, () => {
      mainWindow?.webContents.send('shortcut-toggle-record')
    })
    globalShortcut.register(sc.pause, () => {
      mainWindow?.webContents.send('shortcut-pause-record')
    })
    globalShortcut.register(sc.screenshot, () => {
      mainWindow?.webContents.send('shortcut-screenshot')
    })
    if (sc.toggleToolbar) {
      globalShortcut.register(sc.toggleToolbar, () => {
        mainWindow?.webContents.send('shortcut-toggle-toolbar')
      })
    }
    if (sc.minimize) {
      globalShortcut.register(sc.minimize, () => {
        mainWindow?.minimize()
      })
    }
  } catch (e) {
    console.error('注册快捷键失败:', e)
  }
}

// 创建系统托盘
function createTray() {
  // 使用空白图标（生产环境可替换为真实icon）
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('ScreenRec - 屏幕录制')

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => { mainWindow?.show() } },
    { label: '开始/停止录制 (F9)', click: () => { mainWindow?.webContents.send('shortcut-toggle-record') } },
    { label: '截图 (F11)', click: () => { mainWindow?.webContents.send('shortcut-screenshot') } },
    { type: 'separator' },
    { label: '退出', click: () => { app.quit() } }
  ])
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

// 区域选择遮罩窗口
function openRecordAreaSelector() {
  return new Promise((resolve) => {
    if (areaSelectorWindow && !areaSelectorWindow.isDestroyed()) {
      areaSelectorWindow.close()
      areaSelectorWindow = null
    }

    const primaryDisplay = screen.getPrimaryDisplay()
    const { x, y, width, height } = primaryDisplay.bounds

    areaSelectorWindow = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })

    const cleanup = () => {
      ipcMain.removeListener('area-select-confirm', onConfirm)
      ipcMain.removeListener('area-select-cancel', onCancel)
      if (areaSelectorWindow && !areaSelectorWindow.isDestroyed()) {
        areaSelectorWindow.close()
      }
      areaSelectorWindow = null
    }

    const onConfirm = (event, area) => {
      if (!area || area.width < 10 || area.height < 10) {
        return
      }
      cleanup()
      resolve(area)
    }

    const onCancel = () => {
      cleanup()
      resolve(null)
    }

    ipcMain.once('area-select-confirm', onConfirm)
    ipcMain.once('area-select-cancel', onCancel)

    areaSelectorWindow.on('closed', () => {
      areaSelectorWindow = null
      ipcMain.removeListener('area-select-confirm', onConfirm)
      ipcMain.removeListener('area-select-cancel', onCancel)
      resolve(null)
    })

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>区域录制选择</title>
          <style>
            * { box-sizing: border-box; user-select: none; }
            html, body {
              margin: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              cursor: crosshair;
              font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
            }
            #overlay {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.35);
            }
            #selection {
              position: absolute;
              border: 2px solid #3B82F6;
              background: rgba(59, 130, 246, 0.14);
              display: none;
              cursor: move;
            }
            .handle {
              position: absolute;
              width: 10px;
              height: 10px;
              background: #3B82F6;
              border: 1px solid #fff;
              border-radius: 2px;
            }
            .nw { top: -6px; left: -6px; cursor: nwse-resize; }
            .ne { top: -6px; right: -6px; cursor: nesw-resize; }
            .sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
            .se { bottom: -6px; right: -6px; cursor: nwse-resize; }
            .n { top: -6px; left: calc(50% - 5px); cursor: ns-resize; }
            .s { bottom: -6px; left: calc(50% - 5px); cursor: ns-resize; }
            .w { left: -6px; top: calc(50% - 5px); cursor: ew-resize; }
            .e { right: -6px; top: calc(50% - 5px); cursor: ew-resize; }
            #toolbar {
              position: fixed;
              bottom: 24px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(17, 24, 39, 0.92);
              color: #fff;
              border-radius: 10px;
              padding: 10px 14px;
              display: flex;
              align-items: center;
              gap: 10px;
              font-size: 13px;
            }
            button {
              border: none;
              border-radius: 6px;
              padding: 6px 12px;
              cursor: pointer;
              font-size: 12px;
              font-weight: 600;
            }
            #confirm { background: #3B82F6; color: #fff; }
            #cancel { background: #374151; color: #E5E7EB; }
            #sizeInfo { min-width: 120px; text-align: center; }
          </style>
        </head>
        <body>
          <div id="overlay"></div>
          <div id="selection">
            <div class="handle nw" data-handle="nw"></div>
            <div class="handle ne" data-handle="ne"></div>
            <div class="handle sw" data-handle="sw"></div>
            <div class="handle se" data-handle="se"></div>
            <div class="handle n" data-handle="n"></div>
            <div class="handle s" data-handle="s"></div>
            <div class="handle w" data-handle="w"></div>
            <div class="handle e" data-handle="e"></div>
          </div>
          <div id="toolbar">
            <span>拖拽框选，支持拉伸与移动</span>
            <span id="sizeInfo">未选择</span>
            <button id="cancel">取消</button>
            <button id="confirm">确认区域</button>
          </div>
          <script>
            const { ipcRenderer } = require('electron')
            const selection = document.getElementById('selection')
            const sizeInfo = document.getElementById('sizeInfo')
            const overlay = document.getElementById('overlay')

            let rect = null
            let mode = null
            let activeHandle = null
            let startX = 0
            let startY = 0
            let originRect = null

            const MIN_SIZE = 30

            function normalizeRect(r) {
              const x = Math.min(r.x1, r.x2)
              const y = Math.min(r.y1, r.y2)
              const width = Math.max(MIN_SIZE, Math.abs(r.x2 - r.x1))
              const height = Math.max(MIN_SIZE, Math.abs(r.y2 - r.y1))
              return { x, y, width, height }
            }

            function applyRect(next) {
              rect = next
              selection.style.display = 'block'
              selection.style.left = rect.x + 'px'
              selection.style.top = rect.y + 'px'
              selection.style.width = rect.width + 'px'
              selection.style.height = rect.height + 'px'
              sizeInfo.textContent = Math.round(rect.width) + ' × ' + Math.round(rect.height)
            }

            function inBounds(v, min, max) {
              return Math.max(min, Math.min(v, max))
            }

            function startDraw(clientX, clientY) {
              mode = 'draw'
              startX = clientX
              startY = clientY
              applyRect({ x: clientX, y: clientY, width: 1, height: 1 })
            }

            function updateDraw(clientX, clientY) {
              const next = normalizeRect({ x1: startX, y1: startY, x2: clientX, y2: clientY })
              applyRect(next)
            }

            function startMove(clientX, clientY) {
              if (!rect) return
              mode = 'move'
              startX = clientX
              startY = clientY
              originRect = { ...rect }
            }

            function updateMove(clientX, clientY) {
              if (!originRect) return
              const dx = clientX - startX
              const dy = clientY - startY
              const next = {
                ...originRect,
                x: inBounds(originRect.x + dx, 0, window.innerWidth - originRect.width),
                y: inBounds(originRect.y + dy, 0, window.innerHeight - originRect.height)
              }
              applyRect(next)
            }

            function startResize(handle, clientX, clientY) {
              if (!rect) return
              mode = 'resize'
              activeHandle = handle
              startX = clientX
              startY = clientY
              originRect = { ...rect }
            }

            function updateResize(clientX, clientY) {
              if (!originRect || !activeHandle) return
              const dx = clientX - startX
              const dy = clientY - startY

              let left = originRect.x
              let top = originRect.y
              let right = originRect.x + originRect.width
              let bottom = originRect.y + originRect.height

              if (activeHandle.includes('n')) top = inBounds(top + dy, 0, bottom - MIN_SIZE)
              if (activeHandle.includes('s')) bottom = inBounds(bottom + dy, top + MIN_SIZE, window.innerHeight)
              if (activeHandle.includes('w')) left = inBounds(left + dx, 0, right - MIN_SIZE)
              if (activeHandle.includes('e')) right = inBounds(right + dx, left + MIN_SIZE, window.innerWidth)

              applyRect({ x: left, y: top, width: right - left, height: bottom - top })
            }

            document.addEventListener('mousedown', (e) => {
              const handle = e.target && e.target.dataset ? e.target.dataset.handle : null
              if (handle) {
                e.preventDefault()
                startResize(handle, e.clientX, e.clientY)
                return
              }

              if (selection.contains(e.target) && rect) {
                e.preventDefault()
                startMove(e.clientX, e.clientY)
                return
              }

              if (e.target === overlay) {
                e.preventDefault()
                startDraw(e.clientX, e.clientY)
              }
            })

            document.addEventListener('mousemove', (e) => {
              if (mode === 'draw') updateDraw(e.clientX, e.clientY)
              if (mode === 'move') updateMove(e.clientX, e.clientY)
              if (mode === 'resize') updateResize(e.clientX, e.clientY)
            })

            document.addEventListener('mouseup', () => {
              mode = null
              activeHandle = null
              originRect = null
            })

            document.getElementById('confirm').addEventListener('click', () => {
              if (!rect || rect.width < MIN_SIZE || rect.height < MIN_SIZE) return
              ipcRenderer.send('area-select-confirm', {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              })
            })

            document.getElementById('cancel').addEventListener('click', () => {
              ipcRenderer.send('area-select-cancel')
            })

            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') ipcRenderer.send('area-select-cancel')
              if (e.key === 'Enter') document.getElementById('confirm').click()
            })
          </script>
        </body>
      </html>
    `

    areaSelectorWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`)
    areaSelectorWindow.show()
    areaSelectorWindow.focus()
  })
}

function closeAreaIndicatorWindow() {
  if (areaIndicatorWindow && !areaIndicatorWindow.isDestroyed()) {
    areaIndicatorWindow.close()
  }
  areaIndicatorWindow = null
}

function getAreaFromIndicatorWindow(toolbarHeight = 34) {
  if (!areaIndicatorWindow || areaIndicatorWindow.isDestroyed()) return null
  const b = areaIndicatorWindow.getBounds()
  return {
    x: b.x,
    y: b.y,
    width: b.width,
    height: Math.max(10, b.height - toolbarHeight)
  }
}

function showAreaIndicator(area) {
  closeAreaIndicatorWindow()
  if (!area || area.width < 10 || area.height < 10) return

  const toolbarHeight = 34
  areaIndicatorWindow = new BrowserWindow({
    x: Math.round(area.x),
    y: Math.round(area.y),
    width: Math.round(area.width),
    height: Math.round(area.height + toolbarHeight),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    fullscreenable: false,
    focusable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  areaIndicatorWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          * { box-sizing: border-box; user-select: none; }
          html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
          #box {
            width: 100%;
            height: calc(100% - 34px);
            border: 2px solid #3B82F6;
            background: rgba(59, 130, 246, 0.12);
            -webkit-app-region: drag;
            cursor: move;
          }
          #toolbar {
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            padding: 0 8px;
            background: rgba(17, 24, 39, 0.92);
          }
          button {
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            height: 24px;
            padding: 0 10px;
            color: #E5E7EB;
            background: rgba(255,255,255,0.08);
            cursor: pointer;
            font-size: 12px;
          }
          #cancel {
            -webkit-app-region: no-drag;
          }
          button:hover { border-color: #60A5FA; color: #fff; }
        </style>
      </head>
      <body>
        <div id="box"></div>
        <div id="toolbar">
          <button id="cancel">取消选框</button>
        </div>
        <script>
          const { ipcRenderer } = require('electron')
          document.getElementById('cancel').addEventListener('click', () => {
            ipcRenderer.send('record-area-indicator-cancel')
          })
        </script>
      </body>
    </html>
  `

  areaIndicatorWindow.on('closed', () => {
    areaIndicatorWindow = null
  })
  areaIndicatorWindow.on('move', () => {
    if (!areaIndicatorWindow || areaIndicatorWindow.isDestroyed()) return
    const display = screen.getDisplayNearestPoint(areaIndicatorWindow.getBounds())
    const bounds = areaIndicatorWindow.getBounds()
    const work = display.workArea
    const clampedX = Math.max(work.x, Math.min(bounds.x, work.x + work.width - bounds.width))
    const clampedY = Math.max(work.y, Math.min(bounds.y, work.y + work.height - bounds.height))
    if (clampedX !== bounds.x || clampedY !== bounds.y) {
      areaIndicatorWindow.setBounds({ ...bounds, x: clampedX, y: clampedY })
    }
    const area = getAreaFromIndicatorWindow(toolbarHeight)
    if (area) {
      mainWindow?.webContents.send('record-area-updated', area)
    }
  })
  areaIndicatorWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`)
}

// ===================== IPC 处理 =====================

// 窗口控制
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => {
  mainWindow?.hide()  // 关闭时隐藏到托盘
})

// 配置读写
ipcMain.handle('get-config', () => appConfig)
ipcMain.handle('save-config', (e, config) => {
  appConfig = config
  saveConfig(config)
  registerShortcuts()
  ensureStorageDirs()
  return true
})

// 获取屏幕信息
ipcMain.handle('get-screen-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 320, height: 180 }
  })
  return sources.map(s => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL()
  }))
})

ipcMain.handle('select-record-area', async () => {
  const area = await openRecordAreaSelector()
  if (area) {
    showAreaIndicator(area)
    mainWindow?.webContents.send('record-area-updated', area)
  }
  return area
})

ipcMain.handle('hide-record-area-indicator', () => {
  closeAreaIndicatorWindow()
  return true
})

ipcMain.on('record-area-indicator-cancel', () => {
  closeAreaIndicatorWindow()
  mainWindow?.webContents.send('record-area-cleared')
})

// 获取录制历史
ipcMain.handle('get-recordings', () => {
  const histPath = path.join(app.getPath('userData'), 'recordings.json')
  try {
    if (fs.existsSync(histPath)) {
      return JSON.parse(fs.readFileSync(histPath, 'utf-8'))
    }
  } catch (e) { /* 忽略 */ }
  return []
})

// 保存录制记录
ipcMain.handle('save-recording', (e, record) => {
  const histPath = path.join(app.getPath('userData'), 'recordings.json')
  try {
    let list = []
    if (fs.existsSync(histPath)) {
      list = JSON.parse(fs.readFileSync(histPath, 'utf-8'))
    }
    list.unshift(record)
    fs.writeFileSync(histPath, JSON.stringify(list, null, 2), 'utf-8')
    return true
  } catch (e) { return false }
})

// 删除录制记录
ipcMain.handle('delete-recording', (e, filePath) => {
  const histPath = path.join(app.getPath('userData'), 'recordings.json')
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    if (fs.existsSync(histPath)) {
      let list = JSON.parse(fs.readFileSync(histPath, 'utf-8'))
      list = list.filter(r => r.filePath !== filePath)
      fs.writeFileSync(histPath, JSON.stringify(list, null, 2), 'utf-8')
    }
    return true
  } catch (e) { return false }
})

// 保存录制文件（Buffer写入磁盘）
ipcMain.handle('save-recording-file', async (e, { buffer, fileName }) => {
  try {
    ensureStorageDirs()
    const filePath = path.join(appConfig.storage.videoPath, fileName)
    fs.writeFileSync(filePath, Buffer.from(buffer))

    // 系统通知
    if (appConfig.notifications.onStop) {
      new Notification({
        title: 'ScreenRec',
        body: `录制已保存：${fileName}`
      }).show()
    }

    // 自动打开文件夹
    if (appConfig.storage.autoOpenFolder) {
      const { shell } = require('electron')
      shell.showItemInFolder(filePath)
    }

    return { success: true, filePath }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// 保存截图文件
ipcMain.handle('save-screenshot-file', async (e, { dataUrl, fileName }) => {
  try {
    ensureStorageDirs()
    const filePath = path.join(appConfig.storage.screenshotPath, fileName)
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))

    if (appConfig.storage.autoOpenFolder) {
      const { shell } = require('electron')
      shell.showItemInFolder(filePath)
    }

    return { success: true, filePath }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// 获取截图历史
ipcMain.handle('get-screenshots', () => {
  const p = path.join(app.getPath('userData'), 'screenshots.json')
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch (e) { /* 忽略 */ }
  return []
})

// 保存截图记录
ipcMain.handle('save-screenshot-record', (e, record) => {
  const p = path.join(app.getPath('userData'), 'screenshots.json')
  try {
    let list = []
    if (fs.existsSync(p)) list = JSON.parse(fs.readFileSync(p, 'utf-8'))
    list.unshift(record)
    if (list.length > 50) list = list.slice(0, 50)  // 最多保留50条
    fs.writeFileSync(p, JSON.stringify(list, null, 2), 'utf-8')
    return true
  } catch (e) { return false }
})

// 删除截图
ipcMain.handle('delete-screenshot', (e, filePath) => {
  const p = path.join(app.getPath('userData'), 'screenshots.json')
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    if (fs.existsSync(p)) {
      let list = JSON.parse(fs.readFileSync(p, 'utf-8'))
      list = list.filter(r => r.filePath !== filePath)
      fs.writeFileSync(p, JSON.stringify(list, null, 2), 'utf-8')
    }
    return true
  } catch (e) { return false }
})

// 打开文件夹选择对话框
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

// 用系统默认应用打开文件
ipcMain.handle('open-file', (e, filePath) => {
  const { shell } = require('electron')
  shell.openPath(filePath)
})

// 复制文件到剪贴板
ipcMain.handle('copy-image-to-clipboard', (e, filePath) => {
  try {
    const { clipboard } = require('electron')
    const img = nativeImage.createFromPath(filePath)
    clipboard.writeImage(img)
    return true
  } catch (e) { return false }
})

// 获取磁盘空间信息
ipcMain.handle('get-disk-space', () => {
  try {
    const stats = fs.statfsSync(appConfig.storage.videoPath)
    return {
      free: stats.bfree * stats.bsize,
      total: stats.blocks * stats.bsize
    }
  } catch (e) {
    return { free: -1, total: -1 }
  }
})

// 获取可用麦克风列表（通过渲染进程 MediaDevices API 获取，此处返回占位）
ipcMain.handle('get-audio-devices', async () => {
  return [{ deviceId: 'default', label: '内置麦克风' }]
})

// 录制状态通知
ipcMain.on('recording-started', () => {
  isRecording = true
  if (appConfig.notifications.onStart) {
    new Notification({ title: 'ScreenRec', body: '录制已开始' }).show()
  }
  tray?.setToolTip('ScreenRec - 录制中...')
})

ipcMain.on('recording-stopped', () => {
  isRecording = false
  tray?.setToolTip('ScreenRec - 屏幕录制')
})

// ===================== 应用生命周期 =====================

app.whenReady().then(() => {
  ensureStorageDirs()
  createWindow()
  createTray()
  registerShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 不直接退出，保留托盘
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('before-quit', () => {
  if (tray) {
    tray.destroy()
    tray = null
  }
})
