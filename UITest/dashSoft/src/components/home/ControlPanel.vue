<template>
  <div class="control-panel card-secondary">
    <div class="panel-header">
      <span class="panel-title">录制控制</span>
    </div>

    <div class="mode-row">
      <span class="mode-label">录制范围</span>
      <div class="mode-btns">
        <button
          v-for="m in modes"
          :key="m.value"
          class="mode-btn"
          :class="{ active: recordingStore.recordingMode === m.value }"
          @click="selectMode(m.value)"
        >
          <component :is="m.icon" />
          {{ m.label }}
        </button>
      </div>
    </div>
    <div v-if="recordingStore.recordingMode === 'area'" class="area-row">
      <span class="area-text">
        {{ selectedArea ? `已选区域 ${selectedArea.width}×${selectedArea.height}` : '尚未选择区域' }}
      </span>
      <div class="area-actions">
        <button class="area-btn" @click="pickRecordArea">重新框选</button>
        <button v-if="selectedArea" class="area-btn danger" @click="cancelSelectedArea">取消选框</button>
      </div>
    </div>

    <div class="main-btn-row">
      <button
        class="start-btn"
        :class="{ recording: recordingStore.isRecording, paused: recordingStore.isPaused }"
        @click="toggleRecord"
      >
        <svg v-if="recordingStore.isIdle" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
        <svg v-else-if="recordingStore.isRecording" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        {{ recordingStore.isIdle ? '开始录制' : recordingStore.isRecording ? '停止录制' : '继续录制' }}
      </button>

      <button
        class="ctrl-btn"
        :disabled="recordingStore.isIdle"
        @click="pauseRecord"
        title="暂停/继续录制"
      >
        <svg v-if="!recordingStore.isPaused" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
      </button>

      <button
        class="ctrl-btn"
        :disabled="recordingStore.isIdle"
        @click="stopRecord"
        title="停止录制"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
      </button>

      <button class="ctrl-btn" @click="takeScreenshot" title="截图 (F11)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </button>
    </div>

    <div class="shortcut-row">
      <span class="sc-item"><kbd>F9</kbd> 开始/停止</span>
      <span class="sc-item"><kbd>F10</kbd> 暂停</span>
      <span class="sc-item"><kbd>F11</kbd> 截图</span>
    </div>
  </div>

  <!-- 窗口选择对话框 -->
  <div v-if="showWindowPicker" class="modal-overlay" @click.self="showWindowPicker = false">
    <div class="modal-box card">
      <div class="modal-title">选择录制窗口</div>
      <div class="window-list">
        <div
          v-for="src in windowSources"
          :key="src.id"
          class="window-item"
          :class="{ selected: selectedSourceId === src.id }"
          @click="selectedSourceId = src.id"
        >
          <img :src="src.thumbnail" class="win-thumb" />
          <span class="win-name">{{ src.name }}</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showWindowPicker = false">取消</button>
        <button class="btn btn-primary" @click="confirmWindow">确认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { h } from 'vue'
import { useRecordingController } from '../../composables/useRecordingController'

const {
  recordingStore,
  showWindowPicker,
  windowSources,
  selectedSourceId,
  selectedArea,
  selectMode,
  pickRecordArea,
  cancelSelectedArea,
  confirmWindow,
  toggleRecord,
  pauseRecord,
  stopRecord,
  takeScreenshot
} = useRecordingController()

// SVG 图标组件
const IconFullscreen = { render: () => h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }), h('path', { d: 'M8 21h8M12 17v4' })]) }
const IconWindow = { render: () => h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }), h('path', { d: 'M2 7h20' })]) }
const IconArea = { render: () => h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-dasharray': '4 2' }, [h('rect', { x: 4, y: 4, width: 16, height: 16, rx: 2 })]) }

const modes = [
  { value: 'fullscreen', label: '全屏', icon: IconFullscreen },
  { value: 'window', label: '窗口', icon: IconWindow },
  { value: 'area', label: '区域', icon: IconArea }
]

</script>

<style scoped>
.control-panel {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header { display: flex; align-items: center; justify-content: space-between; }
.panel-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }

/* 模式选择 */
.mode-row { display: flex; align-items: center; gap: 12px; }
.mode-label { font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
.mode-btns { display: flex; gap: 8px; }
.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  height: 32px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.mode-btn:hover { border-color: var(--accent); color: var(--accent); }
.mode-btn.active { border-color: var(--accent); background: var(--accent-light); color: var(--accent); font-weight: 600; }
.area-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.area-actions {
  display: flex;
  gap: 8px;
}
.area-text {
  font-size: 12px;
  color: var(--text-secondary);
}
.area-btn {
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  border-radius: 8px;
  height: 28px;
  padding: 0 10px;
  cursor: pointer;
  font-size: 12px;
}
.area-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.area-btn.danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}

/* 主控制按钮行 */
.main-btn-row { display: flex; align-items: center; gap: 10px; }
.start-btn {
  flex: 1;
  height: 44px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}
.start-btn:hover { background: #2563EB; }
.start-btn.recording { background: var(--danger); }
.start-btn.recording:hover { background: #DC2626; }
.start-btn.paused { background: var(--warning); }

.ctrl-btn {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.ctrl-btn:hover:not(:disabled) { background: var(--bg-card-secondary); color: var(--text-primary); border-color: var(--accent); }
.ctrl-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 快捷键提示 */
.shortcut-row {
  display: flex;
  gap: 16px;
  align-items: center;
}
.sc-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
kbd {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  font-size: 11px;
  font-family: inherit;
  font-weight: 600;
  color: var(--text-primary);
}

/* 模态框 */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
}
.modal-box { padding: 24px; width: 560px; max-height: 480px; display: flex; flex-direction: column; gap: 16px; }
.modal-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.window-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  overflow-y: auto;
  flex: 1;
}
.window-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--border);
  cursor: pointer;
  transition: all 0.15s;
}
.window-item.selected { border-color: var(--accent); background: var(--accent-light); }
.window-item:hover { border-color: var(--accent); }
.win-thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 4px; background: #1a1a2e; }
.win-name { font-size: 11px; color: var(--text-primary); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; }
</style>
