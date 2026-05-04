<template>
  <div class="settings-section">
    <div class="card-secondary setting-card">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
        音频输入设置
      </div>

      <!-- 麦克风设备 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">麦克风设备</span>
          <span class="setting-desc">选择录制使用的麦克风</span>
        </div>
        <select class="select" v-model="config.audio.micDevice" style="width:200px;">
          <option value="default">内置麦克风</option>
          <option v-for="d in devices" :key="d.deviceId" :value="d.deviceId">{{ d.label }}</option>
        </select>
      </div>

      <!-- 麦克风音量 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">麦克风音量</span>
          <span class="setting-desc">调节麦克风录制增益</span>
        </div>
        <div class="slider-wrap" style="width:260px;">
          <div class="slider-track">
            <div class="slider-fill" :style="{ width: config.audio.micVolume + '%' }"></div>
          </div>
          <input type="range" min="0" max="100" class="slider" v-model.number="config.audio.micVolume" />
          <span class="slider-value">{{ config.audio.micVolume }}%</span>
        </div>
      </div>

      <!-- 系统声音录制 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">系统声音录制</span>
          <span class="setting-desc">同时捕获系统音频输出</span>
        </div>
        <div class="toggle" :class="{ active: config.audio.systemAudio }" @click="config.audio.systemAudio = !config.audio.systemAudio"></div>
      </div>

      <!-- 降噪处理 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">降噪处理</span>
          <span class="setting-desc">自动过滤背景噪音，提升音质</span>
        </div>
        <div class="toggle" :class="{ active: config.audio.noiseReduction }" @click="config.audio.noiseReduction = !config.audio.noiseReduction"></div>
      </div>

      <!-- 音频格式 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">音频格式</span>
          <span class="setting-desc">录制的音频编码格式</span>
        </div>
        <div class="btn-group">
          <button class="btn-seg" :class="{ active: config.audio.format === 'aac' }" @click="config.audio.format = 'aac'">AAC</button>
          <button class="btn-seg" :class="{ active: config.audio.format === 'mp3' }" @click="config.audio.format = 'mp3'">MP3</button>
          <button class="btn-seg" :class="{ active: config.audio.format === 'wav' }" @click="config.audio.format = 'wav'">WAV</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
defineProps({ config: { type: Object, required: true } })

const devices = ref([])
onMounted(async () => {
  if (window.electronAPI) {
    devices.value = await window.electronAPI.getAudioDevices()
  }
})
</script>

<style scoped>
.settings-section { display: flex; flex-direction: column; gap: 20px; }
.setting-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border); }
.card-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: var(--text-primary); padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.setting-label-group { display: flex; flex-direction: column; gap: 3px; }
.setting-label { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.setting-desc { font-size: 12px; color: var(--text-secondary); }
.slider-wrap { display: flex; align-items: center; gap: 10px; position: relative; }
.slider-track { flex: 1; height: 4px; border-radius: 2px; background: var(--border); position: relative; overflow: hidden; }
.slider-fill { height: 100%; background: var(--accent); border-radius: 2px; }
.slider { position: absolute; left: 0; right: 40px; height: 4px; opacity: 0; cursor: pointer; flex: 1; }
.slider-value { min-width: 36px; text-align: right; font-size: 13px; color: var(--text-secondary); }
</style>
