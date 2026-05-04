<template>
  <div class="preview-area" :class="{ 'with-live-preview': hasLivePreview }">
    <video
      v-if="hasLivePreview"
      ref="livePreviewRef"
      class="live-preview"
      autoplay
      muted
      playsinline
    ></video>
    <!-- 背景渐变 -->
    <div class="preview-bg"></div>
    <!-- 网格纹理 -->
    <div class="preview-grid"></div>

    <!-- 左上角状态 -->
    <div v-if="recordingStore.isRecording || recordingStore.isPaused" class="preview-label">
      <span class="rec-dot"></span>
      <span>{{ recordingStore.isPaused ? '已暂停' : 'REC' }}</span>
    </div>

    <!-- 中央控制区 -->
    <div class="center-control">
      <!-- 大录制按钮 -->
      <button class="big-rec-btn" :class="{ recording: recordingStore.isRecording }" @click="toggleRecord" :title="recordingStore.isRecording ? '停止录制' : '开始录制'">
        <div class="big-rec-icon">
          <svg v-if="!recordingStore.isRecording" width="28" height="28" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/></svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
        </div>
      </button>

      <!-- 计时器 -->
      <div class="timer">{{ recordingStore.timeDisplay }}</div>

      <!-- 提示文字 -->
      <div v-if="recordingStore.isIdle" class="hint-text">点击开始录制</div>

      <!-- 参数信息 -->
      <div v-if="configStore.config" class="params-row">
        <span class="param-tag">{{ configStore.config.video.resolution }}</span>
        <span class="param-tag">{{ configStore.config.video.fps }} FPS</span>
        <span class="param-tag">{{ qualityLabel }}</span>
      </div>
    </div>

    <!-- 右下角工具栏 -->
    <div class="preview-toolbar">
      <button class="tb-btn" title="全屏预览" @click="fullscreenPreview">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M21 16v3a2 2 0 01-2 2h-3M8 21H5a2 2 0 01-2-2v-3"/></svg>
        <span>全屏预览</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue'
import { useRecordingStore } from '../../stores/recording'
import { useConfigStore } from '../../stores/config'

const recordingStore = useRecordingStore()
const configStore = useConfigStore()
const hasLivePreview = ref(false)
const livePreviewRef = ref(null)
let previewStream = null

const qualityLabel = computed(() => {
  const map = { sd: '标准', hd: '高清', ultra: '超清' }
  return map[configStore.config?.video?.quality] || '高清'
})

function toggleRecord() {
  // 仅作为“请求”，由 ControlPanel 统一处理录制状态切换
  document.dispatchEvent(new CustomEvent('record-toggle-request'))
}

function fullscreenPreview() {
  // 全屏预览功能
}

function onRecordingPreviewStart(event) {
  const stream = event?.detail?.stream
  const tracks = stream?.getVideoTracks?.() || []
  if (tracks.length === 0) return

  stopLivePreview()
  previewStream = new MediaStream([tracks[0].clone()])
  hasLivePreview.value = true
  nextTick(() => {
    if (livePreviewRef.value) {
      livePreviewRef.value.srcObject = previewStream
    }
  })
}

function stopLivePreview() {
  hasLivePreview.value = false
  if (livePreviewRef.value) {
    livePreviewRef.value.srcObject = null
  }
  if (previewStream) {
    previewStream.getTracks().forEach(t => t.stop())
    previewStream = null
  }
}

onMounted(() => {
  document.addEventListener('recording-preview-start', onRecordingPreviewStart)
  document.addEventListener('recording-preview-stop', stopLivePreview)
})
onUnmounted(() => {
  document.removeEventListener('recording-preview-start', onRecordingPreviewStart)
  document.removeEventListener('recording-preview-stop', stopLivePreview)
  stopLivePreview()
})
</script>

<style scoped>
.preview-area {
  flex: 1;
  border-radius: var(--radius-lg);
  border: 1px solid #D1D9E6;
  overflow: hidden;
  position: relative;
  min-height: 280px;
  background: #1E3A5F;
}

.live-preview {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

.preview-bg {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%);
  z-index: 2;
}

.preview-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  z-index: 3;
}

.preview-area.with-live-preview .preview-bg {
  opacity: 0.18;
}
.preview-area.with-live-preview .preview-grid {
  opacity: 0.2;
}

/* 录制标签 */
.preview-label {
  position: absolute;
  top: 16px; left: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0,0,0,0.4);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  z-index: 10;
}
.rec-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--danger);
  animation: blink 1s ease infinite;
}

/* 中央控制区 */
.center-control {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
}

/* 大录制按钮 */
.big-rec-btn {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--danger);
  border: 4px solid rgba(255,255,255,0.3);
  box-shadow: 0 0 0 8px rgba(239,68,68,0.2), 0 8px 24px rgba(0,0,0,0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.big-rec-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 0 12px rgba(239,68,68,0.15), 0 8px 32px rgba(0,0,0,0.4);
}
.big-rec-btn.recording {
  background: #DC2626;
  animation: pulse 2s ease infinite;
}
.big-rec-icon { display: flex; align-items: center; justify-content: center; }

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 8px rgba(239,68,68,0.2), 0 8px 24px rgba(0,0,0,0.3); }
  50% { box-shadow: 0 0 0 16px rgba(239,68,68,0.1), 0 8px 24px rgba(0,0,0,0.3); }
}

/* 计时器 */
.timer {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 32px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.08em;
  text-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

.hint-text {
  font-size: 14px;
  color: rgba(255,255,255,0.6);
}

.params-row {
  display: flex;
  gap: 8px;
}
.param-tag {
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.1);
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.15);
}

/* 工具栏 */
.preview-toolbar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 48px;
  background: rgba(0,0,0,0.27);
  display: flex;
  align-items: center;
  padding: 0 16px;
  justify-content: flex-end;
  z-index: 10;
}
.tb-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.8);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  transition: background 0.15s;
}
.tb-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
</style>
