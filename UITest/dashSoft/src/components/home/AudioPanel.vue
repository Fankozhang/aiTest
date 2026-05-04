<template>
  <div class="audio-panel card-secondary">
    <div class="panel-header">
      <div class="panel-title-row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
        <span>音频</span>
      </div>
      <div class="toggle" :class="{ active: audioEnabled }" @click="toggleAudio"></div>
    </div>

    <template v-if="audioEnabled && config">
      <!-- 麦克风选择 -->
      <div class="audio-row">
        <span class="audio-label">麦克风</span>
        <select class="select" v-model="config.audio.micDevice" @change="save" style="flex:1;font-size:12px;height:30px;">
          <option value="default">内置麦克风</option>
          <option v-for="d in audioDevices" :key="d.deviceId" :value="d.deviceId">{{ d.label }}</option>
        </select>
      </div>

      <!-- 系统声音 -->
      <div class="audio-row">
        <span class="audio-label">系统音频</span>
        <div class="toggle" :class="{ active: config.audio.systemAudio }" @click="config.audio.systemAudio = !config.audio.systemAudio; save()"></div>
      </div>

      <!-- 音量 -->
      <div class="audio-row">
        <span class="audio-label">音量</span>
        <input
          type="range" min="0" max="100" class="slider"
          v-model.number="config.audio.micVolume"
          @change="save"
          style="flex:1;"
        />
        <span class="slider-value">{{ config.audio.micVolume }}%</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useConfigStore } from '../../stores/config'

const configStore = useConfigStore()
const config = computed(() => configStore.config)
const audioEnabled = computed(() => configStore.config?.audio?.enabled)
const audioDevices = ref([])

function toggleAudio() {
  if (config.value) {
    config.value.audio.enabled = !config.value.audio.enabled
    save()
  }
}

async function save() {
  await configStore.save()
}

onMounted(async () => {
  if (window.electronAPI) {
    audioDevices.value = await window.electronAPI.getAudioDevices()
  }
})
</script>

<style scoped>
.audio-panel {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}
.panel-header { display: flex; align-items: center; justify-content: space-between; }
.panel-title-row { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.audio-row { display: flex; align-items: center; gap: 10px; }
.audio-label { font-size: 12px; color: var(--text-secondary); min-width: 50px; }
.slider-value { font-size: 12px; color: var(--text-secondary); min-width: 30px; text-align: right; }
</style>
