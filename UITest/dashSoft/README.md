# ScreenRec — 屏幕录制与截图工具

> 基于 Electron + Vue 3 开发的桌面端屏幕录制与截图程序，界面风格简洁专业，功能完整。

---

## 功能特性

| 模块 | 功能 |
|------|------|
| **屏幕录制** | 全屏 / 窗口 / 区域三种录制模式，支持暂停继续 |
| **音频录制** | 麦克风输入 + 系统音频同步录制，可调增益 |
| **摄像头叠加** | 画中画摄像头实时预览 |
| **截图工具** | 全屏 / 窗口 / 区域截图，支持复制到剪贴板 |
| **录制历史** | 按日期分类，支持搜索、重命名、播放、删除 |
| **系统设置** | 录制质量、音频、快捷键、存储路径、通知全面配置 |
| **全局快捷键** | F9/F10/F11 快速控制录制，可自定义 |
| **系统托盘** | 最小化到托盘，右键菜单快速操作 |

---

## 项目结构

```
dashSoft/
├── electron/
│   ├── main.js          # 主进程：窗口管理、IPC、快捷键、托盘
│   └── preload.js       # 预加载：安全暴露 electronAPI
├── src/
│   ├── assets/
│   │   └── global.css   # 全局样式变量与公共类
│   ├── components/
│   │   ├── home/        # 主界面组件
│   │   │   ├── PreviewArea.vue   # 预览区域（录制按钮+计时器）
│   │   │   ├── ControlPanel.vue  # 录制控制面板（模式+按钮+快捷键）
│   │   │   ├── AudioPanel.vue    # 音频设置面板
│   │   │   └── CameraPanel.vue   # 摄像头面板
│   │   ├── history/     # 录制历史组件
│   │   │   ├── RecordCard.vue    # 录制记录卡片
│   │   │   └── RecordDetail.vue  # 录制详情面板
│   │   ├── screenshot/  # 截图工具组件
│   │   │   └── ScreenshotItem.vue
│   │   └── settings/    # 设置页面组件
│   │       ├── RecordSettings.vue  # 录制质量、快捷键预览、光标设置
│   │       ├── AudioSettings.vue   # 音频输入设置
│   │       ├── ShortcutSettings.vue # 快捷键自定义
│   │       ├── StorageSettings.vue  # 存储路径与命名规则
│   │       └── NotifySettings.vue   # 通知设置
│   ├── stores/
│   │   ├── config.js    # 全局配置 Pinia Store
│   │   ├── recording.js # 录制状态 Pinia Store
│   │   └── history.js   # 录制历史 Pinia Store
│   ├── router/
│   │   └── index.js     # Vue Router 路由配置
│   ├── views/
│   │   ├── HomeView.vue        # 主界面（录制中心）
│   │   ├── HistoryView.vue     # 录制历史
│   │   ├── ScreenshotView.vue  # 截图工具
│   │   └── SettingsView.vue    # 系统设置
│   ├── App.vue          # 根组件（侧边栏导航 + 路由出口）
│   └── main.js          # Vue 应用入口
├── index.html           # HTML 模板
├── vite.config.js       # Vite 构建配置
└── package.json         # 项目依赖
```

---

## 环境要求

| 工具 | 版本要求 |
|------|----------|
| Node.js | ≥ 18.0 |
| npm | ≥ 9.0 |

---

## 快速开始

### 1. 安装依赖

```bash
cd E:\aiTest\UITest\dashSoft
npm install
```

### 2. 开发模式运行

开发模式会同时启动 Vite 开发服务器和 Electron 窗口，支持热更新：

```bash
npm run dev
```

> **说明**：首次运行会先启动 Vite（监听 http://localhost:5173），等待服务就绪后自动打开 Electron 窗口。

### 3. 仅启动 Electron（已有构建产物时）

```bash
# 先构建前端
npx vite build

# 再启动 Electron
npm run electron
```

### 4. 打包为可执行文件

```bash
npm run build
```

打包产物输出到 `dist-electron/` 目录：
- Windows：生成 `.exe` 安装包
- macOS：生成 `.dmg`

---

## 使用说明

### 主界面 — 录制中心

1. **选择录制范围**：全屏 / 窗口 / 区域（点击对应按钮）
2. **配置音频**：右侧面板开关麦克风、调节音量
3. **开始录制**：点击预览区大圆按钮，或按 `F9`
4. **暂停录制**：点击暂停按钮，或按 `F10`
5. **停止录制**：再次点击大圆按钮 / 停止按钮，或按 `F9`
6. **截图**：点击截图按钮，或按 `F11`

录制结束后文件自动保存到配置的视频路径，并弹出系统通知。

### 录制历史

- 支持按 **全部 / 今天 / 本周 / 本月** 筛选
- 搜索框按文件名模糊查找
- 点击记录查看详情，可重命名、播放、删除

### 截图工具

1. 选择截图模式（全屏 / 窗口 / 区域）
2. 点击「立即截图」
3. 截图显示在左侧预览区
4. 右侧列表可复制、打开、删除历史截图

### 系统设置

| 分类 | 可配置项 |
|------|---------|
| 录制设置 | 画质（标准/高清/超清）、帧率（24/30/60）、分辨率、光标显示 |
| 音频设置 | 麦克风设备、音量、系统音频、降噪、格式（AAC/MP3/WAV） |
| 快捷键 | 6 个操作的快捷键自定义，支持冲突检测 |
| 存储路径 | 视频/截图路径、视频格式（MP4/MOV/AVI/MKV）、命名规则 |
| 通知设置 | 开始/结束通知、存储警告、声音提示、通知时长 |

---

## 默认快捷键

| 快捷键 | 操作 |
|--------|------|
| `F9` | 开始 / 停止录制 |
| `F10` | 暂停 / 继续录制 |
| `F11` | 截图 |
| `Ctrl + T` | 显示 / 隐藏工具栏 |
| `Ctrl + M` | 最小化到系统托盘 |
| `Ctrl + R` | 区域选择录制 |

---

## 配置文件

配置自动保存在系统用户数据目录：

- **Windows**：`%APPDATA%\screenrec\config.json`
- **macOS**：`~/Library/Application Support/screenrec/config.json`

录制历史和截图记录分别保存在同目录的 `recordings.json` 和 `screenshots.json`。

---

## 常见问题

**Q：录制时提示权限错误？**  
A：Windows 下请确保应用有屏幕录制权限。部分安全软件可能拦截，需要在安全软件中放行。

**Q：macOS 无法录制？**  
A：macOS 需要在「系统偏好设置 → 安全性与隐私 → 屏幕录制」中授权 Electron。

**Q：开发模式下 Electron 窗口不打开？**  
A：确认 Vite 已在 5173 端口启动，或手动运行 `npm run electron`（需先 build）。

**Q：全局快捷键不生效？**  
A：部分快捷键可能被其他应用占用，进入设置 → 快捷键页面重新配置。

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | ^28 | 桌面应用框架 |
| Vue 3 | ^3.4 | UI 框架（Composition API） |
| Vue Router | ^4.3 | 前端路由 |
| Pinia | ^2.1 | 全局状态管理 |
| Vite | ^5.0 | 构建工具 |
| MediaRecorder API | — | 屏幕录制 |
| desktopCapturer | — | Electron 屏幕捕获 |

---

## 开发说明

### 添加新设置项

1. 在 `electron/main.js` 的 `defaultConfig` 中添加字段
2. 在对应的 `src/components/settings/` 组件中添加 UI
3. 配置自动通过 `configStore.save()` 持久化

### 新增页面

1. 在 `src/views/` 创建 `XxxView.vue`
2. 在 `src/router/index.js` 注册路由
3. 在 `src/App.vue` 的导航中添加链接

---

*ScreenRec v2.1.0 — 设计参考 dash.pen，使用 Electron + Vue 3 实现*
