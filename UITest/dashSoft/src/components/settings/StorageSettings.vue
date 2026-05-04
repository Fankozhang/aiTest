<template>
  <div class="settings-section">
    <div class="card-secondary setting-card">
      <div class="card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        存储路径设置
      </div>
      <p class="hint-text">配置录制视频和截图文件的默认保存位置及命名规则。</p>

      <!-- 视频保存路径 -->
      <div class="path-row">
        <span class="setting-label">视频保存路径</span>
        <div class="path-input-wrap">
          <input class="input path-input" :value="config.storage.videoPath" readonly />
          <button class="btn btn-secondary" style="height:36px;white-space:nowrap;" @click="selectVideoPath">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            浏览
          </button>
        </div>
      </div>

      <!-- 截图保存路径 -->
      <div class="path-row">
        <span class="setting-label">截图保存路径</span>
        <div class="path-input-wrap">
          <input class="input path-input" :value="config.storage.screenshotPath" readonly />
          <button class="btn btn-secondary" style="height:36px;white-space:nowrap;" @click="selectScreenshotPath">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            浏览
          </button>
        </div>
      </div>

      <!-- 视频格式 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">视频格式</span>
        </div>
        <div class="btn-group">
          <button class="btn-seg" :class="{ active: config.storage.videoFormat === 'mp4' || !config.storage.videoFormat }" @click="setFormat('mp4')">MP4</button>
          <button class="btn-seg" :class="{ active: config.storage.videoFormat === 'mov' }" @click="setFormat('mov')">MOV</button>
          <button class="btn-seg" :class="{ active: config.storage.videoFormat === 'avi' }" @click="setFormat('avi')">AVI</button>
          <button class="btn-seg" :class="{ active: config.storage.videoFormat === 'mkv' }" @click="setFormat('mkv')">MKV</button>
        </div>
      </div>

      <!-- 自动命名规则 -->
      <div class="path-row">
        <div class="setting-label-group">
          <span class="setting-label">自动命名规则</span>
          <span class="setting-desc">支持变量：{日期} {时间} {序号}</span>
        </div>
        <div style="flex:1;max-width:360px;">
          <input class="input" v-model="config.storage.namingRule" />
          <div class="preview-name">预览：{{ previewName }}</div>
        </div>
      </div>

      <!-- 完成后自动打开文件夹 -->
      <div class="setting-row">
        <div class="setting-label-group">
          <span class="setting-label">录制完成后自动打开文件夹</span>
          <span class="setting-desc">录制或截图保存完成后，自动用文件管理器打开保存目录</span>
        </div>
        <div class="toggle" :class="{ active: config.storage.autoOpenFolder }" @click="config.storage.autoOpenFolder = !config.storage.autoOpenFolder"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ config: { type: Object, required: true } })

const previewName = computed(() => {
  const rule = props.config.storage.namingRule || '{日期}_{时间}_{序号}'
  const now = new Date()
  return rule
    .replace('{日期}', now.toISOString().slice(0, 10))
    .replace('{时间}', now.toTimeString().slice(0, 8).replace(/:/g, '-'))
    .replace('{序号}', '001')
})

function setFormat(fmt) {
  if (!props.config.storage) props.config.storage = {}
  props.config.storage.videoFormat = fmt
}

async function selectVideoPath() {
  if (window.electronAPI) {
    const p = await window.electronAPI.selectFolder()
    if (p) props.config.storage.videoPath = p
  }
}

async function selectScreenshotPath() {
  if (window.electronAPI) {
    const p = await window.electronAPI.selectFolder()
    if (p) props.config.storage.screenshotPath = p
  }
}
</script>

<style scoped>
.settings-section { display: flex; flex-direction: column; gap: 20px; }
.setting-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border); }
.card-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: var(--text-primary); padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.hint-text { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.setting-label-group { display: flex; flex-direction: column; gap: 3px; }
.setting-label { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.setting-desc { font-size: 12px; color: var(--text-secondary); }

.path-row { display: flex; flex-direction: column; gap: 8px; }
.path-input-wrap { display: flex; gap: 8px; }
.path-input { flex: 1; font-size: 13px; color: var(--text-secondary); }
.preview-name { font-size: 12px; color: var(--text-secondary); margin-top: 6px; padding: 6px 10px; background: var(--bg-card-secondary); border-radius: 6px; }
</style>
