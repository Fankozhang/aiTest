<template>
  <div class="home-layout">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <div class="top-bar-left">
        <span class="page-title">录制中心</span>
        <span class="badge" :class="statusBadgeClass">{{ statusLabel }}</span>
      </div>
      <div class="top-bar-right">
        <button class="btn btn-icon btn-secondary" @click="showNotifications = !showNotifications" title="通知">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
        </button>
        <button class="btn btn-icon btn-secondary" title="帮助">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="content-area">
      <!-- 预览区域 -->
      <PreviewArea />

      <!-- 底部控制行 -->
      <div class="bottom-row">
        <!-- 控制面板 -->
        <ControlPanel />

        <!-- 右侧面板 -->
        <div class="right-panels">
          <AudioPanel />
          <CameraPanel />
        </div>
      </div>
    </div>

    <!-- 通知面板 -->
    <Transition name="slide">
      <div v-if="showNotifications" class="notify-panel card">
        <div class="notify-header">
          <span>通知中心</span>
          <button class="btn-ghost" @click="showNotifications = false">✕</button>
        </div>
        <div v-if="notifications.length === 0" class="notify-empty">暂无通知</div>
        <div v-for="n in notifications" :key="n.id" class="notify-item">
          <span class="notify-dot" :class="n.type"></span>
          <div>
            <div class="notify-msg">{{ n.message }}</div>
            <div class="notify-time">{{ n.time }}</div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRecordingStore } from '../stores/recording'
import PreviewArea from '../components/home/PreviewArea.vue'
import ControlPanel from '../components/home/ControlPanel.vue'
import AudioPanel from '../components/home/AudioPanel.vue'
import CameraPanel from '../components/home/CameraPanel.vue'

const recordingStore = useRecordingStore()
const showNotifications = ref(false)
const notifications = ref([
  { id: 1, type: 'success', message: '录制已就绪，点击开始录制', time: '刚刚' }
])

const statusLabel = computed(() => {
  if (recordingStore.isRecording) return '录制中'
  if (recordingStore.isPaused) return '已暂停'
  return '就绪'
})

const statusBadgeClass = computed(() => {
  if (recordingStore.isRecording) return 'badge-recording'
  if (recordingStore.isPaused) return 'badge-paused'
  return 'badge-ready'
})

// 监听全局快捷键
onMounted(() => {
  window.electronAPI?.onShortcut('shortcut-toggle-record', () => {
    // 由 ControlPanel 处理
    document.dispatchEvent(new CustomEvent('shortcut-toggle-record'))
  })
  window.electronAPI?.onShortcut('shortcut-pause-record', () => {
    document.dispatchEvent(new CustomEvent('shortcut-pause-record'))
  })
  window.electronAPI?.onShortcut('shortcut-screenshot', () => {
    document.dispatchEvent(new CustomEvent('shortcut-screenshot'))
  })
})

onUnmounted(() => {
  window.electronAPI?.offShortcut('shortcut-toggle-record')
  window.electronAPI?.offShortcut('shortcut-pause-record')
  window.electronAPI?.offShortcut('shortcut-screenshot')
})
</script>

<style scoped>
.home-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-page);
  position: relative;
}

/* 顶部栏 */
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
.top-bar-left { display: flex; align-items: center; gap: 8px; }
.top-bar-right { display: flex; align-items: center; gap: 8px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); }

/* 内容区 */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 20px 20px;
  overflow: hidden;
}

/* 底部控制行 */
.bottom-row {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
}
.right-panels {
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

/* 通知面板 */
.notify-panel {
  position: absolute;
  top: 68px;
  right: 16px;
  width: 300px;
  padding: 16px;
  z-index: 200;
  box-shadow: var(--shadow-md);
}
.notify-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 12px;
}
.notify-empty { color: var(--text-secondary); font-size: 13px; text-align: center; padding: 16px 0; }
.notify-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.notify-item:last-child { border-bottom: none; }
.notify-dot {
  width: 8px; height: 8px; border-radius: 50%; margin-top: 4px; flex-shrink: 0;
}
.notify-dot.success { background: var(--success); }
.notify-dot.error { background: var(--danger); }
.notify-dot.warning { background: var(--warning); }
.notify-msg { font-size: 13px; color: var(--text-primary); }
.notify-time { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }

/* 动画 */
.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
