<template>
  <div class="screenshot-layout">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <span class="page-title">截图工具</span>
      <button class="btn btn-primary" @click="takeScreenshot" :disabled="capturing">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
        {{ capturing ? '截图中...' : '立即截图' }}
      </button>
    </div>

    <!-- 内容区 -->
    <div class="content-area">
      <!-- 左侧 -->
      <div class="left-panel">
        <!-- 截图模式 -->
        <div class="card mode-card">
          <div class="section-label">截图模式</div>
          <div class="mode-list">
            <button
              v-for="m in modes"
              :key="m.value"
              class="mode-item"
              :class="{ active: captureMode === m.value }"
              @click="captureMode = m.value"
            >
              <div class="mode-icon">
                <component :is="m.iconComp" />
              </div>
              <div>
                <div class="mode-name">{{ m.label }}</div>
                <div class="mode-desc">{{ m.desc }}</div>
              </div>
            </button>
          </div>
        </div>

        <!-- 预览区 -->
        <div class="card preview-card">
          <div v-if="!previewDataUrl" class="preview-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
            <span class="preview-hint">截图预览区域</span>
            <span class="preview-sub">点击上方按钮开始截图</span>
          </div>
          <div v-else class="preview-img-wrap">
            <img :src="previewDataUrl" class="preview-img" alt="截图预览" />
            <div class="preview-actions">
              <button class="btn btn-secondary" style="font-size:12px;height:30px;" @click="copyToClipboard">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                复制
              </button>
              <button class="btn btn-secondary" style="font-size:12px;height:30px;" @click="downloadPreview">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                下载
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：最近截图列表 -->
      <div class="right-panel card">
        <div class="list-header">
          <span class="section-label">最近截图</span>
          <span class="count-badge">{{ historyStore.screenshots.length }} 张</span>
        </div>
        <div class="screenshot-list">
          <div v-if="historyStore.screenshots.length === 0" class="list-empty">
            <span>暂无截图记录</span>
          </div>
          <ScreenshotItem
            v-for="s in historyStore.screenshots.slice(0, 20)"
            :key="s.filePath || s.createdAt"
            :screenshot="s"
            @copy="copyScreenshot(s)"
            @open="openScreenshot(s)"
            @delete="deleteScreenshot(s)"
            @preview="previewScreenshot(s)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, h, defineComponent } from 'vue'
import { useHistoryStore } from '../stores/history'
import ScreenshotItem from '../components/screenshot/ScreenshotItem.vue'

const historyStore = useHistoryStore()
const captureMode = ref('fullscreen')
const capturing = ref(false)
const previewDataUrl = ref(null)
const currentFilePath = ref('')

// 模式图标组件
const FullscreenIcon = { render: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }), h('path', { d: 'M8 21h8M12 17v4' })]) }
const WindowIcon = { render: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }), h('path', { d: 'M2 7h20' })]) }
const AreaIcon = { render: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-dasharray': '4 2' }, [h('rect', { x: 4, y: 4, width: 16, height: 16, rx: 2 })]) }

const modes = [
  { value: 'fullscreen', label: '全屏截图', desc: '截取整个屏幕', iconComp: FullscreenIcon },
  { value: 'window', label: '窗口截图', desc: '截取指定窗口', iconComp: WindowIcon },
  { value: 'area', label: '区域截图', desc: '拖拽选择区域', iconComp: AreaIcon }
]

async function takeScreenshot() {
  capturing.value = true
  try {
    let stream
    if (window.electronAPI) {
      const sources = await window.electronAPI.getScreenSources()
      const src = sources.find(s => s.name === 'Entire Screen') || sources[0]
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: src.id
          }
        }
      })
    } else {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    }

    const track = stream.getVideoTracks()[0]
    const cap = new ImageCapture(track)
    const bitmap = await cap.grabFrame()
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d').drawImage(bitmap, 0, 0)
    previewDataUrl.value = canvas.toDataURL('image/png')
    stream.getTracks().forEach(t => t.stop())

    // 保存
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
    const fileName = `截图_${dateStr}_${timeStr}.png`

    const rec = {
      fileName,
      filePath: '',
      dataUrl: previewDataUrl.value,
      createdAt: now.toISOString(),
      width: bitmap.width,
      height: bitmap.height
    }

    if (window.electronAPI) {
      const result = await window.electronAPI.saveScreenshotFile({ dataUrl: previewDataUrl.value, fileName })
      if (result.success) {
        rec.filePath = result.filePath
        currentFilePath.value = result.filePath
      }
    } else {
      rec.filePath = fileName
      currentFilePath.value = fileName
    }

    await historyStore.addScreenshot(rec)
  } catch (e) {
    console.error('截图失败:', e)
  } finally {
    capturing.value = false
  }
}

function copyToClipboard() {
  if (previewDataUrl.value && window.electronAPI && currentFilePath.value) {
    window.electronAPI.copyImageToClipboard(currentFilePath.value)
  }
}

function downloadPreview() {
  if (!previewDataUrl.value) return
  const a = document.createElement('a')
  a.href = previewDataUrl.value
  a.download = `截图_${Date.now()}.png`
  a.click()
}

function previewScreenshot(s) {
  previewDataUrl.value = s.dataUrl || null
  currentFilePath.value = s.filePath || ''
}

async function copyScreenshot(s) {
  if (window.electronAPI && s.filePath) {
    await window.electronAPI.copyImageToClipboard(s.filePath)
  }
}

async function openScreenshot(s) {
  if (window.electronAPI && s.filePath) {
    await window.electronAPI.openFile(s.filePath)
  }
}

async function deleteScreenshot(s) {
  await historyStore.removeScreenshot(s.filePath)
  if (currentFilePath.value === s.filePath) {
    previewDataUrl.value = null
    currentFilePath.value = ''
  }
}

// 快捷键
function onShortcut() { takeScreenshot() }
onMounted(() => document.addEventListener('shortcut-screenshot', onShortcut))
onUnmounted(() => document.removeEventListener('shortcut-screenshot', onShortcut))
</script>

<style scoped>
.screenshot-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-page);
}

.top-bar {
  height: 60px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); }

.content-area {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 24px;
  overflow: hidden;
}

.left-panel { flex: 1; display: flex; flex-direction: column; gap: 16px; overflow: hidden; }

/* 模式卡片 */
.mode-card { padding: 20px; }
.section-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 14px; display: block; }
.mode-list { display: flex; flex-direction: column; gap: 8px; }
.mode-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 2px solid var(--border);
  background: var(--bg-card-secondary);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}
.mode-item:hover { border-color: var(--accent); background: var(--accent-light); }
.mode-item.active { border-color: var(--accent); background: var(--accent-light); }
.mode-icon {
  width: 40px; height: 40px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.mode-item.active .mode-icon { border-color: var(--accent); color: var(--accent); background: #fff; }
.mode-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.mode-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

/* 预览卡片 */
.preview-card { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.preview-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
}
.preview-hint { font-size: 14px; font-weight: 500; color: var(--text-secondary); }
.preview-sub { font-size: 12px; color: var(--text-muted); }
.preview-img-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 12px; padding: 16px; }
.preview-img { flex: 1; object-fit: contain; border-radius: 8px; max-height: calc(100% - 52px); }
.preview-actions { display: flex; gap: 8px; justify-content: center; flex-shrink: 0; }

/* 右侧列表 */
.right-panel { width: 280px; flex-shrink: 0; padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow: hidden; }
.list-header { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.count-badge {
  font-size: 12px;
  color: var(--accent);
  background: var(--accent-light);
  padding: 2px 8px;
  border-radius: 20px;
}
.screenshot-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.list-empty { display: flex; align-items: center; justify-content: center; height: 80px; color: var(--text-secondary); font-size: 13px; }
</style>
