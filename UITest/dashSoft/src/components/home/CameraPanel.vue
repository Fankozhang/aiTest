<template>
  <div class="camera-panel card-secondary">
    <div class="panel-header">
      <div class="panel-title-row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        <span>摄像头</span>
      </div>
      <div class="toggle" :class="{ active: cameraEnabled }" @click="toggleCamera"></div>
    </div>

    <!-- 摄像头预览 -->
    <div class="cam-preview">
      <video v-if="cameraEnabled" ref="videoRef" class="cam-video" autoplay muted playsinline></video>
      <div v-else class="cam-off">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/><line x1="1" y1="1" x2="23" y2="23" stroke="#EF4444"/></svg>
        <span>摄像头已关闭</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useConfigStore } from '../../stores/config'

const configStore = useConfigStore()
const videoRef = ref(null)
let cameraStream = null

const cameraEnabled = computed(() => configStore.config?.camera?.enabled)

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    if (videoRef.value) videoRef.value.srcObject = cameraStream
  } catch (e) {
    console.warn('摄像头启动失败:', e)
    if (configStore.config) configStore.config.camera.enabled = false
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop())
    cameraStream = null
  }
}

function toggleCamera() {
  if (configStore.config) {
    configStore.config.camera.enabled = !configStore.config.camera.enabled
    configStore.save()
  }
}

watch(cameraEnabled, async (val) => {
  if (val) {
    await startCamera()
  } else {
    stopCamera()
  }
})

onUnmounted(() => stopCamera())
</script>

<style scoped>
.camera-panel {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}
.panel-header { display: flex; align-items: center; justify-content: space-between; }
.panel-title-row { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-primary); }

.cam-preview {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  background: #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cam-video { width: 100%; height: 100%; object-fit: cover; }
.cam-off {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.cam-off span { font-size: 12px; color: var(--text-secondary); }
</style>
